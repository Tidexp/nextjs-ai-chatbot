'use client';

import React from 'react';
import { useInstructorMode } from '@/hooks/use-instructor-mode';
import { InstructorPanel } from '@/components/instructor-panel';

export function InstructorModeContainer({
  children,
}: { children: React.ReactNode }) {
  const { active } = useInstructorMode();
  return active ? <InstructorPanel /> : <>{children}</>;
}
