'use server';

/**
 * @file tracking.actions.ts
 * @description Server Actions cho phân hệ Tra cứu Vận đơn Công khai (UC23).
 * Cho phép khách hàng vãng lai tra cứu lộ trình vận chuyển bằng mã TRK (không cần đăng nhập).
 * Tuân thủ bảo vệ quyền riêng tư: Che số điện thoại người nhận (0912***678).
 * @module presentation/actions/tracking.actions
 */

import {
  PublicTrackingQuerySchema,
  type PublicTrackingQueryDTO,
  type PublicTrackingOutputDTO,
} from '../../application/dtos/tracking.dto';
import type { Result } from '../../application/interfaces';
import { failure } from '../../application/interfaces';
import { appContainer } from '../../infrastructure/di';
import { parseActionInput } from './form-parser.helper';
import { formatZodFailure } from './action-utils.helper';

/**
 * Server Action: Tra cứu công khai hành trình vận đơn qua mã TRK (UC23).
 * Không yêu cầu đăng nhập. Tự động che dấu các thông tin cá nhân nhạy cảm.
 *
 * @param {PublicTrackingQueryDTO | FormData | string} query Mã vận đơn hoặc đối tượng query
 * @returns {Promise<Result<PublicTrackingOutputDTO, string>>}
 */
export async function trackOrderPublicAction(
  query: PublicTrackingQueryDTO | FormData | string
): Promise<Result<PublicTrackingOutputDTO, string>> {
  try {
    let rawData: unknown;
    if (typeof query === 'string') {
      rawData = { trackingCode: query };
    } else {
      rawData = parseActionInput(query);
    }

    const parsed = PublicTrackingQuerySchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.orders.getPublicTracking().execute(parsed.data);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống khi tra cứu vận đơn';
    return failure(`Tra cứu vận đơn thất bại: ${message}`);
  }
}
