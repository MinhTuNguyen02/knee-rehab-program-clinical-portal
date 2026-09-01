'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle, Eye, EyeOff, ArrowLeft, Key, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>({});
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus(null);
        setFieldErrors({});

        let hasError = false;
        const newFieldErrors: typeof fieldErrors = {};

        if (!currentPassword) {
            newFieldErrors.currentPassword = 'Current password is required';
            hasError = true;
        }

        if (!newPassword || newPassword.length < 6) {
            newFieldErrors.newPassword = 'Password must be at least 6 characters long';
            hasError = true;
        }

        if (newPassword !== confirmPassword) {
            newFieldErrors.confirmPassword = 'New passwords do not match';
            hasError = true;
        }

        if (hasError) {
            setFieldErrors(newFieldErrors);
            return;
        }

        startTransition(async () => {
            try {
                const res = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword }),
                });
                const data = await res.json();

                if (!res.ok) {
                    const errorMsgs = Array.isArray(data.message)
                        ? data.message
                        : (data.error?.message ? [data.error.message] : [data.message || 'Failed to change password']);
                    const backendFieldErrors: typeof fieldErrors = {};
                    let genericError: string | null = null;

                    errorMsgs.forEach((msg: string) => {
                        const lowercaseMsg = msg.toLowerCase();
                        if (lowercaseMsg.includes('current password') || lowercaseMsg.includes('incorrect current')) {
                            backendFieldErrors.currentPassword = msg;
                        } else if (lowercaseMsg.includes('new password') || lowercaseMsg.includes('password')) {
                            backendFieldErrors.newPassword = msg;
                        } else {
                            genericError = msg;
                        }
                    });

                    if (Object.keys(backendFieldErrors).length > 0) {
                        setFieldErrors(backendFieldErrors);
                    }
                    if (genericError) {
                        setStatus({ type: 'error', message: genericError });
                    }
                } else {
                    toast.success('Password updated successfully');
                    setStatus({ type: 'success', message: 'Password updated successfully' });
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 1200);
                }
            } catch (err: any) {
                setStatus({ type: 'error', message: 'Failed to connect to the server' });
            }
        });
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-md space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
                        <Key className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Change Password
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Update your account password securely
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {status?.type === 'error' && (
                        <div className="p-3.5 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{status.message}</span>
                        </div>
                    )}

                    {status?.type === 'success' && (
                        <div className="p-3.5 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{status.message}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Current Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor="currentPassword">
                                Current Password
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="currentPassword"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className={`block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white text-sm ${fieldErrors.currentPassword
                                        ? 'ring-red-300 focus:ring-red-500 dark:ring-red-900/50'
                                        : 'ring-slate-200 focus:ring-primary dark:ring-slate-700'
                                        }`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {fieldErrors.currentPassword && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                                    {fieldErrors.currentPassword}
                                </p>
                            )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor="newPassword">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="newPassword"
                                    type={showNewPassword ? 'text' : 'password'}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white text-sm ${fieldErrors.newPassword
                                        ? 'ring-red-300 focus:ring-red-500 dark:ring-red-900/50'
                                        : 'ring-slate-200 focus:ring-primary dark:ring-slate-700'
                                        }`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {fieldErrors.newPassword && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                                    {fieldErrors.newPassword}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider" htmlFor="confirmPassword">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white text-sm ${fieldErrors.confirmPassword
                                        ? 'ring-red-300 focus:ring-red-500 dark:ring-red-900/50'
                                        : 'ring-slate-200 focus:ring-primary dark:ring-slate-700'
                                        }`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                                    {fieldErrors.confirmPassword}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {isPending ? 'Updating Password...' : 'Update Password'}
                    </button>

                    <div className="flex justify-center pt-2">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
