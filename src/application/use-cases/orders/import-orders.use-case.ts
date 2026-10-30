/**
 * @file import-orders.use-case.ts
 * @description Use Case Nhập đơn hàng loạt từ file Excel/JSON (UC14).
 * @module application/use-cases/orders
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { SecurityContext } from '../../interfaces/security-context.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import { Order } from '../../../domain/entities/order.entity';
import { TrackingCode } from '../../../domain/value-objects/tracking-code.vo';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { Address } from '../../../domain/value-objects/address.vo';
import { Money } from '../../../domain/value-objects/money.vo';
import { PackageDimensions } from '../../../domain/value-objects/package-dimensions.vo';
import { type ImportOrdersInputDTO } from '../../dtos/order.dto';
import { ORDER_STATUS } from '../../../domain/constants/order-status.constant';
import { PAYMENT_STATUS } from '../../../domain/constants/payment.constant';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export interface ImportOrdersResultDTO {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  trackingCodes: string[];
  errors: { row: number; error: string }[];
}

export class ImportOrdersUseCase
  implements IUseCase<ImportOrdersInputDTO, Result<ImportOrdersResultDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly hubRepository: IHubRepository
  ) {}

  /**
   * Thực thi nhập đơn hàng loạt.
   * Áp dụng nguyên tắc Fail-Closed và Hub Isolation (cách ly đa trạm, chống BOLA).
   *
   * @param input DTO danh sách đơn import
   * @param securityContext Ngữ cảnh người dùng
   * @returns {Promise<Result<ImportOrdersResultDTO, string>>}
   */
  public async execute(
    input: ImportOrdersInputDTO,
    securityContext?: SecurityContext
  ): Promise<Result<ImportOrdersResultDTO, string>> {
    try {
      // 1. Kiểm tra Fail-Closed
      if (!securityContext) {
        return failure('Yêu cầu không được xác thực. Vui lòng đăng nhập.');
      }

      // 2. Phân quyền RBAC
      if (securityContext.role === USER_ROLE.SHIPPER) {
        return failure('Nhân viên giao hàng không có quyền nhập đơn hàng');
      }

      if (
        securityContext.role === USER_ROLE.HUB_MANAGER ||
        securityContext.role === USER_ROLE.HUB_STAFF
      ) {
        if (!securityContext.hubId) {
          return failure('Tài khoản nhân sự chưa được gán trạm làm việc trực thuộc');
        }
      } else if (securityContext.role !== USER_ROLE.ADMIN) {
        return failure('Bạn không có quyền nhập đơn hàng');
      }

      const ordersToCreate: Order[] = [];
      const errors: { row: number; error: string }[] = [];
      const trackingCodes: string[] = [];

      const defaultHubId = securityContext.hubId;

      for (let i = 0; i < input.orders.length; i++) {
        const row = i + 1;
        const item = input.orders[i];

        try {
          // Với nhân sự trạm, bắt buộc gán vào trạm trực thuộc (chống BOLA nhập hàng trạm khác)
          const hubId =
            securityContext.role === USER_ROLE.ADMIN
              ? (item.currentHubId ?? defaultHubId)
              : securityContext.hubId;
          if (hubId) {
            const hub = await this.hubRepository.findById(hubId);
            if (!hub) {
              errors.push({ row, error: `Trạm tiếp nhận "${hubId}" không tồn tại` });
              continue;
            }
          }

          const trackingCode = TrackingCode.generate();
          const senderPhone = PhoneNumber.create(item.senderPhone);
          const receiverPhone = PhoneNumber.create(item.receiverPhone);
          const receiverAddress = Address.create({
            street: item.receiverAddress,
            province: item.receiverProvince,
            district: item.receiverDistrict,
            ward: item.receiverWard ?? undefined,
          });

          const dimensions = PackageDimensions.create(
            item.lengthCm,
            item.widthCm,
            item.heightCm,
            item.weightGram
          );

          let fee = item.shippingFee;
          if (fee === undefined || fee === null) {
            const billable = dimensions.getBillableWeightGram();
            fee = billable <= 1000 ? 20000 : 20000 + Math.ceil((billable - 1000) / 500) * 5000;
          }

          const order = new Order({
            trackingCode,
            currentHubId: hubId,
            senderName: item.senderName,
            senderPhone,
            senderAddress: item.senderAddress,
            receiverName: item.receiverName,
            receiverPhone,
            receiverAddress,
            dimensions,
            codAmount: Money.fromNumber(item.codAmount),
            shippingFee: Money.fromNumber(fee),
            paymentBy: item.paymentBy,
            paymentStatus: PAYMENT_STATUS.UNPAID,
            currentStatus: hubId ? ORDER_STATUS.AT_HUB : ORDER_STATUS.CREATED,
            notes: item.notes ?? null,
          });

          ordersToCreate.push(order);
          trackingCodes.push(trackingCode.getValue());
        } catch (itemErr) {
          const msg = itemErr instanceof Error ? itemErr.message : 'Dữ liệu không hợp lệ';
          errors.push({ row, error: msg });
        }
      }

      if (ordersToCreate.length > 0) {
        await this.orderRepository.createBatch(ordersToCreate);
      }

      const output: ImportOrdersResultDTO = {
        totalRequested: input.orders.length,
        successCount: ordersToCreate.length,
        failedCount: errors.length,
        trackingCodes,
        errors,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Import đơn hàng thất bại: ${errorMsg}`);
    }
  }
}
