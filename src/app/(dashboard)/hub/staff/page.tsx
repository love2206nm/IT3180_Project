'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, ArrowLeft, UserPlus, Lock, Unlock, MapPin, CheckCircle2, AlertCircle, Edit } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { RoleBadge, UserStatusBadge } from '../../../../presentation/components/ui/badge';
import { StaffFormDialog } from '../../../../presentation/components/staff/staff-form-dialog';
import { USER_ROLE, type UserRole } from '../../../../domain/constants/roles.constant';
import { USER_STATUS, type UserStatus } from '../../../../domain/constants/user-status.constant';
import { useServerAction } from '../../../../presentation/hooks/use-server-action';
import { useAudioFeedback } from '../../../../presentation/hooks/use-audio-feedback';
import {
  createStaffAction,
  updateStaffAction,
  toggleStaffStatusAction,
} from '../../../../presentation/actions/staff.actions';
import type { CreateStaffInputDTO, UpdateStaffInputDTO, StaffItemDTO } from '../../../../application/dtos/staff.dto';

const INITIAL_STAFF_LIST: StaffItemDTO[] = [
  {
    id: 'usr-01',
    username: 'mock_manager',
    fullName: 'Trần Văn Quản Lý',
    email: 'manager.hn@deliveryhub.vn',
    phone: '0988000001',
    role: USER_ROLE.HUB_MANAGER,
    status: USER_STATUS.ACTIVE,
    hubId: '1',
    hubName: 'Bưu cục Trung tâm Hà Nội',
    createdAt: new Date(),
    lastLoginAt: null,
  },
  {
    id: 'usr-02',
    username: 'mock_staff',
    fullName: 'Lê Thị Điều Phối',
    email: 'dieuphoi.hn@deliveryhub.vn',
    phone: '0988000002',
    role: USER_ROLE.HUB_STAFF,
    status: USER_STATUS.ACTIVE,
    hubId: '1',
    hubName: 'Bưu cục Trung tâm Hà Nội',
    createdAt: new Date(),
    lastLoginAt: null,
  },
  {
    id: 'usr-03',
    username: 'mock_shipper1',
    fullName: 'Nguyễn Văn Giao Hàng',
    email: 'shipper1@deliveryhub.vn',
    phone: '0988000003',
    role: USER_ROLE.SHIPPER,
    status: USER_STATUS.ACTIVE,
    hubId: '1',
    hubName: 'Bưu cục Trung tâm Hà Nội',
    createdAt: new Date(),
    lastLoginAt: null,
  },
  {
    id: 'usr-04',
    username: 'mock_shipper2',
    fullName: 'Hoàng Văn Vận Chuyển',
    email: 'shipper2@deliveryhub.vn',
    phone: '0988000004',
    role: USER_ROLE.SHIPPER,
    status: USER_STATUS.ACTIVE,
    hubId: '1',
    hubName: 'Bưu cục Trung tâm Hà Nội',
    createdAt: new Date(),
    lastLoginAt: null,
  },
];

export default function HubStaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffItemDTO[]>(INITIAL_STAFF_LIST);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItemDTO | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  // Action Tạo nhân sự (UC05)
  const { execute: executeCreate, isPending: isCreatePending } = useServerAction(createStaffAction, {
    onSuccess: (data) => {
      playSuccess();
      const created: StaffItemDTO = {
        id: data.id,
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role as UserRole,
        status: data.status as UserStatus,
        hubId: data.hubId ?? null,
        hubName: 'Bưu cục Trung tâm',
        createdAt: new Date(),
    lastLoginAt: null,
      };
      setStaffList((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setNotification({
        type: 'success',
        message: `Đã khởi tạo tài khoản nhân sự ${data.fullName} thành công!`,
      });
    },
    onError: (err) => {
      playError();
      setNotification({
        type: 'error',
        message: `Không thể tạo nhân sự: ${err}`,
      });
    },
  });

  // Action Cập nhật nhân sự (UC06)
  const { execute: executeUpdate, isPending: isUpdatePending } = useServerAction(updateStaffAction, {
    onSuccess: (data) => {
      playSuccess();
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === data.id
            ? {
                ...s,
                fullName: data.fullName,
                phone: data.phone,
                hubId: data.hubId ?? null,
              }
            : s
        )
      );
      setIsModalOpen(false);
      setSelectedStaff(null);
      setNotification({
        type: 'success',
        message: `Đã cập nhật thông tin nhân sự ${data.fullName} thành công!`,
      });
    },
    onError: (err) => {
      playError();
      setNotification({
        type: 'error',
        message: `Cập nhật thất bại: ${err}`,
      });
    },
  });

  // Action Khóa / Mở khóa tài khoản (UC07)
  const { execute: executeToggleStatus, isPending: isTogglePending } = useServerAction(
    toggleStaffStatusAction,
    {
      onSuccess: (data) => {
        playSuccess();
        setStaffList((prev) =>
          prev.map((s) => (s.id === data.id ? { ...s, status: data.status } : s))
        );
        setNotification({
          type: 'success',
          message: data.message,
        });
      },
      onError: (err) => {
        playError();
        setNotification({
          type: 'error',
          message: `Không thể thay đổi trạng thái tài khoản: ${err}`,
        });
      },
    }
  );

  const handleOpenCreateModal = () => {
    setSelectedStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff: StaffItemDTO) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (staff: StaffItemDTO) => {
    const targetStatus =
      staff.status === USER_STATUS.ACTIVE ? USER_STATUS.LOCKED : USER_STATUS.ACTIVE;
    await executeToggleStatus({
      id: staff.id,
      status: targetStatus,
    });
  };

  const handleSubmitCreate = async (input: CreateStaffInputDTO) => {
    await executeCreate(input);
  };

  const handleSubmitUpdate = async (input: UpdateStaffInputDTO) => {
    await executeUpdate(input);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/hub/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Quản Trị Nhân Sự & Phân Quyền Bưu Cục (UC04 - UC08)
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý tài khoản cán bộ điều phối, tài xế giao hàng và phân quyền chức vụ trong bưu cục
            </p>
          </div>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Thêm Nhân Sự Mới (UC05)
        </Button>
      </div>

      {/* Thông báo thao tác */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Staff Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên Đăng Nhập</TableHead>
            <TableHead>Họ Và Tên</TableHead>
            <TableHead>Email Công Vụ</TableHead>
            <TableHead>Số Điện Thoại</TableHead>
            <TableHead>Chức Vụ</TableHead>
            <TableHead>Trực Thuộc</TableHead>
            <TableHead>Trạng Thái</TableHead>
            <TableHead className="text-right">Thao Tác</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {staffList.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell className="font-mono font-bold text-slate-900">{staff.username}</TableCell>
              <TableCell className="font-semibold text-slate-900 text-xs">{staff.fullName}</TableCell>
              <TableCell className="text-xs text-slate-500">{staff.email}</TableCell>
              <TableCell className="font-mono text-slate-500 text-xs">{staff.phone}</TableCell>
              <TableCell>
                <RoleBadge role={staff.role} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{staff.hubName || `Trạm #${staff.hubId || 'Chưa gán'}`}</span>
                </div>
              </TableCell>
              <TableCell>
                <UserStatusBadge status={staff.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(staff)}
                    disabled={isTogglePending}
                    className="h-7 text-xs px-2"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Sửa
                  </Button>

                  <Button
                    variant={staff.status === USER_STATUS.ACTIVE ? 'destructive' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleStatus(staff)}
                    disabled={isTogglePending}
                    className="h-7 text-xs px-2"
                  >
                    {staff.status === USER_STATUS.ACTIVE ? (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Khóa
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 mr-1" />
                        Mở
                      </>
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal Thêm mới và Chỉnh sửa hồ sơ Nhân sự (UC05, UC06) */}
      <StaffFormDialog
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStaff(null);
        }}
        staff={selectedStaff}
        currentHubId="1"
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={handleSubmitUpdate}
        isPending={isCreatePending || isUpdatePending}
      />
    </div>
  );
}
