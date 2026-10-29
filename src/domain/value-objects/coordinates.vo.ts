/**
 * @file coordinates.vo.ts
 * @description Value Object biểu diễn Tọa độ GPS địa lý (phục vụ bằng chứng POD và định vị).
 * @module domain/value-objects
 */

import { BaseDomainException } from '../exceptions/domain.exception';

export class InvalidCoordinatesException extends BaseDomainException {
  public readonly errorCode = 'INVALID_COORDINATES';
  constructor(lat: number, lng: number) {
    super(`Tọa độ GPS không hợp lệ (Vĩ độ: ${lat}, Kinh độ: ${lng}). Vĩ độ phải từ -90 đến 90, kinh độ từ -180 đến 180.`);
  }
}

/**
 * Value Object bất biến đại diện cho Tọa độ GPS.
 */
export class Coordinates {
  private readonly latitude: number;
  private readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new InvalidCoordinatesException(latitude, longitude);
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  public getLatitude(): number {
    return this.latitude;
  }

  public getLongitude(): number {
    return this.longitude;
  }

  /**
   * Tính khoảng cách đường chim bay giữa 2 tọa độ (đơn vị: km) theo công thức Haversine.
   */
  public distanceTo(other: Coordinates): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(other.getLatitude() - this.latitude);
    const dLng = this.toRadians(other.getLongitude() - this.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(this.latitude)) *
        Math.cos(this.toRadians(other.getLatitude())) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadiusKm * c * 100) / 100;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  public equals(other: Coordinates): boolean {
    return this.latitude === other.getLatitude() && this.longitude === other.getLongitude();
  }
}
