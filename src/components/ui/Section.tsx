import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Vertical rhythm section. max-w-7xl keeps long-form content readable
 * on wide screens; padding scales with viewport size.
 */
export function Section({ children, className = '', id }: SectionProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}
