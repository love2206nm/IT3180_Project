'use server';

/**
 * @file cod.actions.ts
 * @description Server Actions cho phân hệ Thống kê Hiệu suất & Quản lý Đối soát Tiền COD (UC21, UC22).
 * Thống kê KPI trạm, Shipper nộp tiền COD cuối ca và Quản lý trạm duyệt đối soát tiền mặt.
 * @module presentation/actions/cod.actions
 */

import { USER_ROLE } from '../../domain';
import {
  GetHubStatisticsQuerySchema,
  CreateCODSettlementInputSchema,
  ReviewCODSettlementInputSchema,
  type GetHubStatisticsQueryDTO,
  type HubStatisticsOutputDTO,
  type CreateCODSettlementInputDTO,
  type ReviewCODSettlementInputDTO,
  type CODSettlementDTO,
} from '../../application/dtos/cod.dto';
import type { Result } from '../../application/interfaces';
import { failure, isFailure } from '../../application/interfaces';
import { appContainer } from '../../infrastructure/di';
import { requireAuth } from './session.helper';
import { parseActionInput } from './form-parser.helper';
import { formatZodFailure, safeRevalidatePath } from './action-utils.helper';

/** Các vai trò quản trị có quyền xem thống kê và duyệt đối soát */
const COD_MANAGEMENT_ROLES = [USER_ROLE.ADMIN, USER_ROLE.HUB_MANAGER];

/**
 * Server Action: Báo cáo & Thống kê hiệu suất trạm và KPI giao hàng của Shipper (UC21).
 *
 * @param {GetHubStatisticsQueryDTO} query Tham số lọc trạm và khoảng thời gian
 * @returns {Promise<Result<HubStatisticsOutputDTO, string>>}
 */
export async function getHubStatisticsAction(
  query: GetHubStatisticsQueryDTO
): Promise<Result<HubStatisticsOutputDTO, string>> {
  try {
    const sessionRes = await requireAuth(COD_MANAGEMENT_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const parsed = GetHubStatisticsQuerySchema.safeParse(query);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.cod.getHubStatistics().execute(
      parsed.data,
      sessionRes.data
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải báo cáo thống kê';
    return failure(`Không thể tải báo cáo thống kê: ${message}`);
  }
}

/**
 * Server Action: Tạo phiên nộp tiền COD cuối ca (Shipper bàn giao tiền) (UC22).
 * Chạy trong transaction ACID gom các đơn DELIVERED đã thu tiền để bàn giao.
 *
 * @param {CreateCODSettlementInputDTO | FormData} input Trạm, danh sách đơn và ghi chú
 * @returns {Promise<Result<CODSettlementOutputDTO, string>>}
 */
export async function createCODSettlementAction(
  input: CreateCODSettlementInputDTO | FormData
): Promise<Result<CODSettlementDTO, string>> {
  try {
    const sessionRes = await requireAuth();
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = CreateCODSettlementInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.cod.createCODSettlement().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/hub/cod-settlements');
      safeRevalidatePath('/shipper/cod-settlement');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tạo phiên nộp tiền COD';
    return failure(`Tạo phiên nộp tiền COD thất bại: ${message}`);
  }
}

/**
 * Server Action: Duyệt hoặc Từ chối phiên nộp tiền COD (Quản lý trạm đối soát) (UC22).
 *
 * @param {ReviewCODSettlementInputDTO | FormData} input ID phiên, hành động CONFIRM/REJECT và lý do từ chối
 * @returns {Promise<Result<CODSettlementOutputDTO, string>>}
 */
export async function reviewCODSettlementAction(
  input: ReviewCODSettlementInputDTO | FormData
): Promise<Result<CODSettlementDTO, string>> {
  try {
    const sessionRes = await requireAuth(COD_MANAGEMENT_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = ReviewCODSettlementInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.cod.reviewCODSettlement().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/hub/cod-settlements');
      safeRevalidatePath('/shipper/cod-settlement');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi duyệt đối soát COD';
    return failure(`Duyệt đối soát COD thất bại: ${message}`);
  }
}
