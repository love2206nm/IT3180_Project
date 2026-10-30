import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserSession } from '../../presentation/actions/session.helper';
import { ProfileForm } from '../../presentation/components/profile/profile-form';

/**
 * @file page.tsx (profile)
 * @description Trang Hồ sơ cá nhân & Bảo mật tài khoản (Server Component).
 * Nạp SecurityContext thực tế từ Server Session và truyền vào Client Component ProfileForm.
 */
export default async function ProfilePage() {
  const session = await getCurrentUserSession();

  if (!session) {
    redirect('/login');
  }

  return <ProfileForm user={session} />;
}
