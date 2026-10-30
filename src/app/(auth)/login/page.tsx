'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Package, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../../presentation/components/ui/button';
import { Input } from '../../../presentation/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../presentation/components/ui/card';
import { loginAction } from '../../../presentation/actions/auth.actions';
import { isFailure } from '../../../application/interfaces';
import { USER_ROLE } from '../../../domain/constants/roles.constant';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors(undefined);

    startTransition(async () => {
      const result = await loginAction({
        usernameOrEmail: usernameOrEmail.trim(),
        password,
      });

      if (isFailure(result)) {
        setErrorMessage(result.error);
        setFieldErrors(result.fieldErrors);
        return;
      }

      // Điều hướng thông minh theo vai trò
      const role = result.data.user.role;
      if (role === USER_ROLE.SHIPPER) {
        window.location.href = '/shipper/deliveries';
      } else {
        window.location.href = '/hub/dashboard';
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Back Link */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Về Trang Chủ
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon Header */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
            <Package className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          DeliveryHub System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Cổng đăng nhập tác nghiệp dành cho Cán bộ điều phối, Quản lý & Tài xế
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Đăng Nhập Tài Khoản</CardTitle>
            <CardDescription>
              Nhập tên đăng nhập hoặc email cùng mật khẩu được cấp
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Global Error Banner */}
            {errorMessage && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-red-700">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="Tên đăng nhập hoặc Email"
                  placeholder="Ví dụ: mock_manager hoặc mock_shipper1"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  error={fieldErrors?.usernameOrEmail?.[0]}
                  required
                  autoFocus
                />
              </div>

              <div>
                <Input
                  label="Mật khẩu"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={fieldErrors?.password?.[0]}
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full font-semibold shadow-xs"
                  isLoading={isPending}
                >
                  Đăng Nhập Ngay
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

