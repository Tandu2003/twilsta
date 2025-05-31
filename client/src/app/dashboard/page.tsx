'use client';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { useAppDispatch } from '@/hooks/redux';
import { useAuthGuard } from '@/hooks/useAuthGuard';

import { logout } from '@/store/slices/authSlice';

export default function DashboardPage() {
  const { user, isAuthenticated, loading } = useAuthGuard(true);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Auth guard will handle redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Welcome back!</h2>
          <div className="space-y-2">
            <p>
              <strong>Username:</strong> {user?.username}
            </p>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Full Name:</strong> {user?.fullName}
            </p>
            <p>
              <strong>Verified:</strong> {user?.isVerified ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
