/**
 * @file address.vo.ts
 * @description Value Object biểu diễn Địa chỉ giao/nhận hàng chi tiết.
 * @module domain/value-objects
 */

import { BaseDomainException } from '../exceptions/domain.exception';

export class InvalidAddressException extends BaseDomainException {
  public readonly errorCode = 'INVALID_ADDRESS';
  constructor(reason: string) {
    super(`Địa chỉ không hợp lệ: ${reason}`);
  }
}

export interface AddressProps {
  street: string;
  ward?: string | null;
  district: string;
  province: string;
}

/**
 * Value Object bất biến đại diện cho Địa chỉ giao nhận chuẩn hóa.
 */
export class Address {
  private readonly street: string;
  private readonly ward: string | null;
  private readonly district: string;
  private readonly province: string;

  constructor(props: AddressProps) {
    if (!props.street || props.street.trim() === '') {
      throw new InvalidAddressException('Địa chỉ số nhà/tên đường không được để trống.');
    }
    if (!props.district || props.district.trim() === '') {
      throw new InvalidAddressException('Quận/Huyện không được để trống.');
    }
    if (!props.province || props.province.trim() === '') {
      throw new InvalidAddressException('Tỉnh/Thành phố không được để trống.');
    }

    this.street = props.street.trim();
    this.ward = props.ward ? props.ward.trim() : null;
    this.district = props.district.trim();
    this.province = props.province.trim();
  }

  public getStreet(): string {
    return this.street;
  }

  public getWard(): string | null {
    return this.ward;
  }

  public getDistrict(): string {
    return this.district;
  }

  public getProvince(): string {
    return this.province;
  }

  /**
   * Trả về chuỗi địa chỉ đầy đủ ghép từ các cấp hành chính.
   */
  public getFullAddress(): string {
    const parts = [this.street];
    if (this.ward) parts.push(this.ward);
    parts.push(this.district);
    parts.push(this.province);
    return parts.join(', ');
  }

  public equals(other: Address): boolean {
    return (
      this.street.toLowerCase() === other.getStreet().toLowerCase() &&
      (this.ward?.toLowerCase() ?? '') === (other.getWard()?.toLowerCase() ?? '') &&
      this.district.toLowerCase() === other.getDistrict().toLowerCase() &&
      this.province.toLowerCase() === other.getProvince().toLowerCase()
    );
  }

  public toString(): string {
    return this.getFullAddress();
  }
}
