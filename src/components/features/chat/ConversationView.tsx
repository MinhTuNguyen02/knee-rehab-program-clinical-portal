"use client";

import { useState, useRef, useEffect, UIEvent, useMemo } from 'react';
import { Conversation } from '@/types/chat';
import { useStaffChat } from '@/hooks/useStaffChat';
import { MessageBubble } from './MessageBubble';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { PatientSlideOver } from '@/components/management/PatientSlideOver';
import { Send, MessageSquare, AlertCircle, Info, ArrowLeft } from 'lucide-react';

interface ConversationViewProps {
    conversation: Conversation | null;
    onBack?: () => void;
}

export function ConversationView({ conversation, onBack }: ConversationViewProps) {
    const {
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
        error,
        sendMessage,
        loadMore
    } = useStaffChat(conversation ? conversation.id : null);

    const [inputText, setInputText] = useState('');
    const [showSlideOverPatientId, setShowSlideOverPatientId] = useState<string | null>(null);

    const messageListRef = useRef<HTMLDivElement>(null);
    const previousHeightRef = useRef<number>(0);
    const lastMessageIdRef = useRef<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Identify last read staff message
    const lastReadStaffMsgId = useMemo(() => {
        const lastReadMsg = [...messages].reverse().find(m => m.senderType === 'staff' && m.readAt);
        return lastReadMsg ? lastReadMsg.id : null;
    }, [messages]);

    // Scroll to bottom on initial load and when new messages are added
    useEffect(() => {
        if (!loading && messages.length > 0) {
            const currentLastMsg = messages[messages.length - 1];
            if (lastMessageIdRef.current !== currentLastMsg.id) {
                setTimeout(scrollToBottom, 50);
            }
            lastMessageIdRef.current = currentLastMsg.id;
        }
    }, [messages, loading]);

    const scrollToBottom = () => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    };

    const handleScroll = async (e: UIEvent<HTMLDivElement>) => {
        if (loadingMore || !hasMore) return;

        const target = e.currentTarget;
        if (target.scrollTop <= 1 && messages.length > 0) {
            previousHeightRef.current = target.scrollHeight;
            await loadMore();

            // Adjust scroll position to keep focus
            setTimeout(() => {
                if (messageListRef.current) {
                    const newHeight = messageListRef.current.scrollHeight;
                    messageListRef.current.scrollTop = newHeight - previousHeightRef.current;
                }
            }, 100);
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
        const target = e.target;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        const text = inputText.trim();
        if (!text || sending) return;

        setInputText('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        inputRef.current?.focus();
        setTimeout(scrollToBottom, 10);

        try {
            await sendMessage(text);
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            setInputText(text);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as unknown as React.FormEvent);
        }
    };

    // Helper functions for dates
    const groupMessagesByDay = (msgs: typeof messages) => {
        const groups: { [key: string]: typeof messages } = {};
        msgs.forEach(msg => {
            const dateKey = formatGroupDate(msg.sentAt);
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(msg);
        });
        return Object.entries(groups);
    };

    const formatGroupDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        if (d.getFullYear() !== today.getFullYear()) options.year = 'numeric';
        return d.toLocaleDateString('en-US', options);
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const getLatestZone = (conv: Conversation) => {
        const assessments = conv.patient?.assessments;
        if (!assessments || assessments.length === 0) return 'unknown';
        const sorted = [...assessments].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sorted[0]?.zone || 'unknown';
    };

    // Empty state
    if (!conversation) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/20 h-full">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 mb-4 ring-8 ring-slate-100/50 dark:ring-slate-900/30">
                    <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No conversation selected</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Select a patient from the list on the left to view their conversation history and reply.
                </p>
            </div>
        );
    }

    const patientName = `${conversation.patient?.firstName || ''} ${conversation.patient?.lastName || ''}`;

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-xs z-10">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            aria-label="Back to messages list"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shadow-sm text-sm border border-primary/20">
                        {conversation.patient?.firstName?.[0]?.toUpperCase()}
                        {conversation.patient?.lastName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                {patientName}
                            </h2>
                            <ZoneBadge zone={getLatestZone(conversation)} />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {conversation.patient?.email}
                        </p>
                    </div>
                </div>

                {/* Patient Profile Overlay Trigger */}
                <button
                    onClick={() => setShowSlideOverPatientId(conversation.patientId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                    <Info className="h-4 w-4 text-slate-450" />
                    <span className="hidden sm:block">Patient Details</span>
                </button>
            </div>

            {/* Chat Body */}
            <div
                ref={messageListRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30"
            >
                {loading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p className="text-xs text-slate-500">Loading conversation...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 text-center px-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Connection Error</h3>
                            <p className="text-xs text-slate-500">{error}</p>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 h-full">
                        <div className="p-4 bg-primary/5 rounded-full text-primary">
                            <MessageSquare className="w-10 h-10 opacity-70" />
                        </div>
                        <div className="max-w-sm space-y-1">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No messages yet</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-normal">
                                Send a message to start the conversation with {patientName}.
                            </p>
                        </div>
                    </div>
                ) : (
                    groupMessagesByDay(messages).map(([dayKey, dayMsgs]) => (
                        <div key={dayKey} className="flex flex-col">
                            {/* Date Header */}
                            <div className="flex justify-center mt-6 mb-4">
                                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700/50 shadow-2xs uppercase tracking-wider">
                                    {dayKey}
                                </span>
                            </div>

                            {dayMsgs.map((msg, index) => {
                                const isOwnMessage = msg.senderType === 'staff';
                                const prevMsg = dayMsgs[index - 1];
                                const nextMsg = dayMsgs[index + 1];

                                const FIVE_MINUTES = 5 * 60 * 1000;

                                const isFirstInGroup = !prevMsg ||
                                    prevMsg.senderType !== msg.senderType ||
                                    (new Date(msg.sentAt).getTime() - new Date(prevMsg.sentAt).getTime() > FIVE_MINUTES);

                                const isLastInGroup = !nextMsg ||
                                    nextMsg.senderType !== msg.senderType ||
                                    (new Date(nextMsg.sentAt).getTime() - new Date(msg.sentAt).getTime() > FIVE_MINUTES);

                                const isAbsoluteLastMsg = msg.id === messages[messages.length - 1].id;
                                const isLastReadMsg = msg.id === lastReadStaffMsgId;
                                const showStatusBlock = isAbsoluteLastMsg || (isOwnMessage && isLastReadMsg);

                                // Flipped bubble corner shape relative to patient app
                                let bubbleShapeClass = 'rounded-2xl';
                                if (isOwnMessage) { // Staff (Right side)
                                    if (isFirstInGroup && isLastInGroup) {
                                        bubbleShapeClass;
                                    } else if (isFirstInGroup) {
                                        bubbleShapeClass += ' rounded-br-xs';
                                    } else if (isLastInGroup) {
                                        bubbleShapeClass += ' rounded-tr-xs';
                                    } else {
                                        bubbleShapeClass += ' rounded-tr-xs rounded-br-xs';
                                    }
                                } else { // Patient (Left side)
                                    if (isFirstInGroup && isLastInGroup) {
                                        bubbleShapeClass;
                                    } else if (isFirstInGroup) {
                                        bubbleShapeClass += ' rounded-bl-xs';
                                    } else if (isLastInGroup) {
                                        bubbleShapeClass += ' rounded-tl-xs';
                                    } else {
                                        bubbleShapeClass += ' rounded-tl-xs rounded-bl-xs';
                                    }
                                }

                                const marginTopClass = index === 0 ? '' : isFirstInGroup ? 'mt-6' : 'mt-1';

                                return (
                                    <div key={msg.id} className={`${marginTopClass} w-full`}>
                                        {/* Sender name for patient bubbles */}
                                        {!isOwnMessage && isFirstInGroup && (
                                            <span className="text-[10px] font-semibold text-slate-550 dark:text-slate-400 ml-1.5 mb-1 block text-left">
                                                {patientName}
                                            </span>
                                        )}

                                        <MessageBubble
                                            message={msg}
                                            isOwnMessage={isOwnMessage}
                                            bubbleShapeClass={bubbleShapeClass}
                                            showStatusBlock={showStatusBlock}
                                            formatTime={formatTime}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
                {loadingMore && (
                    <div className="flex justify-center py-2 shrink-0">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    </div>
                )}
            </div>

            {/* Input Form */}
            <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0"
            >
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={handleTextChange}
                        placeholder="Type a message..."
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="flex-1 resize-none overflow-y-auto max-h-[150px] min-h-[44px] px-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 text-sm text-slate-900 dark:text-white transition-all disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || sending}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.97] transition-all text-white disabled:opacity-30 disabled:pointer-events-none shadow-md shrink-0 shadow-primary/10 cursor-pointer"
                        aria-label="Send message"
                    >
                        <Send className="w-4.5 h-4.5" />
                    </button>
                </div>
            </form>

            {/* Reuse PatientSlideOver drawer for patient details */}
            <PatientSlideOver
                patientId={showSlideOverPatientId}
                onClose={() => setShowSlideOverPatientId(null)}
            />
        </div>
    );
}
