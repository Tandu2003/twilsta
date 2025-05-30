'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MotionButton } from '@/components/ui/motion-button';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { forgotPassword } from '@/store/slices/authSlice';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

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

export default function ForgotPasswordForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await dispatch(forgotPassword({ email: data.email })).unwrap();
      toast.success('Password reset instructions have been sent to your email.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset password email');
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
              Forgot password?
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link
                className="font-medium text-blue-600 decoration-2 hover:underline dark:text-blue-500"
                href="/login"
              >
                Sign in here
              </Link>
            </p>
          </motion.div>

          <div className="mt-5">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-y-4">
              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
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
                      Sending reset instructions...
                    </>
                  ) : (
                    'Send reset instructions'
                  )}
                </MotionButton>
              </motion.div>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
