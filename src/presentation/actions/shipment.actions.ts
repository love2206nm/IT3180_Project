'use server';

/**
 * @file shipment.actions.ts
 * @description Server Actions cho phân hệ Điều phối & Vòng đời Vận chuyển (UC15, UC16, UC17, UC18, UC19, UC20).
 * Quét mã nhập kho trạm, gán đơn cho Shipper, giao thành công (POD + COD), báo giao thất bại và xử lý đơn hoàn.
 * @module presentation/actions/shipment.actions
 */

import { USER_ROLE } from '../../domain';
import {
  CheckInHubInputSchema,
  AssignOrdersToShipperInputSchema,
  MarkDeliveredInputSchema,
  MarkFailedAttemptInputSchema,
  ProcessReturnOrderInputSchema,
  type CheckInHubInputDTO,
  type AssignOrdersToShipperInputDTO,
  type AssignOrdersResultDTO,
  type MarkDeliveredInputDTO,
  type MarkFailedAttemptInputDTO,
  type ProcessReturnOrderInputDTO,
} from '../../application/dtos/shipment.dto';
import type { Result } from '../../application/interfaces';
import { failure, isFailure } from '../../application/interfaces';
import type { OrderStatus } from '../../domain/constants/order-status.constant';
import { appContainer } from '../../infrastructure/di';
import { requireAuth } from './session.helper';
import { parseActionInput } from './form-parser.helper';
import { formatZodFailure, safeRevalidatePath } from './action-utils.helper';

/** Các vai trò quản lý điều phối kho bưu cục */
const HUB_OPERATOR_ROLES = [USER_ROLE.ADMIN, USER_ROLE.HUB_MANAGER, USER_ROLE.HUB_STAFF];

/** Các vai trò có thể thao tác phát hàng ngoài hiện trường */
const DELIVERY_EXECUTION_ROLES = [USER_ROLE.SHIPPER, USER_ROLE.ADMIN];

/**
 * Server Action: Quét mã Inbound nhập kho trạm (UC15).
 * Chuyển trạng thái đơn sang AT_HUB và tạo bản ghi kiểm vết.
 *
 * @param {CheckInHubInputDTO | FormData} input Mã vận đơn và ID trạm tiếp nhận
 * @returns {Promise<Result<{ orderId: string; trackingCode: string; status: string; hubName: string }, string>>}
 */
export async function checkInHubAction(
  input: CheckInHubInputDTO | FormData
): Promise<Result<{ orderId: string; trackingCode: string; status: string; hubName: string }, string>> {
  try {
    const sessionRes = await requireAuth(HUB_OPERATOR_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    if (!rawData.hubId && sessionRes.data.hubId) {
      rawData.hubId = String(sessionRes.data.hubId);
    }
    const parsed = CheckInHubInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.shipments.checkInHub().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/shipments/inbound');
      safeRevalidatePath('/orders');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi quét mã nhập kho';
    return failure(`Nhập kho thất bại: ${message}`);
  }
}

/**
 * Server Action: Bàn giao và phân công đơn hàng cho Shipper đi phát (UC16).
 * Chạy trong transaction ACID cập nhật hàng loạt đơn sang OUT_FOR_DELIVERY.
 *
 * @param {AssignOrdersToShipperInputDTO | FormData} input Danh sách đơn và ID Shipper
 * @returns {Promise<Result<AssignOrdersResultDTO, string>>}
 */
export async function assignOrdersToShipperAction(
  input: AssignOrdersToShipperInputDTO | FormData
): Promise<Result<AssignOrdersResultDTO, string>> {
  try {
    const sessionRes = await requireAuth(HUB_OPERATOR_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    if (!rawData.hubId && sessionRes.data.hubId) {
      rawData.hubId = String(sessionRes.data.hubId);
    }
    const parsed = AssignOrdersToShipperInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.shipments.assignOrdersToShipper().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/shipments/dispatch');
      safeRevalidatePath('/shipper/deliveries');
      safeRevalidatePath('/orders');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi bàn giao đơn cho Shipper';
    return failure(`Bàn giao đơn thất bại: ${message}`);
  }
}

/**
 * Server Action: Xác nhận giao hàng thành công, thu COD và lưu ảnh POD (UC17, UC18).
 * Áp dụng Anti-BOLA: Chỉ đúng Shipper phụ trách mới có quyền hoàn tất đơn.
 *
 * @param {MarkDeliveredInputDTO | FormData} input Dữ liệu giao hàng (ảnh POD, tiền COD, GPS)
 * @returns {Promise<Result<{ orderId: string; status: string; codCollected: number }, string>>}
 */
export async function markDeliveredAction(
  input: MarkDeliveredInputDTO | FormData
): Promise<Result<{ orderId: string; status: string; codCollected: number }, string>> {
  try {
    const sessionRes = await requireAuth(DELIVERY_EXECUTION_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    if (typeof rawData.codCollected === 'string' && rawData.codCollected !== '') {
      rawData.codCollected = Number(rawData.codCollected);
    }
    if (typeof rawData.locationLat === 'string' && rawData.locationLat !== '') {
      rawData.locationLat = Number(rawData.locationLat);
    }
    if (typeof rawData.locationLng === 'string' && rawData.locationLng !== '') {
      rawData.locationLng = Number(rawData.locationLng);
    }

    const parsed = MarkDeliveredInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.shipments.markDelivered().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/shipper/deliveries');
      safeRevalidatePath('/orders');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi xác nhận giao hàng';
    return failure(`Xác nhận giao hàng thất bại: ${message}`);
  }
}

/**
 * Server Action: Báo giao hàng không thành công & quản trị vòng đời tái phát/chuyển hoàn (UC19).
 * Tự động chuyển RETURN_PENDING nếu khách từ chối vĩnh viễn hoặc giao hỏng quá 3 lần.
 *
 * @param {MarkFailedAttemptInputDTO | FormData} input Lý do thất bại và ảnh bằng chứng
 * @returns {Promise<Result<{ orderId: string; status: string; deliveryAttempts: number; isReturnPending: boolean }, string>>}
 */
export async function markFailedAttemptAction(
  input: MarkFailedAttemptInputDTO | FormData
): Promise<Result<{ orderId: string; status: string; deliveryAttempts: number; isReturnPending: boolean }, string>> {
  try {
    const sessionRes = await requireAuth(DELIVERY_EXECUTION_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    if (typeof rawData.locationLat === 'string' && rawData.locationLat !== '') {
      rawData.locationLat = Number(rawData.locationLat);
    }
    if (typeof rawData.locationLng === 'string' && rawData.locationLng !== '') {
      rawData.locationLng = Number(rawData.locationLng);
    }

    const parsed = MarkFailedAttemptInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.shipments.markFailedAttempt().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/shipper/deliveries');
      safeRevalidatePath('/orders');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi báo giao thất bại';
    return failure(`Báo giao thất bại: ${message}`);
  }
}

/**
 * Server Action: Xử lý và hoàn tất chuyển hoàn đơn hàng về người gửi (UC20).
 *
 * @param {ProcessReturnOrderInputDTO | FormData} input ID đơn hàng và ID trạm hoàn
 * @returns {Promise<Result<{ orderId: string; trackingCode: string; status: string }, string>>}
 */
export async function processReturnOrderAction(
  input: ProcessReturnOrderInputDTO | FormData
): Promise<Result<{ orderId: string; status: OrderStatus }, string>> {
  try {
    const sessionRes = await requireAuth(HUB_OPERATOR_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = ProcessReturnOrderInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.shipments.processReturnOrder().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/shipments/returns');
      safeRevalidatePath('/orders');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi xử lý chuyển hoàn đơn hàng';
    return failure(`Chuyển hoàn đơn hàng thất bại: ${message}`);
  }
}
