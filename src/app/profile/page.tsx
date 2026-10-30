'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { User, Lock, ArrowLeft, CheckCircle2, AlertCircle, Shield, LogOut } from 'lucide-react';
import { Button } from '../../presentation/components/ui/button';
import { Input } from '../../presentation/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../../presentation/components/ui/card';
import { logoutAction } from '../../presentation/actions/auth.actions';

export default function ProfilePage() {
  const [fullName, setFullName] = useState('Nguyễn Văn Giao Hàng');
  const [phone, setPhone] = useState('0988000003');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('Cập nhật hồ sơ cá nhân thành công! (UC03)');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    setPasswordMsg('Đổi mật khẩu thành công! (UC02)');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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
          <Link href="/shipper/deliveries">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Hồ Sơ Cá Nhân & Bảo Mật (UC02, UC03)</h1>
        </div>

        <Button variant="outline" size="sm" onClick={handleLogout} isLoading={isPending} className="text-red-600 hover:bg-red-50 text-xs">
          <LogOut className="w-3.5 h-3.5 mr-1" />
          Đăng xuất
        </Button>
      </div>

      {/* Profile Form */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Thông Tin Cá Nhân (UC03)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profileMsg && (
            <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{profileMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <Input
              label="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm">
                Lưu Thay Đổi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Đổi Mật Khẩu (UC02)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {passwordMsg && (
            <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{passwordMsg}</span>
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
            />
            <Input
              label="Mật khẩu mới (Tối thiểu 8 ký tự, có chữ hoa, số)"
              type="password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="sm">
                Cập Nhật Mật Khẩu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

