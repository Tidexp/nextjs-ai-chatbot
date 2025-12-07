'use client';

import React from 'react';

interface InstructorModeContextValue {
  active: boolean;
  toggle: () => void;
  setActive: (value: boolean) => void;
}

const InstructorModeContext = React.createContext<
  InstructorModeContextValue | undefined
>(undefined);

export function InstructorModeProvider({
  children,
}: { children: React.ReactNode }) {
  const [active, setActive] = React.useState(false);
  const toggle = React.useCallback(() => setActive((a) => !a), []);

  const value = React.useMemo(
    () => ({ active, toggle, setActive }),
    [active, toggle],
  );

  return (
    <InstructorModeContext.Provider value={value}>
      {children}
    </InstructorModeContext.Provider>
  );
}

export function useInstructorMode() {
  const ctx = React.useContext(InstructorModeContext);
  if (!ctx)
    throw new Error(
      'useInstructorMode must be used within InstructorModeProvider',
    );
  return ctx;
}
