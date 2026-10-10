'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function SignUpForm() {
    const router = useRouter();
    const [error, setError] = useState<string>();
    const [submitting, setSubmitting] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const password = String(formData.get('password'));
        if (password !== formData.get('passwordConfirmation')) return setError('Passwords must match before registration.');

        setSubmitting(true); setError(undefined);
        const response = await fetch('/api/auth/sign-up', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ firstName: formData.get('firstName'), lastName: formData.get('lastName'), password }) });
        const payload = await response.json();
        setSubmitting(false);
        if (!response.ok) return setError(payload.error ?? 'Unable to create the account.');
        router.replace('/dashboard');
        router.refresh();
    }

    return <form className="border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[7px_7px_0_var(--line)] sm:p-8" onSubmit={submit}>
        <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold">First name<input className="focus-ring mt-2 block w-full border border-[var(--line)] bg-transparent px-3 py-3" name="firstName" maxLength={100} required /></label><label className="block text-sm font-bold">Last name<input className="focus-ring mt-2 block w-full border border-[var(--line)] bg-transparent px-3 py-3" name="lastName" maxLength={100} required /></label></div>
        <label className="my-5 block text-sm font-bold">Password<input className="focus-ring mt-2 block w-full border border-[var(--line)] bg-transparent px-3 py-3" name="password" type="password" minLength={12} required /></label>
        <label className="mb-5 block text-sm font-bold">Confirm password<input className="focus-ring mt-2 block w-full border border-[var(--line)] bg-transparent px-3 py-3" name="passwordConfirmation" type="password" minLength={12} required /></label>
        {error && <p className="mb-5 border-l-4 border-[var(--accent)] pl-3 text-sm text-[var(--accent)]" role="alert">{error}</p>}
        <button className="focus-ring w-full bg-[var(--accent)] px-4 py-3 font-bold text-[var(--accent-ink)] disabled:opacity-60" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button>
        <p className="mt-5 text-center text-sm text-[var(--muted)]">Already registered? <Link className="font-bold text-[var(--ink)] underline" href="/sign-in">Sign in</Link></p>
    </form>;
}