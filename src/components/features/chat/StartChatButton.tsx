'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatCircleText } from '@phosphor-icons/react';
import toast from 'react-hot-toast';

interface StartChatButtonProps {
    patientId: string;
    variant?: 'primary' | 'outline';
}

export function StartChatButton({ patientId, variant = 'primary' }: StartChatButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleStartChat = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/chat/conversations/patient/${patientId}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.error?.message || 'Failed to start conversation.');
            }
            router.push(`/messages?patientId=${patientId}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to start chat.');
        } finally {
            setLoading(false);
        }
    };

    const baseClass = "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.98]";
    const variantClass = variant === 'primary'
        ? "bg-primary text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750";

    return (
        <button
            onClick={handleStartChat}
            disabled={loading}
            className={`${baseClass} ${variantClass}`}
        >
            <ChatCircleText size={18} weight="bold" />
            <span>{loading ? "Opening Chat..." : "Chat with Patient"}</span>
        </button>
    );
}
