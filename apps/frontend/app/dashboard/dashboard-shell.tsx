'use client';

import { ChevronLeft, ChevronRight, LogOut, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ThemeToggle } from '../../components/theme-toggle';

type Status = 'active' | 'inactive';
type ManagedUser = { id: string; firstName: string; lastName: string; email: string; status: Status; loginsCounter: number; createdAt: string };
type UserPage = { users: ManagedUser[]; page: number; limit: 6; total: number; totalPages: number };
type Draft = { firstName: string; lastName: string; email: string; status: Status; password: string; passwordConfirmation: string };

const dateFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });
const newDraft = (): Draft => ({ firstName: '', lastName: '', email: '', status: 'active', password: '', passwordConfirmation: '' });

function trapDialogFocus(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
    if (event.key === 'Escape') return onClose();
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

async function readResponse(response: Response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'The request could not be completed.');
    return payload;
}

export function DashboardShell() {
    const router = useRouter();
    const [userPage, setUserPage] = useState<UserPage>();
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string>();
    const [loading, setLoading] = useState(true);
    const [editor, setEditor] = useState<ManagedUser | null | undefined>();
    const [deletingUser, setDeletingUser] = useState<ManagedUser>();
    const [notice, setNotice] = useState<string>();
    const dialogTrigger = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (editor !== undefined || deletingUser) return;
        dialogTrigger.current?.focus();
        dialogTrigger.current = null;
    }, [editor, deletingUser]);

    async function loadUsers(nextPage = page) {
        setLoading(true);
        setError(undefined);
        const response = await fetch(`/api/users?page=${nextPage}`, { cache: 'no-store' });
        if (response.status === 401) {
            router.replace('/sign-in');
            return;
        }
        try {
            setUserPage(await readResponse(response) as UserPage);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to load users.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void loadUsers(page); }, [page]);

    async function saveUser(draft: Draft) {
        const isNewUser = editor === null;
        if (isNewUser && draft.password !== draft.passwordConfirmation) {
            throw new Error('Passwords must match before creating a user.');
        }

        const body = isNewUser
            ? { firstName: draft.firstName, lastName: draft.lastName, email: draft.email, password: draft.password }
            : { firstName: draft.firstName, lastName: draft.lastName, status: draft.status };
        const response = await fetch(isNewUser ? '/api/users' : `/api/users/${editor!.id}`, {
            method: isNewUser ? 'POST' : 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });
        await readResponse(response);
        setEditor(undefined);
        setNotice(isNewUser ? 'User created.' : 'User updated.');
        if (isNewUser) setPage(1);
        await loadUsers(isNewUser ? 1 : page);
    }

    async function deleteUser() {
        if (!deletingUser) return;
        const response = await fetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' });
        await readResponse(response);
        setDeletingUser(undefined);
        setNotice('User removed.');
        const nextPage = userPage && userPage.users.length === 1 && page > 1 ? page - 1 : page;
        if (nextPage !== page) setPage(nextPage);
        else await loadUsers(page);
    }

    async function signOut() {
        await fetch('/api/auth/sign-out', { method: 'POST' });
        router.replace('/sign-in');
        router.refresh();
    }

    return (
        <main className="ui mx-auto min-h-screen max-w-7xl px-5 py-5 sm:px-10">
            <header className="flex items-center justify-between border-b border-[var(--line)] pb-5">
                <strong className="tracking-wide">USER / MGMT</strong>
                <div className="flex gap-2"><ThemeToggle /><button className="focus-ring inline-grid h-10 w-10 place-items-center border border-[var(--line)] bg-[var(--panel)]" type="button" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={18} /></button></div>
            </header>
            <section className="py-10 sm:py-14">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                    <div><p className="mb-2 text-sm font-bold tracking-[0.16em] text-[var(--accent)]">DIRECTORY</p><h1 className="text-4xl leading-none sm:text-6xl">User management</h1><p className="mt-3 text-[var(--muted)]">{userPage ? `${userPage.total} records` : 'Loading records...'}</p></div>
                    <button className="focus-ring inline-flex items-center gap-2 bg-[var(--accent)] px-4 py-3 font-bold text-[var(--accent-ink)]" type="button" onClick={(event) => { dialogTrigger.current = event.currentTarget; setEditor(null); }}><Plus size={18} /> Add user</button>
                </div>
                {error && <p className="mb-5 border-l-4 border-[var(--accent)] bg-[var(--panel)] p-4 text-sm text-[var(--accent)]" role="alert">{error}</p>}
                {notice && <p className="mb-5 border-l-4 border-emerald-600 bg-[var(--panel)] p-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">{notice}</p>}
                <div className="overflow-x-auto border border-[var(--line)] bg-[var(--panel)]">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                        <thead className="border-b border-[var(--line)] text-xs uppercase tracking-[0.1em] text-[var(--muted)]"><tr><th className="p-4 font-bold">Name</th><th className="p-4 font-bold">Email</th><th className="p-4 font-bold">Status</th><th className="p-4 font-bold">Logins</th><th className="p-4 font-bold">Created</th><th className="p-4 text-right font-bold">Actions</th></tr></thead>
                        <tbody>
                            {loading ? <tr><td className="p-8 text-[var(--muted)]" colSpan={6}>Loading users...</td></tr> : userPage?.users.length ? userPage.users.map((user) => <tr className="border-b border-[var(--line)] last:border-0" key={user.id}><td className="p-4"><strong>{user.firstName} {user.lastName}</strong><code className="mt-1 block max-w-48 truncate text-xs text-[var(--muted)]" title={user.id}>{user.id}</code></td><td className="p-4 text-[var(--muted)]">{user.email}</td><td className="p-4"><span className={user.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--accent)]'}>{user.status}</span></td><td className="p-4">{user.loginsCounter}</td><td className="p-4 text-[var(--muted)]">{dateFormat.format(new Date(user.createdAt))}</td><td className="p-4"><div className="flex justify-end gap-2"><button className="focus-ring inline-grid h-9 w-9 place-items-center border border-[var(--line)]" type="button" title={`Edit ${user.firstName} ${user.lastName}`} aria-label={`Edit ${user.firstName} ${user.lastName}`} onClick={(event) => { dialogTrigger.current = event.currentTarget; setEditor(user); }}><Pencil size={16} /></button><button className="focus-ring inline-grid h-9 w-9 place-items-center border border-[var(--line)] text-[var(--accent)]" type="button" title={`Delete ${user.firstName} ${user.lastName}`} aria-label={`Delete ${user.firstName} ${user.lastName}`} onClick={(event) => { dialogTrigger.current = event.currentTarget; setDeletingUser(user); }}><Trash2 size={16} /></button></div></td></tr>) : <tr><td className="p-8 text-[var(--muted)]" colSpan={6}>No active users found.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="mt-5 flex items-center justify-between"><p className="text-sm text-[var(--muted)]">Page {userPage?.page ?? page} of {Math.max(userPage?.totalPages ?? 1, 1)}</p><div className="flex gap-2"><button className="focus-ring inline-grid h-10 w-10 place-items-center border border-[var(--line)] bg-[var(--panel)] disabled:opacity-40" type="button" disabled={page === 1 || loading} aria-label="Previous page" title="Previous page" onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><button className="focus-ring inline-grid h-10 w-10 place-items-center border border-[var(--line)] bg-[var(--panel)] disabled:opacity-40" type="button" disabled={loading || !userPage || page >= userPage.totalPages} aria-label="Next page" title="Next page" onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div></div>
            </section>
            {editor !== undefined && <UserModal user={editor} onClose={() => setEditor(undefined)} onSave={saveUser} />}
            {deletingUser && <DeleteModal user={deletingUser} onClose={() => setDeletingUser(undefined)} onDelete={deleteUser} />}
        </main>
    );
}

function UserModal({ user, onClose, onSave }: Readonly<{ user: ManagedUser | null; onClose: () => void; onSave: (draft: Draft) => Promise<void> }>) {
    const [draft, setDraft] = useState<Draft>(user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, status: user.status, password: '', passwordConfirmation: '' } : newDraft());
    const [error, setError] = useState<string>();
    const [saving, setSaving] = useState(false);
    const isNewUser = user === null;
    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(undefined); try { await onSave(draft); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save the user.'); setSaving(false); } }
    return <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4" role="presentation"><form className="w-full max-w-lg border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[8px_8px_0_var(--accent)]" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" onKeyDown={(event) => trapDialogFocus(event, onClose)} onSubmit={submit}><div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.14em] text-[var(--accent)]">{isNewUser ? 'NEW RECORD' : 'EDIT RECORD'}</p><h2 className="mt-1 text-2xl" id="user-dialog-title">{isNewUser ? 'Create user' : 'Update user'}</h2></div><button autoFocus className="focus-ring inline-grid h-9 w-9 place-items-center border border-[var(--line)]" type="button" aria-label="Close form" title="Close form" onClick={onClose}><X size={17} /></button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="First name" value={draft.firstName} onChange={(value) => set('firstName', value)} disabled={!isNewUser && user.status === 'inactive'} invalid={Boolean(error)} /><Field label="Last name" value={draft.lastName} onChange={(value) => set('lastName', value)} disabled={!isNewUser && user.status === 'inactive'} invalid={Boolean(error)} /></div>{isNewUser && <><Field label="Email" value={draft.email} onChange={(value) => set('email', value)} type="email" invalid={Boolean(error)} /><Field label="Password" value={draft.password} onChange={(value) => set('password', value)} type="password" invalid={Boolean(error)} /><Field label="Confirm password" value={draft.passwordConfirmation} onChange={(value) => set('passwordConfirmation', value)} type="password" invalid={Boolean(error)} /></>}{!isNewUser && <div className="mt-4"><SelectField label="Status" value={draft.status} onChange={(value) => set('status', value as Status)} options={['active', 'inactive']} invalid={Boolean(error)} /></div>}{!isNewUser && user.status === 'inactive' && <p className="mt-4 text-sm text-[var(--muted)]">Names remain locked while this account is inactive.</p>}{error && <p className="mt-4 border-l-4 border-[var(--accent)] pl-3 text-sm text-[var(--accent)]" id="user-form-error" role="alert">{error}</p>}<button className="focus-ring mt-6 w-full bg-[var(--accent)] px-4 py-3 font-bold text-[var(--accent-ink)] disabled:opacity-60" disabled={saving}>{saving ? 'Saving...' : isNewUser ? 'Create user' : 'Save changes'}</button></form></div>;
}

function Field({ label, value, onChange, disabled, invalid, type = 'text' }: Readonly<{ label: string; value: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean; type?: 'text' | 'password' | 'email' }>) { return <label className="mt-4 block text-sm font-bold">{label}<input className="focus-ring mt-2 block w-full border border-[var(--line)] bg-transparent px-3 py-2 disabled:opacity-50" type={type} value={value} minLength={type === 'password' ? 12 : undefined} maxLength={type === 'email' ? 254 : type === 'text' ? 100 : 128} required onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'user-form-error' : undefined} /></label>; }
function SelectField({ label, value, onChange, options, invalid }: Readonly<{ label: string; value: string; onChange: (value: string) => void; options: string[]; invalid?: boolean }>) { return <label className="block text-sm font-bold">{label}<select className="focus-ring mt-2 block w-full border border-[var(--line)] bg-[var(--panel)] px-3 py-2 capitalize" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'user-form-error' : undefined}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function DeleteModal({ user, onClose, onDelete }: Readonly<{ user: ManagedUser; onClose: () => void; onDelete: () => Promise<void> }>) { const [deleting, setDeleting] = useState(false); const [error, setError] = useState<string>(); async function remove() { setDeleting(true); try { await onDelete(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this user.'); setDeleting(false); } } return <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4" role="presentation"><section className="w-full max-w-md border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[8px_8px_0_var(--accent)]" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onKeyDown={(event) => trapDialogFocus(event, onClose)}><p className="text-xs font-bold tracking-[0.14em] text-[var(--accent)]">SOFT DELETE</p><h2 className="mt-1 text-2xl" id="delete-dialog-title">Remove {user.firstName}?</h2><p className="mt-3 leading-relaxed text-[var(--muted)]">This removes the user from the active directory and immediately terminates all active sessions.</p>{error && <p className="mt-4 text-sm text-[var(--accent)]" role="alert">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button autoFocus className="focus-ring border border-[var(--line)] px-4 py-2" type="button" onClick={onClose}>Cancel</button><button className="focus-ring bg-[var(--accent)] px-4 py-2 font-bold text-[var(--accent-ink)] disabled:opacity-60" type="button" disabled={deleting} onClick={remove}>{deleting ? 'Removing...' : 'Remove user'}</button></div></section></div>; }