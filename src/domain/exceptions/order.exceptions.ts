/**
 * @file order.exceptions.ts
 * @description Các ngoại lệ nghiệp vụ liên quan đến đơn hàng và trạng thái vận chuyển.
 * @module domain/exceptions
 */

import { BaseDomainException } from './domain.exception';
import type { OrderStatus } from '../constants/order-status.constant';

/**
 * Ngoại lệ ném ra khi không tìm thấy đơn hàng theo ID hoặc Tracking Code.
 */
export class OrderNotFoundException extends BaseDomainException {
  public readonly errorCode = 'ORDER_NOT_FOUND';

  /**
   * @param identifier ID hoặc Mã vận đơn không tìm thấy
   */
  constructor(identifier: string | number) {
    super(`Không tìm thấy đơn hàng với thông tin định danh: '${identifier}'`);
  }
}

/**
 * Ngoại lệ ném ra khi vi phạm quy tắc chuyển đổi trạng thái đơn hàng (State Machine).
 */
export class InvalidStatusTransitionException extends BaseDomainException {
  public readonly errorCode = 'INVALID_STATUS_TRANSITION';

  /**
   * @param currentStatus Trạng thái hiện tại của đơn hàng
   * @param targetStatus Trạng thái đích không được phép chuyển tới
   */
  constructor(currentStatus: OrderStatus, targetStatus: OrderStatus) {
    super(
      `Không thể chuyển trạng thái đơn hàng từ '${currentStatus}' sang '${targetStatus}'. Chuyển đổi không hợp lệ theo quy trình vận chuyển.`
    );
  }
}

/**
 * Ngoại lệ ném ra khi cố tình cho Shipper giao lại đơn đã vượt quá giới hạn lần giao (3 lần).
 */
export class ExceededMaxDeliveryAttemptsException extends BaseDomainException {
  public readonly errorCode = 'EXCEEDED_MAX_DELIVERY_ATTEMPTS';

  /**
   * @param attempts Số lần giao đã thực hiện
   * @param maxAttempts Giới hạn số lần giao tối đa
   */
  constructor(attempts: number, maxAttempts: number) {
    super(
      `Đơn hàng đã giao thất bại ${attempts}/${maxAttempts} lần. Bắt buộc chuyển sang trạng thái chuyển hoàn, không thể giao lại.`
    );
  }
}

/**
 * Ngoại lệ ném ra khi đơn hàng đã được giao cho một Shipper khác hoặc không ở trạm.
 */
export class OrderAlreadyAssignedException extends BaseDomainException {
  public readonly errorCode = 'ORDER_ALREADY_ASSIGNED';

  /**
   * @param trackingCode Mã vận đơn
   * @param currentShipperId ID Shipper đang phụ trách
   */
  constructor(trackingCode: string, currentShipperId: string | number) {
    super(
      `Đơn hàng '${trackingCode}' hiện đã được gán cho Shipper có ID: '${currentShipperId}'.`
    );
  }
}

/**
 * Ngoại lệ dữ liệu đầu vào đơn hàng không hợp lệ (cân nặng <= 0, thiếu người nhận...).
 */
export class InvalidOrderDataException extends BaseDomainException {
  public readonly errorCode = 'INVALID_ORDER_DATA';

  /**
   * @param reason Chi tiết vi phạm dữ liệu
   */
  constructor(reason: string) {
    super(`Dữ liệu đơn hàng không hợp lệ: ${reason}`);
  }
}
