'use server';

/**
 * @file order.actions.ts
 * @description Server Actions cho phân hệ Quản lý Đơn hàng (UC09, UC10, UC11, UC12, UC13, UC14).
 * Tiếp nhận đơn tại quầy, tìm kiếm đa tiêu chí, xem chi tiết & audit trail, sửa đơn, hủy đơn và import hàng loạt.
 * @module presentation/actions/order.actions
 */

import { USER_ROLE } from '../../domain';
import {
  CreateOrderInputSchema,
  GetOrderListQuerySchema,
  GetOrderDetailQuerySchema,
  UpdateOrderInputSchema,
  CancelOrderInputSchema,
  ImportOrdersInputSchema,
  type CreateOrderInputDTO,
  type OrderDetailDTO,
  type GetOrderListQueryDTO,
  type OrderListOutputDTO,
  type OrderDetailWithLogsDTO,
  type UpdateOrderInputDTO,
  type CancelOrderInputDTO,
  type ImportOrdersInputDTO,
  type ImportOrdersResultDTO,
} from '../../application/dtos/order.dto';
import type { Result } from '../../application/interfaces';
import { failure, success, isFailure, isSuccess } from '../../application/interfaces';
import { appContainer } from '../../infrastructure/di';
import { requireAuth } from './session.helper';
import { parseActionInput } from './form-parser.helper';
import { formatZodFailure, safeRevalidatePath } from './action-utils.helper';

/** Các vai trò được phép tạo và sửa đổi đơn hàng tại trạm */
const ORDER_OPERATOR_ROLES = [USER_ROLE.ADMIN, USER_ROLE.HUB_MANAGER, USER_ROLE.HUB_STAFF];

/** Các vai trò quản lý cấp cao có quyền hủy đơn và import hàng loạt */
const ORDER_ADMIN_ROLES = [USER_ROLE.ADMIN, USER_ROLE.HUB_MANAGER];

/**
 * Chuyển đổi các trường số liệu của đơn hàng từ chuỗi sang number (khi submit qua FormData).
 */
function coerceOrderNumericFields(data: Record<string, unknown>): void {
  if (typeof data.weightGram === 'string' && data.weightGram !== '') {
    data.weightGram = Number(data.weightGram);
  }
  if (typeof data.lengthCm === 'string' && data.lengthCm !== '') {
    data.lengthCm = Number(data.lengthCm);
  }
  if (typeof data.widthCm === 'string' && data.widthCm !== '') {
    data.widthCm = Number(data.widthCm);
  }
  if (typeof data.heightCm === 'string' && data.heightCm !== '') {
    data.heightCm = Number(data.heightCm);
  }
  if (typeof data.codAmount === 'string' && data.codAmount !== '') {
    data.codAmount = Number(data.codAmount);
  }
  if (typeof data.shippingFee === 'string' && data.shippingFee !== '') {
    data.shippingFee = Number(data.shippingFee);
  }
}

/**
 * Server Action: Tiếp nhận / Tạo mới đơn hàng tại quầy bưu cục (UC09).
 * Tự động tính cước thể tích và sinh mã vận đơn TRK duy nhất trong transaction.
 *
 * @param {CreateOrderInputDTO | FormData} input Dữ liệu tạo đơn hàng
 * @returns {Promise<Result<OrderDetailDTO, string>>}
 */
export async function createOrderAction(
  input: CreateOrderInputDTO | FormData
): Promise<Result<OrderDetailDTO, string>> {
  try {
    const sessionRes = await requireAuth(ORDER_OPERATOR_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    coerceOrderNumericFields(rawData);

    const parsed = CreateOrderInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.orders.createOrder().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/orders');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống khi tạo đơn hàng';
    return failure(`Tạo đơn hàng thất bại: ${message}`);
  }
}

/**
 * Server Action: Tìm kiếm và lọc danh sách đơn hàng phân trang (UC10).
 * Tự động áp dụng phân quyền Hub Isolation chống rò rỉ dữ liệu đa trạm.
 *
 * @param {GetOrderListQueryDTO} query Tham số tìm kiếm và bộ lọc
 * @returns {Promise<Result<OrderListOutputDTO, string>>}
 */
export async function getOrderListAction(
  query: GetOrderListQueryDTO
): Promise<Result<OrderListOutputDTO, string>> {
  try {
    const sessionRes = await requireAuth();
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const parsed = GetOrderListQuerySchema.safeParse(query);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.orders.getOrderList().execute(
      parsed.data,
      sessionRes.data
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải danh sách đơn hàng';
    return failure(`Không thể tải danh sách đơn hàng: ${message}`);
  }
}

/**
 * Server Action: Xem chi tiết đơn hàng kèm dòng thời gian lịch sử kiểm vết bất biến (UC11).
 *
 * @param {{ identifier: string } | FormData | string} input Mã vận đơn TRK hoặc ID đơn
 * @returns {Promise<Result<OrderDetailWithLogsDTO, string>>}
 */
export async function getOrderDetailAction(
  input: { identifier: string } | FormData | string
): Promise<Result<OrderDetailWithLogsDTO, string>> {
  try {
    const sessionRes = await requireAuth();
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    let rawIdentifier: unknown;
    if (typeof input === 'string') {
      rawIdentifier = { identifier: input };
    } else {
      rawIdentifier = parseActionInput(input);
    }

    const parsed = GetOrderDetailQuerySchema.safeParse(rawIdentifier);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.orders.getOrderDetail().execute(
      { idOrTrackingCode: parsed.data.identifier },
      sessionRes.data
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi lấy chi tiết đơn hàng';
    return failure(`Không thể tải chi tiết đơn hàng: ${message}`);
  }
}

/**
 * Server Action: Chỉnh sửa thông tin đơn hàng trước khi xuất kho đi phát (UC12).
 *
 * @param {UpdateOrderInputDTO | FormData} input Dữ liệu cập nhật
 * @returns {Promise<Result<OrderDetailDTO, string>>}
 */
export async function updateOrderAction(
  input: UpdateOrderInputDTO | FormData
): Promise<Result<OrderDetailDTO, string>> {
  try {
    const sessionRes = await requireAuth(ORDER_OPERATOR_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = UpdateOrderInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.orders.updateOrder().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/orders');
      safeRevalidatePath(`/orders/${result.data.trackingCode}`);
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật đơn hàng';
    return failure(`Cập nhật đơn hàng thất bại: ${message}`);
  }
}

/**
 * Server Action: Hủy đơn hàng kèm lý do kiểm vết (UC13).
 *
 * @param {CancelOrderInputDTO | FormData} input ID đơn hàng và lý do hủy
 * @returns {Promise<Result<{ message: string }, string>>}
 */
export async function cancelOrderAction(
  input: CancelOrderInputDTO | FormData
): Promise<Result<{ message: string }, string>> {
  try {
    const sessionRes = await requireAuth(ORDER_ADMIN_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = CancelOrderInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.orders.cancelOrder().execute(
      parsed.data,
      sessionRes.data
    );

    if (isSuccess(result)) {
      safeRevalidatePath('/orders');
      return success({ message: 'Hủy đơn hàng thành công' });
    }

    return failure(result.error);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi hủy đơn hàng';
    return failure(`Hủy đơn hàng thất bại: ${message}`);
  }
}

/**
 * Server Action: Nhập danh sách đơn hàng hàng loạt từ file Excel/CSV (UC14).
 *
 * @param {ImportOrdersInputDTO | FormData} input Danh sách đơn hàng cần nhập
 * @returns {Promise<Result<ImportOrdersOutputDTO, string>>}
 */
export async function importOrdersAction(
  input: ImportOrdersInputDTO | FormData
): Promise<Result<ImportOrdersResultDTO, string>> {
  try {
    const sessionRes = await requireAuth(ORDER_ADMIN_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);

    // Xử lý danh sách đơn con nếu được parse từ FormData JSON
    if (Array.isArray(rawData.orders)) {
      for (const ord of rawData.orders) {
        if (typeof ord === 'object' && ord !== null) {
          coerceOrderNumericFields(ord as Record<string, unknown>);
        }
      }
    }

    const parsed = ImportOrdersInputSchema.safeParse(rawData);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.orders.importOrders().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/orders');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi import đơn hàng loạt';
    return failure(`Import đơn hàng thất bại: ${message}`);
  }
}
