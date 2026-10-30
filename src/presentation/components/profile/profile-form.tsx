'use client';

/**
 * @file profile-form.tsx
 * @description Client Component quản trị thông tin cá nhân và đổi mật khẩu cán bộ.
 * @module presentation/components/profile
 */

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { User, Lock, ArrowLeft, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import {
  logoutAction,
  updateProfileAction,
  changePasswordAction,
} from '../../actions/auth.actions';
import { useAudioFeedback } from '../../hooks/use-audio-feedback';
import { isSuccess, isFailure, type SecurityContext } from '../../../application/interfaces';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export interface ProfileFormProps {
  readonly user: SecurityContext;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [fullName, setFullName] = useState(user.username);
  const [phone, setPhone] = useState('0988000001');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const { playSuccess, playError } = useAudioFeedback();

  const isShipper = user.role === USER_ROLE.SHIPPER;
  const backHref = isShipper ? '/shipper/deliveries' : '/orders';

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    startTransition(async () => {
      const res = await updateProfileAction({ fullName, phone });
      if (isSuccess(res)) {
        playSuccess();
        setProfileMsg({ type: 'success', text: 'Cập nhật hồ sơ cá nhân thành công!' });
      } else if (isFailure(res)) {
        playError();
        setProfileMsg({ type: 'error', text: res.error || 'Cập nhật hồ sơ thất bại' });
      }
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp!' });
      return;
    }

    startTransition(async () => {
      const res = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
      if (isSuccess(res)) {
        playSuccess();
        setPasswordMsg({ type: 'success', text: res.data.message || 'Đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (isFailure(res)) {
        playError();
        setPasswordMsg({ type: 'error', text: res.error || 'Đổi mật khẩu thất bại' });
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      window.location.href = '/login';
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Hồ Sơ Cá Nhân & Bảo Mật</h1>
            <p className="text-xs text-slate-500">
              Tài khoản: <span className="font-mono font-semibold text-slate-700">{user.username}</span> ({user.role})
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          isLoading={isPending}
          className="text-red-600 hover:bg-red-50 text-xs"
        >
          <LogOut className="w-3.5 h-3.5 mr-1" />
          Đăng xuất
        </Button>
      </div>

      {/* Profile Form */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-[#0066CC]" />
            Thông Tin Cá Nhân
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profileMsg && (
            <div
              className={`mb-4 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <Input
              label="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isPending}
            />
            <Input
              label="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isPending}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
                Lưu Thay Đổi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#0066CC]" />
            Đổi Mật Khẩu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passwordMsg && (
            <div
              className={`mb-4 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isPending}
            />
            <Input
              label="Mật khẩu mới (Tối thiểu 8 ký tự, có chữ hoa, số)"
              type="password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isPending}
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isPending}
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
                Cập Nhật Mật Khẩu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
