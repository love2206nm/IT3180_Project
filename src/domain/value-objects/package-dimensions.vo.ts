/**
 * @file package-dimensions.vo.ts
 * @description Value Object biểu diễn Kích thước và Khối lượng bưu kiện.
 * @module domain/value-objects
 */

import { BaseDomainException } from '../exceptions/domain.exception';
import { DELIVERY_CONSTRAINTS } from '../constants/delivery-constraints.constant';

export class InvalidPackageDimensionsException extends BaseDomainException {
  public readonly errorCode = 'INVALID_PACKAGE_DIMENSIONS';
  constructor(reason: string) {
    super(`Thông số kích thước/khối lượng bưu kiện không hợp lệ: ${reason}`);
  }
}

export interface PackageDimensionsProps {
  weightGram: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

/**
 * Value Object bất biến đại diện cho Kích thước và Trọng lượng bưu kiện.
 */
export class PackageDimensions {
  private readonly weightGram: number;
  private readonly lengthCm: number;
  private readonly widthCm: number;
  private readonly heightCm: number;

  constructor(props: PackageDimensionsProps) {
    if (props.weightGram < DELIVERY_CONSTRAINTS.MIN_WEIGHT_GRAM) {
      throw new InvalidPackageDimensionsException(
        `Khối lượng phải tối thiểu ${DELIVERY_CONSTRAINTS.MIN_WEIGHT_GRAM}g.`
      );
    }
    if (props.weightGram > DELIVERY_CONSTRAINTS.MAX_WEIGHT_GRAM) {
      throw new InvalidPackageDimensionsException(
        `Khối lượng vượt quá giới hạn tối đa cho phép (${DELIVERY_CONSTRAINTS.MAX_WEIGHT_GRAM}g).`
      );
    }

    const length = props.lengthCm ?? 0;
    const width = props.widthCm ?? 0;
    const height = props.heightCm ?? 0;

    if (length < 0 || width < 0 || height < 0) {
      throw new InvalidPackageDimensionsException('Các chiều dài, rộng, cao không được là số âm.');
    }

    this.weightGram = Math.round(props.weightGram);
    this.lengthCm = Math.round(length * 10) / 10;
    this.widthCm = Math.round(width * 10) / 10;
    this.heightCm = Math.round(height * 10) / 10;
  }

  /**
   * Factory method tiện ích tạo PackageDimensions.
   */
  public static create(lengthCm: number, widthCm: number, heightCm: number, weightGram: number): PackageDimensions {
    return new PackageDimensions({ lengthCm, widthCm, heightCm, weightGram });
  }

  public getWeightGram(): number {
    return this.weightGram;
  }

  public getLengthCm(): number {
    return this.lengthCm;
  }

  public getWidthCm(): number {
    return this.widthCm;
  }

  public getHeightCm(): number {
    return this.heightCm;
  }

  /**
   * Tính khối lượng quy đổi từ thể tích (gram).
   * Công thức ngành bưu chính: (Dài x Rộng x Cao cm) / 5000 * 1000 = (D x R x C) / 5
   */
  public calculateVolumetricWeightGram(): number {
    if (this.lengthCm === 0 || this.widthCm === 0 || this.heightCm === 0) {
      return 0;
    }
    return Math.round((this.lengthCm * this.widthCm * this.heightCm) / 5);
  }

  /**
   * Trọng lượng tính cước (Billable Weight) = Lấy số lớn hơn giữa cân nặng thực tế và quy đổi thể tích.
   */
  public getBillableWeightGram(): number {
    return Math.max(this.weightGram, this.calculateVolumetricWeightGram());
  }
}
