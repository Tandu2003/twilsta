'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MotionButton } from '@/components/ui/motion-button';

import { useAppDispatch, useAppSelector } from '@/hooks/redux';

import { resendVerification, verifyEmail } from '@/store/slices/authSlice';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector(state => state.auth);
  const [isResending, setIsResending] = useState(false);

  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
  });

  useEffect(() => {
    if (token) {
      setValue('token', token);
      // Auto-verify if token is in URL
      handleSubmit(onSubmit)();
    }
  }, [token]);

  const onSubmit = async (data: VerifyEmailFormData) => {
    try {
      await dispatch(verifyEmail({ token: data.token })).unwrap();
      toast.success('Email verified successfully.');
      router.push('/login?verified=true');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify email');
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Email address is required to resend verification');
      return;
    }

    setIsResending(true);
    try {
      await dispatch(resendVerification({ email })).unwrap();
      toast.success('Verification email sent successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mx-auto w-full max-w-md p-6"
    >
      <motion.div
        variants={itemVariants}
        className="mt-7 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="p-4 sm:p-7">
          <motion.div variants={itemVariants} className="text-center">
            <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">
              Verify your email
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {email
                ? `Check your email (${email}) for the verification link`
                : 'Enter your verification token below'}
            </p>
          </motion.div>

          <div className="mt-5">
            {!token && (
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-y-4">
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="token">Verification token</Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Enter verification token"
                    {...register('token')}
                    className={errors.token ? 'border-red-500' : ''}
                  />
                  {errors.token && <p className="text-sm text-red-500">{errors.token.message}</p>}
                </motion.div>

                <motion.div variants={itemVariants}>
                  <MotionButton
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify email'
                    )}
                  </MotionButton>
                </motion.div>
              </form>
            )}

            {email && (
              <motion.div variants={itemVariants} className="space-y-4">
                <MotionButton
                  onClick={handleResendVerification}
                  disabled={isResending}
                  variant="outline"
                  className="w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isResending ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend verification email'
                  )}
                </MotionButton>
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already verified?{' '}
                <Link
                  className="font-medium text-blue-600 decoration-2 hover:underline dark:text-blue-500"
                  href="/login"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
