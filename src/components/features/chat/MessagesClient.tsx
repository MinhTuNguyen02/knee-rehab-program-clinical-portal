"use client";

import { useState, useEffect } from 'react';
import { Conversation } from '@/types/chat';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import toast from 'react-hot-toast';

export function MessagesClient() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchConversations = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const res = await fetch('/api/chat/conversations');
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'Failed to load inbox conversations');
            }
            const data = await res.json();
            const list = data.data || data || [];
            
            // Map list to keep it as Conversation[]
            setConversations(list);
        } catch (err: any) {
            console.error('Error fetching conversations:', err);
            if (!isSilent) {
                toast.error(err.message || 'Failed to load inbox');
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    // Load list initially
    useEffect(() => {
        fetchConversations();
    }, []);

    // Polling list every 10 seconds for previews/unread counts
    useEffect(() => {
        const timer = setInterval(() => {
            fetchConversations(true);
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    // Find the currently selected conversation
    const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

    // Handle mark as read when selecting conversation
    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id);
        
        // Reset unread count locally for immediate response
        setConversations(prev =>
            prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c))
        );
    };

    return (
        <div className="mx-auto flex h-[calc(100dvh-12rem)] sm:h-[calc(100vh-10rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-200">
            {/* Conversation List Column */}
            <div className={`${selectedConversationId ? 'hidden md:block' : 'w-full'} md:w-[320px] shrink-0 h-full`}>
                <ConversationList
                    conversations={conversations}
                    selectedId={selectedConversationId}
                    onSelect={handleSelectConversation}
                    loading={loading}
                />
            </div>

            {/* Conversation View Column */}
            <div className={`${!selectedConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full min-w-0`}>
                <ConversationView
                    conversation={selectedConversation}
                    onBack={selectedConversationId ? () => setSelectedConversationId(null) : undefined}
                />
            </div>
        </div>
    );
}
