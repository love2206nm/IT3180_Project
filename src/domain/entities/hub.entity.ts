/**
 * @file hub.entity.ts
 * @description Thực thể Trạm giao nhận / Bưu cục trong mạng lưới Logistics.
 * @module domain/entities
 */

import { HUB_STATUS, type HubStatus } from '../constants/hub-status.constant';
import { PhoneNumber } from '../value-objects/phone-number.vo';

export interface HubProps {
  id?: string | number | null;
  code: string;
  name: string;
  address: string;
  province: string;
  district: string;
  ward?: string | null;
  phone?: PhoneNumber | null;
  status?: HubStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Thực thể quản lý điểm nút trạm trung chuyển / giao nhận (Hub).
 */
export class Hub {
  private readonly id: string | number | null;
  private readonly code: string;
  private name: string;
  private address: string;
  private province: string;
  private district: string;
  private ward: string | null;
  private phone: PhoneNumber | null;
  private status: HubStatus;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: HubProps) {
    this.id = props.id ?? null;
    this.code = props.code.trim().toUpperCase();
    this.name = props.name.trim();
    this.address = props.address.trim();
    this.province = props.province.trim();
    this.district = props.district.trim();
    this.ward = props.ward ? props.ward.trim() : null;
    this.phone = props.phone ?? null;
    this.status = props.status ?? HUB_STATUS.ACTIVE;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  public getId(): string | number | null { return this.id; }
  public getCode(): string { return this.code; }
  public getName(): string { return this.name; }
  public getAddress(): string { return this.address; }
  public getProvince(): string { return this.province; }
  public getDistrict(): string { return this.district; }
  public getWard(): string | null { return this.ward; }
  public getPhone(): PhoneNumber | null { return this.phone; }
  public getStatus(): HubStatus { return this.status; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }

  public isActive(): boolean {
    return this.status === HUB_STATUS.ACTIVE;
  }

  public activate(): void {
    this.status = HUB_STATUS.ACTIVE;
    this.touch();
  }

  public deactivate(): void {
    this.status = HUB_STATUS.INACTIVE;
    this.touch();
  }

  public updateInfo(name: string, address: string, phone?: PhoneNumber | null): void {
    this.name = name.trim();
    this.address = address.trim();
    if (phone !== undefined) this.phone = phone;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
