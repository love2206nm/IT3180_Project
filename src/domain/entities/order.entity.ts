/**
 * @file order.entity.ts
 * @description Thực thể bưu kiện / đơn hàng trung tâm của hệ thống Logistics.
 * @module domain/entities
 */

import { ORDER_STATUS, type OrderStatus, VALID_ORDER_STATUS_TRANSITIONS } from '../constants/order-status.constant';
import { PAYMENT_BY, PAYMENT_STATUS, type PaymentBy, type PaymentStatus } from '../constants/payment.constant';
import { DELIVERY_CONSTRAINTS } from '../constants/delivery-constraints.constant';
import { TrackingCode } from '../value-objects/tracking-code.vo';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { Address } from '../value-objects/address.vo';
import { Money } from '../value-objects/money.vo';
import { PackageDimensions } from '../value-objects/package-dimensions.vo';
import {
  InvalidStatusTransitionException,
  ExceededMaxDeliveryAttemptsException,
  InvalidOrderDataException,
} from '../exceptions/order.exceptions';

export interface OrderProps {
  id?: string | number | null;
  trackingCode: TrackingCode;
  currentHubId?: string | number | null;
  assignedShipperId?: string | number | null;

  // Người gửi
  senderName: string;
  senderPhone: PhoneNumber;
  senderAddress: string;

  // Người nhận
  receiverName: string;
  receiverPhone: PhoneNumber;
  receiverAddress: Address;

  // Thuộc tính bưu kiện
  dimensions: PackageDimensions;
  codAmount: Money;
  shippingFee: Money;
  paymentBy: PaymentBy;
  paymentStatus?: PaymentStatus;

  // Trạng thái & số lần giao
  currentStatus?: OrderStatus;
  deliveryAttempts?: number;
  maxAttempts?: number;
  notes?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Rich Domain Entity đại diện cho Đơn hàng vận chuyển.
 * Đóng gói toàn bộ quy tắc nghiệp vụ về luồng trạng thái, COD và số lần giao.
 */
export class Order {
  private readonly id: string | number | null;
  private readonly trackingCode: TrackingCode;
  private currentHubId: string | number | null;
  private assignedShipperId: string | number | null;

  private senderName: string;
  private senderPhone: PhoneNumber;
  private senderAddress: string;

  private receiverName: string;
  private receiverPhone: PhoneNumber;
  private receiverAddress: Address;

  private dimensions: PackageDimensions;
  private codAmount: Money;
  private shippingFee: Money;
  private paymentBy: PaymentBy;
  private paymentStatus: PaymentStatus;

  private currentStatus: OrderStatus;
  private deliveryAttempts: number;
  private readonly maxAttempts: number;
  private notes: string | null;

  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: OrderProps) {
    if (!props.senderName || props.senderName.trim() === '') {
      throw new InvalidOrderDataException('Tên người gửi không được để trống.');
    }
    if (!props.receiverName || props.receiverName.trim() === '') {
      throw new InvalidOrderDataException('Tên người nhận không được để trống.');
    }

    this.id = props.id ?? null;
    this.trackingCode = props.trackingCode;
    this.currentHubId = props.currentHubId ?? null;
    this.assignedShipperId = props.assignedShipperId ?? null;

    this.senderName = props.senderName.trim();
    this.senderPhone = props.senderPhone;
    this.senderAddress = props.senderAddress.trim();

    this.receiverName = props.receiverName.trim();
    this.receiverPhone = props.receiverPhone;
    this.receiverAddress = props.receiverAddress;

    this.dimensions = props.dimensions;
    this.codAmount = props.codAmount;
    this.shippingFee = props.shippingFee;
    this.paymentBy = props.paymentBy;
    this.paymentStatus = props.paymentStatus ?? PAYMENT_STATUS.UNPAID;

    this.currentStatus = props.currentStatus ?? ORDER_STATUS.CREATED;
    this.deliveryAttempts = props.deliveryAttempts ?? 0;
    this.maxAttempts = props.maxAttempts ?? DELIVERY_CONSTRAINTS.MAX_DELIVERY_ATTEMPTS;
    this.notes = props.notes ?? null;

    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // --- Getters ---
  public getId(): string | number | null { return this.id; }
  public getTrackingCode(): TrackingCode { return this.trackingCode; }
  public getCurrentHubId(): string | number | null { return this.currentHubId; }
  public getAssignedShipperId(): string | number | null { return this.assignedShipperId; }

  public getSenderName(): string { return this.senderName; }
  public getSenderPhone(): PhoneNumber { return this.senderPhone; }
  public getSenderAddress(): string { return this.senderAddress; }

  public getReceiverName(): string { return this.receiverName; }
  public getReceiverPhone(): PhoneNumber { return this.receiverPhone; }
  public getReceiverAddress(): Address { return this.receiverAddress; }

  public getDimensions(): PackageDimensions { return this.dimensions; }
  public getCodAmount(): Money { return this.codAmount; }
  public getShippingFee(): Money { return this.shippingFee; }
  public getPaymentBy(): PaymentBy { return this.paymentBy; }
  public getPaymentStatus(): PaymentStatus { return this.paymentStatus; }

  public getCurrentStatus(): OrderStatus { return this.currentStatus; }
  public getDeliveryAttempts(): number { return this.deliveryAttempts; }
  public getMaxAttempts(): number { return this.maxAttempts; }
  public getNotes(): string | null { return this.notes; }

  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }

  // --- Domain Logic Methods ---

  /**
   * Kiểm tra xem đơn hàng có thể chuyển sang trạng thái đích hay không.
   * @param targetStatus Trạng thái đích muốn chuyển
   */
  public canTransitionTo(targetStatus: OrderStatus): boolean {
    const allowedTransitions = VALID_ORDER_STATUS_TRANSITIONS[this.currentStatus] || [];
    return allowedTransitions.includes(targetStatus);
  }

  /**
   * Đơn hàng đã ở trạng thái kết thúc (không thể chuyển đổi tiếp).
   */
  public isFinalState(): boolean {
    return (
      this.currentStatus === ORDER_STATUS.DELIVERED ||
      this.currentStatus === ORDER_STATUS.RETURNED ||
      this.currentStatus === ORDER_STATUS.CANCELLED
    );
  }

  /**
   * Đơn hàng có yêu cầu thu tiền COD hay không.
   */
  public requiresCOD(): boolean {
    return !this.codAmount.isZero();
  }

  /**
   * Quét mã Check-in nhập kho tại trạm giao nhận (Inbound Scan - UC15).
   * @param hubId ID của trạm giao nhận thực hiện nhập kho
   */
  public markArrivedAtHub(hubId: string | number): void {
    if (!this.canTransitionTo(ORDER_STATUS.AT_HUB)) {
      throw new InvalidStatusTransitionException(this.currentStatus, ORDER_STATUS.AT_HUB);
    }
    this.currentStatus = ORDER_STATUS.AT_HUB;
    this.currentHubId = hubId;
    this.assignedShipperId = null; // Gỡ shipper trước đó nếu đang nhập lại kho
    this.touch();
  }

  /**
   * Điều phối gán đơn hàng cho Shipper đi phát (UC16).
   * @param shipperId ID của nhân viên giao hàng
   */
  public assignToShipper(shipperId: string | number): void {
    if (this.deliveryAttempts >= this.maxAttempts) {
      throw new ExceededMaxDeliveryAttemptsException(this.deliveryAttempts, this.maxAttempts);
    }
    if (!this.canTransitionTo(ORDER_STATUS.OUT_FOR_DELIVERY)) {
      throw new InvalidStatusTransitionException(this.currentStatus, ORDER_STATUS.OUT_FOR_DELIVERY);
    }
    this.currentStatus = ORDER_STATUS.OUT_FOR_DELIVERY;
    this.assignedShipperId = shipperId;
    this.touch();
  }

  /**
   * Shipper xác nhận giao hàng thành công (UC18).
   * @param codCollected Số tiền COD thực tế thu được (nếu có COD)
   */
  public markDelivered(codCollected?: Money): void {
    if (!this.canTransitionTo(ORDER_STATUS.DELIVERED)) {
      throw new InvalidStatusTransitionException(this.currentStatus, ORDER_STATUS.DELIVERED);
    }
    if (this.requiresCOD()) {
      if (!codCollected || !codCollected.equals(this.codAmount)) {
        throw new InvalidOrderDataException(
          `Số tiền COD thu (${codCollected?.formatVND() ?? '0 ₫'}) không khớp với số tiền cần thu (${this.codAmount.formatVND()}).`
        );
      }
      this.paymentStatus = PAYMENT_STATUS.PAID;
    }
    this.currentStatus = ORDER_STATUS.DELIVERED;
    this.touch();
  }

  /**
   * Ghi nhận giao hàng thất bại lần 1, 2 hoặc tự động chuyển hoàn lần 3 (UC19).
   * @param failureReason Lý do giao hàng thất bại
   */
  public recordFailedAttempt(failureReason: string): void {
    this.deliveryAttempts += 1;

    // Nếu đã giao thất bại đạt mức tối đa (thường là 3 lần), tự động chuyển sang chờ hoàn
    if (this.deliveryAttempts >= this.maxAttempts) {
      this.currentStatus = ORDER_STATUS.RETURN_PENDING;
    } else {
      if (!this.canTransitionTo(ORDER_STATUS.FAILED_ATTEMPT)) {
        throw new InvalidStatusTransitionException(this.currentStatus, ORDER_STATUS.FAILED_ATTEMPT);
      }
      this.currentStatus = ORDER_STATUS.FAILED_ATTEMPT;
    }
    this.touch();
  }

  /**
   * Đánh dấu đơn hàng chờ chuyển hoàn về người gửi (UC19, UC20).
   */
  public markReturnPending(): void {
    if (!this.canTransitionTo(ORDER_STATUS.RETURN_PENDING)) {
      throw new InvalidStatusTransitionException(this.currentStatus, ORDER_STATUS.RETURN_PENDING);
    }
    this.currentStatus = ORDER_STATUS.RETURN_PENDING;
    this.touch();
  }

  /**
   * Đánh dấu đã chuyển hoàn thành công về tay người gửi (UC20).
   */
  public markReturned(): void {
    if (!this.canTransitionTo(ORDER_STATUS.RETURNED)) {
      throw new InvalidStatusTransitionException(this.currentStatus, ORDER_STATUS.RETURNED);
    }
    this.currentStatus = ORDER_STATUS.RETURNED;
    this.touch();
  }

  /**
   * Hủy đơn hàng (UC13).
   */
  public cancel(reason?: string): void {
    if (!this.canTransitionTo(ORDER_STATUS.CANCELLED)) {
      throw new InvalidStatusTransitionException(this.currentStatus, ORDER_STATUS.CANCELLED);
    }
    this.currentStatus = ORDER_STATUS.CANCELLED;
    if (reason) {
      this.notes = this.notes ? `${this.notes} | Lý do hủy: ${reason}` : `Lý do hủy: ${reason}`;
    }
    this.touch();
  }

  /**
   * Cập nhật thông tin người nhận khi đơn đang ở trạm hoặc hẹn lại (UC12).
   */
  public updateReceiverInfo(props: { name?: string; phone?: PhoneNumber; address?: Address }): void {
    if (this.isFinalState() || this.currentStatus === ORDER_STATUS.OUT_FOR_DELIVERY) {
      throw new InvalidOrderDataException(
        'Không thể sửa đổi thông tin người nhận khi đơn đang trên đường đi giao hoặc đã hoàn tất.'
      );
    }
    if (props.name) this.receiverName = props.name.trim();
    if (props.phone) this.receiverPhone = props.phone;
    if (props.address) this.receiverAddress = props.address;
    this.touch();
  }

  /**
   * Cập nhật ghi chú đơn hàng.
   */
  public updateNotes(notes: string): void {
    this.notes = notes;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
