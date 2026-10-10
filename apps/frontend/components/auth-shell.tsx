import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function AuthShell({ children, mode }: Readonly<{ children: React.ReactNode; mode: 'sign-in' | 'sign-up' }>) {
  const isSignIn = mode === 'sign-in';
  return (
    <main className="ui mx-auto grid min-h-screen max-w-6xl grid-rows-[auto_1fr] px-5 py-5 sm:px-10">
      <header className="flex items-center justify-between border-b border-[var(--line)] pb-5">
        <Link className="text-lg font-bold tracking-wide text-[var(--ink)]" href="/sign-in">USER / MGMT</Link>
        <ThemeToggle />
      </header>
      <section className="grid items-center py-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div className="mb-12 max-w-xl lg:mb-0">
          <p className="mb-3 text-sm font-bold tracking-[0.16em] text-[var(--accent)]">BACKOFFICE ACCESS</p>
          <h1 className="mb-5 text-5xl leading-[0.94] sm:text-7xl">{isSignIn ? 'Access, with intent.' : 'Begin with a record.'}</h1>
          <p className="max-w-md text-lg leading-relaxed text-[var(--muted)]">{isSignIn ? 'Use your account identifier and password to continue to the management workspace.' : 'Create a standard account. Administrator access is assigned separately.'}</p>
        </div>
        {children}
      </section>
    </main>
  );
}