/**
 * @file money.vo.ts
 * @description Value Object biểu diễn Số tiền tệ (tiền COD, cước phí vận chuyển).
 * @module domain/value-objects
 */

import { BaseDomainException } from '../exceptions/domain.exception';
import { DELIVERY_CONSTRAINTS } from '../constants/delivery-constraints.constant';

export class InvalidMoneyAmountException extends BaseDomainException {
  public readonly errorCode = 'INVALID_MONEY_AMOUNT';
  constructor(amount: number) {
    super(`Số tiền không hợp lệ (${amount}). Số tiền không được là số âm và phải là số hữu hạn.`);
  }
}

/**
 * Value Object bất biến đại diện cho Tiền tệ (VND).
 */
export class Money {
  private readonly amount: number;
  private readonly currency: string;

  /**
   * Khởi tạo số tiền hợp lệ.
   * @param amount Số tiền (phải >= 0)
   * @param currency Đơn vị tiền tệ (mặc định VND)
   */
  constructor(amount: number, currency: string = DELIVERY_CONSTRAINTS.DEFAULT_CURRENCY) {
    if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      throw new InvalidMoneyAmountException(amount);
    }
    // Làm tròn đến số nguyên đồng vì VND không dùng số thập phân
    this.amount = Math.round(amount);
    this.currency = currency;
  }

  public static zero(): Money {
    return new Money(0);
  }

  public getAmount(): number {
    return this.amount;
  }

  public getCurrency(): string {
    return this.currency;
  }

  public add(other: Money): Money {
    return new Money(this.amount + other.getAmount(), this.currency);
  }

  public subtract(other: Money): Money {
    const newAmount = this.amount - other.getAmount();
    if (newAmount < 0) {
      throw new InvalidMoneyAmountException(newAmount);
    }
    return new Money(newAmount, this.currency);
  }

  public isZero(): boolean {
    return this.amount === 0;
  }

  public isGreaterThan(other: Money): boolean {
    return this.amount > other.getAmount();
  }

  public isLessThan(other: Money): boolean {
    return this.amount < other.getAmount();
  }

  public equals(other: Money): boolean {
    return this.amount === other.getAmount() && this.currency === other.getCurrency();
  }

  /**
   * Định dạng tiền tệ hiển thị tiếng Việt (ví dụ: '50.000 ₫').
   */
  public formatVND(): string {
    return `${this.amount.toLocaleString('vi-VN')} ₫`;
  }

  public toString(): string {
    return this.formatVND();
  }
}
