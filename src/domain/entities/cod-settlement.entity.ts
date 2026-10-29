/**
 * @file cod-settlement.entity.ts
 * @description Thực thể Phiên nộp và Đối soát Tiền thu hộ COD giữa Shipper và Quản lý trạm.
 * @module domain/entities
 */

import { COD_SETTLEMENT_STATUS, type CODSettlementStatus } from '../constants/cod-status.constant';
import { Money } from '../value-objects/money.vo';
import { CODSettlementAlreadyProcessedException } from '../exceptions/cod.exceptions';

export interface CODSettlementDetailProps {
  id?: string | number | null;
  settlementId?: string | number | null;
  orderId: string | number;
  codCollected: Money;
}

/**
 * Bản ghi chi tiết từng đơn hàng trong một phiên nộp tiền COD.
 */
export class CODSettlementDetail {
  private readonly id: string | number | null;
  private readonly orderId: string | number;
  private readonly codCollected: Money;

  constructor(props: CODSettlementDetailProps) {
    this.id = props.id ?? null;
    this.orderId = props.orderId;
    this.codCollected = props.codCollected;
  }

  public getId(): string | number | null { return this.id; }
  public getOrderId(): string | number { return this.orderId; }
  public getCodCollected(): Money { return this.codCollected; }
}

export interface CODSettlementProps {
  id?: string | number | null;
  settlementCode: string;
  hubId: string | number;
  shipperId: string | number;
  managerId?: string | number | null;
  totalCodAmount: Money;
  totalOrdersCount: number;
  status?: CODSettlementStatus;
  notes?: string | null;
  settledAt?: Date | null;
  createdAt?: Date;
  details?: CODSettlementDetail[];
}

/**
 * Thực thể quản lý phiên bàn giao tiền COD cuối ca làm việc (UC22).
 */
export class CODSettlement {
  private readonly id: string | number | null;
  private readonly settlementCode: string;
  private readonly hubId: string | number;
  private readonly shipperId: string | number;
  private managerId: string | number | null;
  private readonly totalCodAmount: Money;
  private readonly totalOrdersCount: number;
  private status: CODSettlementStatus;
  private notes: string | null;
  private settledAt: Date | null;
  private readonly createdAt: Date;
  private readonly details: CODSettlementDetail[];

  constructor(props: CODSettlementProps) {
    this.id = props.id ?? null;
    this.settlementCode = props.settlementCode.trim().toUpperCase();
    this.hubId = props.hubId;
    this.shipperId = props.shipperId;
    this.managerId = props.managerId ?? null;
    this.totalCodAmount = props.totalCodAmount;
    this.totalOrdersCount = props.totalOrdersCount;
    this.status = props.status ?? COD_SETTLEMENT_STATUS.PENDING;
    this.notes = props.notes ?? null;
    this.settledAt = props.settledAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.details = props.details ?? [];
  }

  public getId(): string | number | null { return this.id; }
  public getSettlementCode(): string { return this.settlementCode; }
  public getHubId(): string | number { return this.hubId; }
  public getShipperId(): string | number { return this.shipperId; }
  public getManagerId(): string | number | null { return this.managerId; }
  public getTotalCodAmount(): Money { return this.totalCodAmount; }
  public getTotalOrdersCount(): number { return this.totalOrdersCount; }
  public getStatus(): CODSettlementStatus { return this.status; }
  public getNotes(): string | null { return this.notes; }
  public getSettledAt(): Date | null { return this.settledAt; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getDetails(): readonly CODSettlementDetail[] { return this.details; }

  public isPending(): boolean {
    return this.status === COD_SETTLEMENT_STATUS.PENDING;
  }

  public isConfirmed(): boolean {
    return this.status === COD_SETTLEMENT_STATUS.CONFIRMED;
  }

  /**
   * Quản lý trạm xác nhận đã nhận đủ tiền COD từ Shipper (UC22).
   */
  public confirm(managerId: string | number): void {
    if (!this.isPending()) {
      throw new CODSettlementAlreadyProcessedException(this.settlementCode, this.status);
    }
    this.managerId = managerId;
    this.status = COD_SETTLEMENT_STATUS.CONFIRMED;
    this.settledAt = new Date();
  }

  /**
   * Quản lý trạm từ chối nhận tiền do lệch hoặc có sai sót.
   */
  public reject(managerId: string | number, reason: string): void {
    if (!this.isPending()) {
      throw new CODSettlementAlreadyProcessedException(this.settlementCode, this.status);
    }
    this.managerId = managerId;
    this.status = COD_SETTLEMENT_STATUS.REJECTED;
    this.notes = this.notes ? `${this.notes} | Lý do từ chối: ${reason}` : `Lý do từ chối: ${reason}`;
  }
}
