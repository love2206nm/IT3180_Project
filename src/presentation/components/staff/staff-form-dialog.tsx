'use client';

/**
 * @file staff-form-dialog.tsx
 * @description Hộp thoại (Modal) Thêm mới và Cập nhật hồ sơ Nhân sự (UC05, UC06).
 * Phục vụ Quản trị viên và Quản lý trạm phân quyền chức vụ và chỉ định trạm làm việc.
 * @module presentation/components/staff
 */

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { USER_ROLE, type UserRole } from '../../../domain/constants/roles.constant';
import type { CreateStaffInputDTO, UpdateStaffInputDTO, StaffItemDTO } from '../../../application/dtos/staff.dto';

export interface StaffFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: StaffItemDTO | null;
  currentHubId?: string | null;
  onSubmitCreate: (input: CreateStaffInputDTO) => Promise<void>;
  onSubmitUpdate: (input: UpdateStaffInputDTO) => Promise<void>;
  isPending?: boolean;
}

export const StaffFormDialog: React.FC<StaffFormDialogProps> = ({
  isOpen,
  onClose,
  staff,
  currentHubId,
  onSubmitCreate,
  onSubmitUpdate,
  isPending = false,
}) => {
  const isEditing = Boolean(staff);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>(USER_ROLE.SHIPPER);
  const [hubId, setHubId] = useState<string>('');

  useEffect(() => {
    if (staff) {
      setUsername(staff.username);
      setFullName(staff.fullName);
      setEmail(staff.email);
      setPhone(staff.phone);
      setRole(staff.role);
      setHubId(staff.hubId || currentHubId || '');
      setPassword('');
    } else {
      setUsername('');
      setPassword('Delivery@2026');
      setFullName('');
      setEmail('');
      setPhone('');
      setRole(USER_ROLE.SHIPPER);
      setHubId(currentHubId || '');
    }
  }, [staff, currentHubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && staff) {
      const updateData: UpdateStaffInputDTO = {
        id: staff.id,
        fullName: fullName.trim(),
        phone: phone.trim(),
        hubId: hubId.trim() || undefined,
      };
      await onSubmitUpdate(updateData);
    } else {
      const createData: CreateStaffInputDTO = {
        username: username.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        hubId: hubId.trim() || undefined,
      };
      await onSubmitCreate(createData);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Cập nhật nhân viên: ${staff?.fullName}` : 'Thêm mới nhân sự bưu cục'}
      description={
        isEditing
          ? 'Chỉnh sửa thông tin liên hệ và trạm công tác của nhân sự.'
          : 'Cấp tài khoản mới và phân quyền chức vụ trong hệ thống.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn An"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại <span className="text-rose-500">*</span>
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              required
              disabled={isPending}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đăng nhập <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="shipper.haidang"
              required
              disabled={isPending || isEditing}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email công vụ <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="an.nv@deliveryhub.vn"
              required
              disabled={isPending || isEditing}
            />
          </div>
        </div>

        {!isEditing && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu khởi tạo <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
            />
            <p className="text-[11px] text-slate-400 mt-1">Mặc định: Delivery@2026. Nhân viên có thể đổi sau khi đăng nhập.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vai trò / Chức vụ <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isPending || isEditing}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-100"
            >
              <option value={USER_ROLE.SHIPPER}>Nhân viên Giao hàng (Shipper)</option>
              <option value={USER_ROLE.HUB_STAFF}>Nhân viên Kho / Điều phối (Staff)</option>
              <option value={USER_ROLE.HUB_MANAGER}>Quản lý Trạm (Hub Manager)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã ID Trạm trực thuộc
            </label>
            <Input
              type="text"
              value={hubId}
              onChange={(e) => setHubId(e.target.value)}
              placeholder="VD: 1"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Hủy bỏ
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Đang lưu...
              </>
            ) : isEditing ? (
              <>
                <UserCheck className="w-4 h-4 mr-1.5" />
                Lưu thay đổi
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Tạo nhân viên
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
