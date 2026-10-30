/**
 * @file get-public-tracking.use-case.ts
 * @description Use Case Tra cứu hành trình vận đơn công khai (UC23).
 * Dành cho khách vãng lai: Tự động che số điện thoại bảo mật (0912***456) và render Timeline sự kiện.
 * @module application/use-cases/orders
 */

import type { IUseCase } from '../../interfaces/use-case.interface';
import { type Result, success, failure } from '../../interfaces/result.interface';
import type { IOrderRepository } from '../../../domain/interface/repositories/order.repository.interface';
import type { IOrderStatusLogRepository } from '../../../domain/interface/repositories/order-status-log.repository.interface';
import type { IHubRepository } from '../../../domain/interface/repositories/hub.repository.interface';
import {
  type PublicTrackingQueryDTO,
  type PublicTrackingOutputDTO,
  type TrackingTimelineEventDTO,
} from '../../dtos/tracking.dto';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';

/**
 * Bản đồ tên trạng thái thân thiện cho khách hàng tiếng Việt
 */
const STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.CREATED]: 'Đơn hàng mới tạo',
  [ORDER_STATUS.AT_HUB]: 'Đã nhập kho bưu cục',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Đang trên đường giao đến bạn',
  [ORDER_STATUS.DELIVERED]: 'Giao hàng thành công',
  [ORDER_STATUS.FAILED_ATTEMPT]: 'Giao hàng không thành công (Hẹn giao lại)',
  [ORDER_STATUS.RETURN_PENDING]: 'Chờ chuyển hoàn về người gửi',
  [ORDER_STATUS.RETURNED]: 'Đã chuyển hoàn thành công',
  [ORDER_STATUS.CANCELLED]: 'Đơn hàng đã hủy',
};

/**
 * Che họ tên người nhận để chống PII Scraping trong API tra cứu công khai.
 * Ví dụ: "Nguyễn Văn An" -> "N***** V** A*"
 *
 * @param fullName Họ và tên gốc
 * @returns {string} Họ và tên đã được che bảo mật
 */
export function maskReceiverName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '***';
  if (parts.length === 1) {
    const single = parts[0];
    return single.length <= 2 ? `${single[0]}*` : `${single[0]}${'*'.repeat(single.length - 2)}${single.slice(-1)}`;
  }
  return parts
    .map((word, index) => {
      if (word.length <= 1) return '*';
      if (index === 0) {
        return `${word[0]}${'*'.repeat(Math.max(1, word.length - 1))}`;
      }
      if (index === parts.length - 1) {
        return word.length <= 2 ? `${word[0]}*` : `${word[0]}${'*'.repeat(word.length - 2)}${word.slice(-1)}`;
      }
      return `${word[0]}${'*'.repeat(Math.max(1, word.length - 1))}`;
    })
    .join(' ');
}

export class GetPublicTrackingUseCase
  implements IUseCase<PublicTrackingQueryDTO, Result<PublicTrackingOutputDTO, string>>
{
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly orderStatusLogRepository: IOrderStatusLogRepository,
    private readonly hubRepository: IHubRepository
  ) {}

  public async execute(
    input: PublicTrackingQueryDTO
  ): Promise<Result<PublicTrackingOutputDTO, string>> {
    try {
      const normalizedCode = input.trackingCode.trim().toUpperCase();
      const order = await this.orderRepository.findByTrackingCode(normalizedCode);

      if (!order) {
        return failure('Mã vận đơn không tồn tại trên hệ thống. Quý khách vui lòng kiểm tra lại');
      }

      // Lấy lịch sử logs
      const logs = await this.orderStatusLogRepository.findByOrderId(order.getId()!);

      // Lấy danh sách tên trạm liên quan (Batch Loading khử N+1)
      const hubIds = Array.from(
        new Set(logs.map((l) => l.getHubId()).filter((id): id is string | number => id !== null))
      );
      if (order.getCurrentHubId()) {
        hubIds.push(order.getCurrentHubId()!);
      }

      const hubs = hubIds.length > 0 ? await this.hubRepository.findByIds(hubIds) : [];
      const hubMap = new Map<string, { name: string; province: string }>();
      for (const h of hubs) {
        hubMap.set(String(h.getId()), { name: h.getName(), province: h.getProvince() });
      }

      const timeline: TrackingTimelineEventDTO[] = logs.map((log) => {
        const hid = log.getHubId() !== null ? String(log.getHubId()) : null;
        const hubInfo = hid ? hubMap.get(hid) : null;
        const status = log.getNewStatus();

        return {
          status,
          statusLabel: STATUS_LABELS[status] || status,
          timestamp: log.getCreatedAt().toISOString(),
          hubName: hubInfo ? hubInfo.name : null,
          locationName: hubInfo ? hubInfo.province : null,
          note: log.getNote(),
        };
      });

      const output: PublicTrackingOutputDTO = {
        trackingCode: order.getTrackingCode().getValue(),
        currentStatus: order.getCurrentStatus(),
        currentStatusLabel: STATUS_LABELS[order.getCurrentStatus()] || order.getCurrentStatus(),
        // Bảo mật: Che họ tên người nhận để chống PII Scraping
        receiverName: maskReceiverName(order.getReceiverName()),
        // Bảo mật: Che 3 số giữa của SĐT người nhận (0912***456)
        receiverPhoneMasked: order.getReceiverPhone().toMaskedString(),
        destinationProvince: order.getReceiverAddress().getProvince(),
        destinationDistrict: order.getReceiverAddress().getDistrict(),
        weightGram: order.getDimensions().getWeightGram(),
        createdAt: order.getCreatedAt().toISOString(),
        updatedAt: order.getUpdatedAt().toISOString(),
        timeline,
      };

      return success(output);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Lỗi hệ thống';
      return failure(`Tra cứu vận đơn thất bại: ${errorMsg}`);
    }
  }
}
