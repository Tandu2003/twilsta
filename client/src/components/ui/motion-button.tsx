import { motion } from 'framer-motion';

import { ComponentPropsWithoutRef } from 'react';

import { Button } from './button';

export const MotionButton = motion(Button);

export type MotionButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  whileHover?: Record<string, any>;
  whileTap?: Record<string, any>;
};
