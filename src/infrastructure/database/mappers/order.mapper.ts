/**
 * @file order.mapper.ts
 * @description Data Mapper chuyển đổi giữa Prisma Order model và Order Domain Entity.
 * @module infrastructure/database/mappers
 */

import type { Order as PrismaOrder, Prisma } from '@prisma/client';
import {
  Order,
  TrackingCode,
  PhoneNumber,
  Address,
  Money,
  PackageDimensions,
  type OrderStatus,
  type PaymentBy,
  type PaymentStatus,
} from '../../../domain';
import { fromBigInt, fromDecimal, toBigInt } from './mapper-helpers';

/**
 * Lớp chịu trách nhiệm chuyển đổi hai chiều cho Đơn hàng (Order).
 */
export class OrderMapper {
  /**
   * Chuyển đổi từ Prisma Order record sang Domain Entity Order.
   * Tái tạo toàn bộ các Value Objects và đóng gói logic trạng thái.
   *
   * @param {PrismaOrder} raw Bản ghi Order từ Prisma
   * @returns {Order} Thực thể Order thuộc tầng Domain
   */
  public static toDomain(raw: PrismaOrder): Order {
    return new Order({
      id: fromBigInt(raw.id),
      trackingCode: new TrackingCode(raw.trackingCode),
      currentHubId: fromBigInt(raw.currentHubId),
      assignedShipperId: fromBigInt(raw.assignedShipperId),

      // Người gửi
      senderName: raw.senderName,
      senderPhone: new PhoneNumber(raw.senderPhone),
      senderAddress: raw.senderAddress,

      // Người nhận
      receiverName: raw.receiverName,
      receiverPhone: new PhoneNumber(raw.receiverPhone),
      receiverAddress: new Address({
        street: raw.receiverAddress,
        ward: raw.receiverWard,
        district: raw.receiverDistrict,
        province: raw.receiverProvince,
      }),

      // Thông số bưu kiện & Tiền tệ
      dimensions: new PackageDimensions({
        weightGram: fromDecimal(raw.weightGram),
        lengthCm: fromDecimal(raw.lengthCm),
        widthCm: fromDecimal(raw.widthCm),
        heightCm: fromDecimal(raw.heightCm),
      }),
      codAmount: new Money(fromDecimal(raw.codAmount)),
      shippingFee: new Money(fromDecimal(raw.shippingFee)),
      paymentBy: raw.paymentBy as PaymentBy,
      paymentStatus: raw.paymentStatus as PaymentStatus,

      // Trạng thái & Vòng đời
      currentStatus: raw.currentStatus as OrderStatus,
      deliveryAttempts: raw.deliveryAttempts,
      maxAttempts: raw.maxAttempts,
      notes: raw.notes,

      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Chuyển đổi từ Domain Entity Order sang Prisma Create Input.
   *
   * @param {Order} domain Thực thể Order
   * @returns {Prisma.OrderUncheckedCreateInput} Dữ liệu phục vụ prisma.order.create()
   */
  public static toPersistenceCreate(domain: Order): Prisma.OrderUncheckedCreateInput {
    const receiverAddress = domain.getReceiverAddress();
    const dimensions = domain.getDimensions();

    const data: Prisma.OrderUncheckedCreateInput = {
      trackingCode: domain.getTrackingCode().getValue(),
      currentHubId: toBigInt(domain.getCurrentHubId()),
      assignedShipperId: toBigInt(domain.getAssignedShipperId()),

      senderName: domain.getSenderName(),
      senderPhone: domain.getSenderPhone().getValue(),
      senderAddress: domain.getSenderAddress(),

      receiverName: domain.getReceiverName(),
      receiverPhone: domain.getReceiverPhone().getValue(),
      receiverAddress: receiverAddress.getStreet(),
      receiverProvince: receiverAddress.getProvince(),
      receiverDistrict: receiverAddress.getDistrict(),
      receiverWard: receiverAddress.getWard(),

      weightGram: dimensions.getWeightGram(),
      lengthCm: dimensions.getLengthCm(),
      widthCm: dimensions.getWidthCm(),
      heightCm: dimensions.getHeightCm(),

      codAmount: domain.getCodAmount().getAmount(),
      shippingFee: domain.getShippingFee().getAmount(),
      paymentBy: domain.getPaymentBy(),
      paymentStatus: domain.getPaymentStatus(),

      currentStatus: domain.getCurrentStatus(),
      deliveryAttempts: domain.getDeliveryAttempts(),
      maxAttempts: domain.getMaxAttempts(),
      notes: domain.getNotes(),
    };

    const domainId = domain.getId();
    if (domainId !== null && domainId !== undefined) {
      data.id = BigInt(domainId);
    }

    return data;
  }

  /**
   * Chuyển đổi từ Domain Entity Order sang Prisma Update Input.
   *
   * @param {Order} domain Thực thể Order
   * @returns {Prisma.OrderUncheckedUpdateInput} Dữ liệu phục vụ prisma.order.update()
   */
  public static toPersistenceUpdate(domain: Order): Prisma.OrderUncheckedUpdateInput {
    const receiverAddress = domain.getReceiverAddress();
    const dimensions = domain.getDimensions();

    return {
      currentHubId: toBigInt(domain.getCurrentHubId()),
      assignedShipperId: toBigInt(domain.getAssignedShipperId()),

      senderName: domain.getSenderName(),
      senderPhone: domain.getSenderPhone().getValue(),
      senderAddress: domain.getSenderAddress(),

      receiverName: domain.getReceiverName(),
      receiverPhone: domain.getReceiverPhone().getValue(),
      receiverAddress: receiverAddress.getStreet(),
      receiverProvince: receiverAddress.getProvince(),
      receiverDistrict: receiverAddress.getDistrict(),
      receiverWard: receiverAddress.getWard(),

      weightGram: dimensions.getWeightGram(),
      lengthCm: dimensions.getLengthCm(),
      widthCm: dimensions.getWidthCm(),
      heightCm: dimensions.getHeightCm(),

      codAmount: domain.getCodAmount().getAmount(),
      shippingFee: domain.getShippingFee().getAmount(),
      paymentBy: domain.getPaymentBy(),
      paymentStatus: domain.getPaymentStatus(),

      currentStatus: domain.getCurrentStatus(),
      deliveryAttempts: domain.getDeliveryAttempts(),
      maxAttempts: domain.getMaxAttempts(),
      notes: domain.getNotes(),
      updatedAt: domain.getUpdatedAt(),
    };
  }
}
