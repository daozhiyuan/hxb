'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import AppealForm from '@/components/appeal-form';

export default function SubmitAppealPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!session || session.user.role !== 'PARTNER') {
    redirect('/auth/signin?callbackUrl=/appeals/submit');
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <AppealForm />
      </div>
    </div>
  );
} 