'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown, Key, Shield, UserCheck } from 'lucide-react';

export default function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [userInfo, setUserInfo] = useState<{ email: string; role: string } | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch user info (email & role)
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.email) {
                    setUserInfo({ email: data.email, role: data.role || 'admin' });
                }
            })
            .catch(() => { });
    }, []);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-focus first element when menu opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                const firstElement = panelRef.current?.querySelector<HTMLElement>('a, button');
                firstElement?.focus();
            }, 50);
        }
    }, [isOpen]);

    // Keyboard events for Escape and Tab Focus Trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
                return;
            }

            if (e.key === 'Tab') {
                if (!panelRef.current) return;

                const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled])'
                );

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    // Shift + Tab: Wrap from first to last
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    // Tab: Wrap from last to first
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleLogout = () => {
        startTransition(async () => {
            try {
                const fcmToken = localStorage.getItem('fcmToken');
                if (fcmToken) {
                    await fetch('/api/staff/fcm-token', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fcmToken })
                    });
                    localStorage.removeItem('fcmToken');
                }
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (err) {
                // ignore
            }
            window.location.href = '/login';
        });
    };

    const userInitial = userInfo?.email ? userInfo.email.charAt(0).toUpperCase() : 'A';
    const isAdmin = userInfo?.role === 'admin';

    return (
        <div className="relative" ref={menuRef}>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label={`User menu. Logged in as ${userInfo?.email || 'User'}`}
            >
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-inner">
                    {userInitial}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-label="User Menu dropdown"
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {userInfo?.email || 'Staff User'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {isAdmin ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                                    <Shield className="w-3 h-3" /> Admin
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/40">
                                    <UserCheck className="w-3 h-3" /> Doctor
                                </span>
                            )}
                        </div>
                    </div>

                    <Link
                        href="/change-password"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800"
                        aria-label="Change Password"
                    >
                        <Key className="w-4 h-4 text-gray-400" />
                        <span>Change Password</span>
                    </Link>

                    <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                    <button
                        onClick={handleLogout}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:bg-red-50 dark:focus-visible:bg-red-950/30 cursor-pointer"
                        aria-label="Sign out from portal"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>{isPending ? 'Logging out...' : 'Logout'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
