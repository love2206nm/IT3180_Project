'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ArrowLeft, UserPlus, Lock, Unlock, MapPin, CheckCircle2, AlertCircle, Edit, Navigation } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { RoleBadge, UserStatusBadge } from '../../../../presentation/components/ui/badge';
import { Dialog } from '../../../../presentation/components/ui/dialog';
import { Input } from '../../../../presentation/components/ui/input';
import { StaffFormDialog } from '../../../../presentation/components/staff/staff-form-dialog';
import { USER_ROLE, type UserRole } from '../../../../domain/constants/roles.constant';
import { USER_STATUS, type UserStatus } from '../../../../domain/constants/user-status.constant';
import { useServerAction } from '../../../../presentation/hooks/use-server-action';
import { useAudioFeedback } from '../../../../presentation/hooks/use-audio-feedback';
import {
  getStaffListAction,
  createStaffAction,
  updateStaffAction,
  toggleStaffStatusAction,
  assignShipperZoneAction,
} from '../../../../presentation/actions/staff.actions';
import type { CreateStaffInputDTO, UpdateStaffInputDTO, StaffItemDTO } from '../../../../application/dtos/staff.dto';

export default function HubStaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffItemDTO[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffItemDTO | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Assign Zone State
  const [isAssignZoneOpen, setIsAssignZoneOpen] = useState(false);
  const [selectedShipper, setSelectedShipper] = useState<StaffItemDTO | null>(null);
  const [zoneIdInput, setZoneIdInput] = useState('81');

  const { playSuccess, playError } = useAudioFeedback();

  // Load staff list from real DB
  const loadStaffList = async () => {
    setIsLoadingList(true);
    const res = await getStaffListAction({ page: 1, limit: 50 });
    if (res.success) {
      setStaffList(res.data.items);
    }
    setIsLoadingList(false);
  };

  useEffect(() => {
    loadStaffList();
  }, []);

  // Action Tạo nhân sự
  const { execute: executeCreate, isPending: isCreatePending } = useServerAction(createStaffAction, {
    onSuccess: (data) => {
      playSuccess();
      setIsModalOpen(false);
      setNotification({
        type: 'success',
        message: `Đã khởi tạo tài khoản nhân sự ${data.fullName} thành công!`,
      });
      loadStaffList();
    },
    onError: (err) => {
      playError();
      setNotification({
        type: 'error',
        message: `Không thể tạo nhân sự: ${err}`,
      });
    },
  });

  // Action Cập nhật nhân sự
  const { execute: executeUpdate, isPending: isUpdatePending } = useServerAction(updateStaffAction, {
    onSuccess: (data) => {
      playSuccess();
      setIsModalOpen(false);
      setSelectedStaff(null);
      setNotification({
        type: 'success',
        message: `Đã cập nhật thông tin nhân sự ${data.fullName} thành công!`,
      });
      loadStaffList();
    },
    onError: (err) => {
      playError();
      setNotification({
        type: 'error',
        message: `Cập nhật thất bại: ${err}`,
      });
    },
  });

  // Action Khóa / Mở khóa tài khoản
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

  // Action Gán Tuyến Giao Hàng Cho Shipper
  const { execute: executeAssignZone, isPending: isAssignZonePending } = useServerAction(
    assignShipperZoneAction,
    {
      onSuccess: (data) => {
        playSuccess();
        setIsAssignZoneOpen(false);
        setSelectedShipper(null);
        setNotification({
          type: 'success',
          message: data.message,
        });
      },
      onError: (err) => {
        playError();
        setNotification({
          type: 'error',
          message: `Gán tuyến thất bại: ${err}`,
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
    const isLocking = staff.status === USER_STATUS.ACTIVE;
    const nextStatus = isLocking ? USER_STATUS.INACTIVE : USER_STATUS.ACTIVE;
    const confirmMessage = isLocking
      ? `Bạn có chắc chắn muốn khóa tài khoản "${staff.fullName}"?`
      : `Bạn có muốn kích hoạt lại tài khoản "${staff.fullName}"?`;

    if (window.confirm(confirmMessage)) {
      await executeToggleStatus({ id: staff.id, status: nextStatus });
    }
  };

  const handleSubmitCreate = async (formData: CreateStaffInputDTO) => {
    await executeCreate(formData);
  };

  const handleSubmitUpdate = async (formData: UpdateStaffInputDTO) => {
    await executeUpdate(formData);
  };

  const handleOpenAssignZone = (staff: StaffItemDTO) => {
    setSelectedShipper(staff);
    setZoneIdInput(staff.hubId ? String(staff.hubId) : '81');
    setIsAssignZoneOpen(true);
  };

  const handleConfirmAssignZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipper) return;
    await executeAssignZone({
      shipperId: selectedShipper.id,
      zoneId: zoneIdInput.trim(),
    });
  };

  return (
    <div className="space-y-6">
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
              Quản Trị Nhân Sự & Phân Quyền Bưu Cục
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý tài khoản cán bộ điều phối, tài xế giao hàng và phân quyền chức vụ trong bưu cục
            </p>
          </div>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Thêm Nhân Sự Mới
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
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Bảng nhân sự */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã / Họ và Tên</TableHead>
            <TableHead>Tài Khoản / Email</TableHead>
            <TableHead>Vai Trò Vận Hành</TableHead>
            <TableHead>Bưu Cục Quản Lý</TableHead>
            <TableHead>Trạng Thái</TableHead>
            <TableHead className="text-right">Thao Tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingList ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                Đang tải danh sách nhân sự...
              </TableCell>
            </TableRow>
          ) : staffList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                Chưa có nhân sự nào được cấu hình
              </TableCell>
            </TableRow>
          ) : (
            staffList.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{staff.fullName}</div>
                  <div className="text-[11px] text-slate-400 font-mono">ID: {staff.id}</div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-slate-700">{staff.username}</div>
                  <div className="text-[11px] text-slate-400">{staff.email}</div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={staff.role} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{staff.hubName || (staff.hubId ? `Bưu cục #${staff.hubId}` : 'Chưa gán')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <UserStatusBadge status={staff.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    {staff.role === USER_ROLE.SHIPPER && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenAssignZone(staff)}
                        className="h-7 text-xs px-2"
                        title="Gán tuyến giao hàng"
                      >
                        <Navigation className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Tuyến
                      </Button>
                    )}

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
            ))
          )}
        </TableBody>
      </Table>

      {/* Modal Thêm mới và Chỉnh sửa hồ sơ Nhân sự */}
      <StaffFormDialog
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStaff(null);
        }}
        staff={selectedStaff}
        currentHubId={selectedStaff?.hubId ?? '81'}
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={handleSubmitUpdate}
        isPending={isCreatePending || isUpdatePending}
      />

      {/* Modal Gán Tuyến Giao Hàng Cho Shipper */}
      <Dialog
        isOpen={isAssignZoneOpen}
        onClose={() => {
          setIsAssignZoneOpen(false);
          setSelectedShipper(null);
        }}
        title={`Phân Tuyến Giao Hàng Cho ${selectedShipper?.fullName ?? 'Shipper'}`}
        description="Gán địa bàn hoạt động / tuyến đường cố định cho tài xế để tối ưu quãng đường giao hàng."
        size="sm"
      >
        <form onSubmit={handleConfirmAssignZone} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn Tuyến Giao Hàng
            </label>
            <select
              value={zoneIdInput}
              onChange={(e) => setZoneIdInput(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="81">Tuyến 81: Tuyến Dịch Vọng Hậu (MOCK-ZONE-HN-01)</option>
              <option value="82">Tuyến 82: Tuyến Mai Dịch (MOCK-ZONE-HN-02)</option>
              <option value="3">Tuyến 3: Tuyến Dịch Vọng Hậu (ZONE-CG-01)</option>
              <option value="4">Tuyến 4: Tuyến Mai Dịch (ZONE-CG-02)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAssignZoneOpen(false);
                setSelectedShipper(null);
              }}
              disabled={isAssignZonePending}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isAssignZonePending}>
              Xác Nhận Phân Tuyến
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
