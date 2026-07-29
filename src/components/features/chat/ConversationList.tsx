"use client";

import { useState, useMemo, useEffect } from 'react';
import { Conversation } from '@/types/chat';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { Search, Dot } from 'lucide-react';
import { formatSidebarTime } from '@/lib/utils';

interface ConversationListProps {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    loading: boolean;
    onlinePatients: Set<string>;
}

export function ConversationList({
    conversations,
    selectedId,
    onSelect,
    loading,
    onlinePatients
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const [tick, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 60000);
        return () => clearInterval(timer);
    }, []);

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
                        const isOnline = onlinePatients.has(conv.patientId);

                        const timeDisplay = formatSidebarTime(conv.lastMessageAt || conv.createdAt);
                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelect(conv.id)}
                                className={`w-full text-left p-4 flex flex-col gap-1 transition-all ${isActive
                                    ? 'bg-primary/10 dark:bg-primary/10 border-l-4 border-primary pl-3'
                                    : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/40 pl-4 border-l-4 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[130px] flex items-center gap-1.5">
                                        <span className="truncate">{conv.patient?.firstName} {conv.patient?.lastName}</span>
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? 'bg-green-500' : 'bg-amber-400'}`} title={isOnline ? 'Online' : 'Offline'} />
                                        {/* {isOnline && (
                                            <span className="h-2 w-2 rounded-full shrink-0 bg-green-500" title="Online"></span>
                                        )} */}
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
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap shrink-0 flex items-center ml-0.5">
                                            <Dot className="inline" />
                                            {timeDisplay}
                                        </span>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <>
                                            <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shrink-0">
                                                {conv.unreadCount}
                                            </span>
                                        </>
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
