import React from 'react';
import { cn } from './utils';
import { ORDER_STATUS, type OrderStatus } from '../../../domain/constants/order-status.constant';
import { USER_ROLE, type UserRole } from '../../../domain/constants/roles.constant';
import { USER_STATUS, type UserStatus } from '../../../domain/constants/user-status.constant';
import { COD_SETTLEMENT_STATUS, type CODSettlementStatus } from '../../../domain/constants/cod-status.constant';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'sm',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  const variantStyles = {
    default: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'border border-slate-300 text-slate-700',
  };

  return (
    <span className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)} {...props}>
      {children}
    </span>
  );
};

/**
 * Badge chuyên biệt hiển thị Trạng thái Đơn hàng với mã màu logistics chuẩn.
 */
export const OrderStatusBadge: React.FC<{ status: OrderStatus; className?: string }> = ({
  status,
  className,
}) => {
  switch (status) {
    case ORDER_STATUS.CREATED:
      return <Badge variant="neutral" className={className}>Mới tạo</Badge>;
    case ORDER_STATUS.AT_HUB:
      return <Badge variant="info" className={className}>Đã nhập kho</Badge>;
    case ORDER_STATUS.OUT_FOR_DELIVERY:
      return <Badge variant="warning" className={className}>Đang giao hàng</Badge>;
    case ORDER_STATUS.DELIVERED:
      return <Badge variant="success" className={className}>Giao thành công</Badge>;
    case ORDER_STATUS.FAILED_ATTEMPT:
      return <Badge variant="danger" className={className}>Giao thất bại</Badge>;
    case ORDER_STATUS.RETURN_PENDING:
      return <Badge variant="warning" className={className}>Chờ chuyển hoàn</Badge>;
    case ORDER_STATUS.RETURNED:
      return <Badge variant="neutral" className={className}>Đã hoàn trả</Badge>;
    case ORDER_STATUS.CANCELLED:
      return <Badge variant="danger" className={className}>Đã hủy</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>;
  }
};

/**
 * Badge hiển thị Vai trò nhân sự.
 */
export const RoleBadge: React.FC<{ role: UserRole; className?: string }> = ({ role, className }) => {
  switch (role) {
    case USER_ROLE.ADMIN:
      return <Badge variant="danger" className={className}>Quản trị viên (Admin)</Badge>;
    case USER_ROLE.HUB_MANAGER:
      return <Badge variant="default" className={className}>Quản lý trạm</Badge>;
    case USER_ROLE.HUB_STAFF:
      return <Badge variant="info" className={className}>Nhân viên trạm</Badge>;
    case USER_ROLE.SHIPPER:
      return <Badge variant="warning" className={className}>Tài xế (Shipper)</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{role}</Badge>;
  }
};

/**
 * Badge hiển thị Trạng thái tài khoản người dùng.
 */
export const UserStatusBadge: React.FC<{ status: UserStatus; className?: string }> = ({
  status,
  className,
}) => {
  switch (status) {
    case USER_STATUS.ACTIVE:
      return <Badge variant="success" className={className}>Hoạt động</Badge>;
    case USER_STATUS.LOCKED:
      return <Badge variant="danger" className={className}>Đã khóa</Badge>;
    case USER_STATUS.INACTIVE:
      return <Badge variant="neutral" className={className}>Ngừng kích hoạt</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>;
  }
};

/**
 * Badge hiển thị Trạng thái Phiên đối soát COD.
 */
export const CODSettlementBadge: React.FC<{ status: CODSettlementStatus; className?: string }> = ({
  status,
  className,
}) => {
  switch (status) {
    case COD_SETTLEMENT_STATUS.PENDING:
      return <Badge variant="warning" className={className}>Chờ thủ quỹ duyệt</Badge>;
    case COD_SETTLEMENT_STATUS.CONFIRMED:
      return <Badge variant="success" className={className}>Đã nộp đủ tiền</Badge>;
    case COD_SETTLEMENT_STATUS.REJECTED:
      return <Badge variant="danger" className={className}>Bị từ chối (Lệch)</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status}</Badge>;
  }
};

