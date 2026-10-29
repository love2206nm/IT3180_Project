/**
 * @file order-status-log.entity.ts
 * @description Thực thể Lưu vết Lịch sử Vận chuyển (Audit Trail) bất biến.
 * @module domain/entities
 */

import type { OrderStatus } from '../constants/order-status.constant';
import { Coordinates } from '../value-objects/coordinates.vo';

export interface OrderStatusLogProps {
  id?: string | number | null;
  orderId: string | number;
  hubId?: string | number | null;
  actorId: string | number;
  previousStatus?: OrderStatus | null;
  newStatus: OrderStatus;
  failureReason?: string | null;
  proofImageUrl?: string | null;
  location?: Coordinates | null;
  note?: string | null;
  createdAt?: Date;
}

/**
 * Thực thể bất biến (Append-Only) lưu lại toàn bộ các mốc thời gian,
 * nhân sự thao tác và bằng chứng giao hàng của bưu kiện.
 */
export class OrderStatusLog {
  private readonly id: string | number | null;
  private readonly orderId: string | number;
  private readonly hubId: string | number | null;
  private readonly actorId: string | number;
  private readonly previousStatus: OrderStatus | null;
  private readonly newStatus: OrderStatus;
  private readonly failureReason: string | null;
  private readonly proofImageUrl: string | null;
  private readonly location: Coordinates | null;
  private readonly note: string | null;
  private readonly createdAt: Date;

  constructor(props: OrderStatusLogProps) {
    this.id = props.id ?? null;
    this.orderId = props.orderId;
    this.hubId = props.hubId ?? null;
    this.actorId = props.actorId;
    this.previousStatus = props.previousStatus ?? null;
    this.newStatus = props.newStatus;
    this.failureReason = props.failureReason ?? null;
    this.proofImageUrl = props.proofImageUrl ?? null;
    this.location = props.location ?? null;
    this.note = props.note ?? null;
    this.createdAt = props.createdAt ?? new Date();
  }

  public getId(): string | number | null { return this.id; }
  public getOrderId(): string | number { return this.orderId; }
  public getHubId(): string | number | null { return this.hubId; }
  public getActorId(): string | number { return this.actorId; }
  public getPreviousStatus(): OrderStatus | null { return this.previousStatus; }
  public getNewStatus(): OrderStatus { return this.newStatus; }
  public getFailureReason(): string | null { return this.failureReason; }
  public getProofImageUrl(): string | null { return this.proofImageUrl; }
  public getLocation(): Coordinates | null { return this.location; }
  public getNote(): string | null { return this.note; }
  public getCreatedAt(): Date { return this.createdAt; }
}
