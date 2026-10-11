'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function SignInForm() {
    const router = useRouter();
    const [error, setError] = useState<string>();
    const [submitting, setSubmitting] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true); setError(undefined);
        const formData = new FormData(event.currentTarget);
        const response = await fetch('/api/auth/sign-in', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(formData)) });
        const payload = await response.json();
        setSubmitting(false);
        if (!response.ok) return setError(payload.error ?? 'Unable to sign in.');
        router.replace('/dashboard'); router.refresh();
    }

    return <form className="border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[7px_7px_0_var(--line)] sm:p-8" onSubmit={submit}>
        <label className="mb-5 block text-sm font-bold">Email<input className="focus-ring mt-2 block w-full border border-[var(--line)] bg-transparent px-3 py-3" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'sign-in-error' : undefined} /></label>
        <label className="mb-5 block text-sm font-bold">Password<input className="focus-ring mt-2 block w-full border border-[var(--line)] bg-transparent px-3 py-3" name="password" type="password" minLength={12} required aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'sign-in-error' : undefined} /></label>
        {error && <p className="mb-5 border-l-4 border-[var(--accent)] pl-3 text-sm text-[var(--accent)]" id="sign-in-error" role="alert">{error}</p>}
        <button className="focus-ring w-full bg-[var(--accent)] px-4 py-3 font-bold text-[var(--accent-ink)] disabled:opacity-60" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button>
        <p className="mt-5 text-center text-sm text-[var(--muted)]">Need an account? <Link className="font-bold text-[var(--ink)] underline" href="/sign-up">Create one</Link></p>
    </form>;
}