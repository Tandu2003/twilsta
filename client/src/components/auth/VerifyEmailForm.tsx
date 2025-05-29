'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { motion } from 'framer-motion';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MotionButton } from '@/components/ui/motion-button';

const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 characters'),
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
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
  });

  const onSubmit = async (data: VerifyEmailFormData) => {
    setIsLoading(true);
    try {
      const token = searchParams.get('token');
      if (!token) {
        throw new Error('Verification token is missing');
      }

      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          code: data.code,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify email');
      }

      toast.success('Email verified successfully.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
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
              Enter the 6-digit code sent to your email address
            </p>
          </motion.div>

          <div className="mt-5">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-y-4">
              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  {...register('code')}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
              </motion.div>

              <motion.div variants={itemVariants}>
                <MotionButton
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify email'
                  )}
                </MotionButton>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Didn't receive the code?{' '}
                  <Link
                    className="font-medium text-blue-600 decoration-2 hover:underline dark:text-blue-500"
                    href="/resend-verification"
                  >
                    Resend code
                  </Link>
                </p>
              </motion.div>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
