/**
 * @file cod.exceptions.ts
 * @description Các ngoại lệ nghiệp vụ liên quan đến quản lý đối soát tiền thu hộ (COD).
 * @module domain/exceptions
 */

import { BaseDomainException } from './domain.exception';

/**
 * Ngoại lệ số tiền COD không hợp lệ (số âm hoặc vượt quá quy định).
 */
export class InvalidCODAmountException extends BaseDomainException {
  public readonly errorCode = 'INVALID_COD_AMOUNT';

  /**
   * @param amount Số tiền COD vi phạm
   * @param reason Lý do không hợp lệ
   */
  constructor(amount: number, reason: string) {
    super(`Số tiền COD (${amount.toLocaleString('vi-VN')} VNĐ) không hợp lệ: ${reason}`);
  }
}

/**
 * Ngoại lệ khi cố tình thay đổi phiên đối soát COD đã được xác nhận hoặc hủy.
 */
export class CODSettlementAlreadyProcessedException extends BaseDomainException {
  public readonly errorCode = 'COD_SETTLEMENT_ALREADY_PROCESSED';

  /**
   * @param settlementCode Mã phiên đối soát
   * @param currentStatus Trạng thái hiện tại
   */
  constructor(settlementCode: string, currentStatus: string) {
    super(
      `Phiên nộp COD '${settlementCode}' đã ở trạng thái '${currentStatus}', không thể chỉnh sửa thêm.`
    );
  }
}
