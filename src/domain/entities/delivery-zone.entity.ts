/**
 * @file delivery-zone.entity.ts
 * @description Thực thể Tuyến đường / Khu vực giao hàng trực thuộc Trạm (Delivery Zone).
 * @module domain/entities
 */

export interface DeliveryZoneProps {
  id?: string | number | null;
  hubId: string | number;
  code: string;
  name: string;
  district: string;
  ward?: string | null;
  description?: string | null;
}

/**
 * Thực thể quản lý khu vực địa bàn giao nhận phục vụ phân chia tuyến cho Shipper.
 */
export class DeliveryZone {
  private readonly id: string | number | null;
  private readonly hubId: string | number;
  private readonly code: string;
  private name: string;
  private district: string;
  private ward: string | null;
  private description: string | null;

  constructor(props: DeliveryZoneProps) {
    this.id = props.id ?? null;
    this.hubId = props.hubId;
    this.code = props.code.trim().toUpperCase();
    this.name = props.name.trim();
    this.district = props.district.trim();
    this.ward = props.ward ? props.ward.trim() : null;
    this.description = props.description ? props.description.trim() : null;
  }

  public getId(): string | number | null { return this.id; }
  public getHubId(): string | number { return this.hubId; }
  public getCode(): string { return this.code; }
  public getName(): string { return this.name; }
  public getDistrict(): string { return this.district; }
  public getWard(): string | null { return this.ward; }
  public getDescription(): string | null { return this.description; }

  /**
   * Kiểm tra xem một địa chỉ nhận có thuộc tuyến giao hàng này hay không.
   */
  public matchesAddress(district: string, ward?: string | null): boolean {
    const isSameDistrict = this.district.toLowerCase() === district.toLowerCase();
    if (!this.ward || !ward) {
      return isSameDistrict;
    }
    return isSameDistrict && this.ward.toLowerCase() === ward.toLowerCase();
  }
}
