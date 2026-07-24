"use client";

import { useState, useMemo } from 'react';
import { Conversation } from '@/types/chat';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { Search, Dot } from 'lucide-react';

interface ConversationListProps {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    loading: boolean;
}

export function ConversationList({
    conversations,
    selectedId,
    onSelect,
    loading
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    // Helper for relative time formatting
    const getRelativeTime = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (60 * 1000));
        const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
        });
    };

    const getLatestZone = (conv: Conversation) => {
        const assessments = conv.patient?.assessments;
        if (!assessments || assessments.length === 0) return 'unknown';
        const sorted = [...assessments].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sorted[0]?.zone || 'unknown';
    };

    // Filter conversations based on search and unread filter
    const filteredConversations = useMemo(() => {
        return conversations.filter(conv => {
            const patientName = `${conv.patient?.firstName || ''} ${conv.patient?.lastName || ''}`.toLowerCase();
            const matchesSearch = patientName.includes(searchQuery.toLowerCase());

            const matchesFilter = filter === 'all' || conv.unreadCount > 0;

            return matchesSearch && matchesFilter;
        });
    }, [conversations, searchQuery, filter]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h1>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search patient..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-205 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-850 text-sm transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${filter === 'all'
                            ? 'bg-primary/10 text-primary dark:bg-primary/20'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${filter === 'unread'
                            ? 'bg-primary/10 text-primary dark:bg-primary/20'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                            }`}
                    >
                        Unread
                        {conversations.some(c => c.unreadCount > 0) && (
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        <p className="text-xs text-slate-500">Loading inbox...</p>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {searchQuery ? 'No patients match search' : 'No conversations found'}
                    </div>
                ) : (
                    filteredConversations.map(conv => {
                        const isActive = conv.id === selectedId;
                        const latestZone = getLatestZone(conv);

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv.id)}
                                className={`w-full text-left p-4 flex flex-col gap-1 transition-all ${isActive
                                    ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary pl-3'
                                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 pl-4 border-l-4 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[140px]">
                                        {conv.patient?.firstName} {conv.patient?.lastName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap shrink-0">
                                        <ZoneBadge zone={latestZone} />
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 mt-1 w-full">
                                    <div className="flex items-center flex-1 min-w-0">
                                        <p className={`text-xs truncate flex-1 text-left ${conv.unreadCount > 0
                                            ? 'font-semibold text-slate-900 dark:text-slate-100'
                                            : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                            {conv.lastMessage?.senderType === 'staff' ? 'You: ' : ''}
                                            {conv.lastMessage?.body || 'Start the conversation'}
                                        </p>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap shrink-0 flex items-center ml-0.5">
                                            <Dot className="inline" />
                                            {getRelativeTime(conv.lastMessageAt || conv.createdAt)}
                                        </span>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shrink-0">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
