'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '../../components/theme-toggle';

export function DashboardShell() {
  const router = useRouter();
  async function signOut() { await fetch('/api/auth/sign-out', { method: 'POST' }); router.replace('/sign-in'); router.refresh(); }
  return <main className="ui mx-auto min-h-screen max-w-6xl px-5 py-5 sm:px-10"><header className="flex items-center justify-between border-b border-[var(--line)] pb-5"><strong className="tracking-wide">USER / MGMT</strong><div className="flex gap-2"><ThemeToggle /><button className="focus-ring inline-grid h-10 w-10 place-items-center border border-[var(--line)] bg-[var(--panel)]" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={18} /></button></div></header><section className="py-16"><p className="mb-3 text-sm font-bold tracking-[0.16em] text-[var(--accent)]">SECURE SESSION</p><h1 className="text-5xl leading-none sm:text-7xl">Management workspace</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">Your session is active. User administration arrives in the next workspace phase.</p></section></main>;
}