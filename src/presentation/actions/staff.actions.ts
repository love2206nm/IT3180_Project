'use server';

/**
 * @file staff.actions.ts
 * @description Server Actions cho phân hệ Quản lý Nhân sự & Phân quyền (UC04, UC05, UC06, UC07, UC08).
 * Quản lý danh sách nhân viên, thêm mới, sửa thông tin, khóa tài khoản và phân tuyến cho Shipper.
 * @module presentation/actions/staff.actions
 */

import { USER_ROLE } from '../../domain';
import { USER_STATUS, type UserStatus } from '../../domain/constants/user-status.constant';
import {
  GetStaffListQuerySchema,
  CreateStaffInputSchema,
  UpdateStaffInputSchema,
  ToggleStaffStatusInputSchema,
  AssignShipperZoneInputSchema,
  type GetStaffListQueryDTO,
  type StaffListOutputDTO,
  type CreateStaffInputDTO,
  type StaffItemDTO,
  type UpdateStaffInputDTO,
  type ToggleStaffStatusInputDTO,
  type AssignShipperZoneInputDTO,
  type ShipperZoneAssignmentOutputDTO,
} from '../../application/dtos/staff.dto';
import type { Result } from '../../application/interfaces';
import { failure, success, isFailure, isSuccess } from '../../application/interfaces';
import { appContainer } from '../../infrastructure/di';
import { requireAuth } from './session.helper';
import { parseActionInput } from './form-parser.helper';
import { formatZodFailure, safeRevalidatePath } from './action-utils.helper';

/** Các vai trò quản trị có quyền truy cập module nhân sự */
const STAFF_MANAGEMENT_ROLES = [USER_ROLE.ADMIN, USER_ROLE.HUB_MANAGER];

/**
 * Server Action: Lấy danh sách nhân viên phân trang có lọc theo tiêu chí (UC04).
 *
 * @param {GetStaffListQueryDTO} query Tham số lọc và phân trang
 * @returns {Promise<Result<StaffListOutputDTO, string>>}
 */
export async function getStaffListAction(
  query: GetStaffListQueryDTO
): Promise<Result<StaffListOutputDTO, string>> {
  try {
    const sessionRes = await requireAuth(STAFF_MANAGEMENT_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const parsed = GetStaffListQuerySchema.safeParse(query);
    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.staff.getStaffList().execute(
      parsed.data,
      sessionRes.data
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi hệ thống khi tải danh sách nhân viên';
    return failure(`Không thể tải danh sách nhân viên: ${message}`);
  }
}

/**
 * Server Action: Tạo mới tài khoản nhân viên (UC05).
 *
 * @param {CreateStaffInputDTO | FormData} input Dữ liệu tạo nhân viên
 * @returns {Promise<Result<StaffItemDTO, string>>}
 */
export async function createStaffAction(
  input: CreateStaffInputDTO | FormData
): Promise<Result<StaffItemDTO, string>> {
  try {
    const sessionRes = await requireAuth(STAFF_MANAGEMENT_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = CreateStaffInputSchema.safeParse(rawData);

    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.staff.createStaff().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/admin/staff');
      safeRevalidatePath('/hub/staff');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tạo tài khoản nhân viên';
    return failure(`Thêm nhân viên thất bại: ${message}`);
  }
}

/**
 * Server Action: Cập nhật thông tin nhân viên (UC06).
 *
 * @param {UpdateStaffInputDTO | FormData} input Dữ liệu cập nhật
 * @returns {Promise<Result<StaffItemDTO, string>>}
 */
export async function updateStaffAction(
  input: UpdateStaffInputDTO | FormData
): Promise<Result<StaffItemDTO, string>> {
  try {
    const sessionRes = await requireAuth(STAFF_MANAGEMENT_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = UpdateStaffInputSchema.safeParse(rawData);

    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.staff.updateStaff().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/admin/staff');
      safeRevalidatePath('/hub/staff');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi cập nhật thông tin nhân viên';
    return failure(`Cập nhật nhân viên thất bại: ${message}`);
  }
}

/**
 * Server Action: Khóa hoặc mở khóa tài khoản nhân viên (UC07).
 *
 * @param {ToggleStaffStatusInputDTO | FormData} input ID nhân viên và trạng thái mới
 * @returns {Promise<Result<{ message: string }, string>>}
 */
export async function toggleStaffStatusAction(
  input: ToggleStaffStatusInputDTO | FormData
): Promise<Result<{ id: string; status: UserStatus; message: string }, string>> {
  try {
    const sessionRes = await requireAuth(STAFF_MANAGEMENT_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = ToggleStaffStatusInputSchema.safeParse(rawData);

    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.staff.toggleStaffStatus().execute(
      parsed.data,
      sessionRes.data
    );

    if (isSuccess(result)) {
      safeRevalidatePath('/admin/staff');
      safeRevalidatePath('/hub/staff');
      return success({
        id: result.data.id,
        status: result.data.status,
        message:
          result.data.status === USER_STATUS.ACTIVE
            ? 'Mở khóa tài khoản nhân viên thành công'
            : 'Đã khóa tài khoản nhân viên',
      });
    }

    return failure(result.error);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi đổi trạng thái tài khoản';
    return failure(`Đổi trạng thái tài khoản thất bại: ${message}`);
  }
}

/**
 * Server Action: Phân bổ tuyến giao hàng cho Shipper (UC08).
 *
 * @param {AssignShipperZoneInputDTO | FormData} input ID Shipper và ID Tuyến
 * @returns {Promise<Result<{ message: string }, string>>}
 */
export async function assignShipperZoneAction(
  input: AssignShipperZoneInputDTO | FormData
): Promise<Result<{ message: string }, string>> {
  try {
    const sessionRes = await requireAuth(STAFF_MANAGEMENT_ROLES);
    if (isFailure(sessionRes)) {
      return failure(sessionRes.error);
    }

    const rawData = parseActionInput(input);
    const parsed = AssignShipperZoneInputSchema.safeParse(rawData);

    if (!parsed.success) {
      return formatZodFailure(parsed.error);
    }

    const result = await appContainer.staff.assignShipperZone().execute(
      parsed.data,
      sessionRes.data
    );

    if (result.success) {
      safeRevalidatePath('/hub/shippers');
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi phân tuyến cho Shipper';
    return failure(`Phân tuyến Shipper thất bại: ${message}`);
  }
}
