"use client";

import { useState, useRef, useEffect, UIEvent, useMemo } from 'react';
import { Conversation } from '@/types/chat';
import { useStaffChat } from '@/hooks/useStaffChat';
import { MessageBubble } from './MessageBubble';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { PatientSlideOver } from '@/components/management/PatientSlideOver';
import { Send, MessageSquare, AlertCircle, Info, ArrowLeft, ChevronDown } from 'lucide-react';
import { formatDateDivider, formatBubbleTime } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ConversationViewProps {
    conversation: Conversation | null;
    isPatientOnline: boolean;
    onBack?: () => void;
}

export function ConversationView({ conversation, isPatientOnline, onBack }: ConversationViewProps) {
    const {
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
        error,
        isConnected,
        isReconnecting,
        isPatientTyping,
        emitTyping,
        sendMessage,
        loadMore
    } = useStaffChat(conversation ? conversation.id : null);

    const [inputText, setInputText] = useState('');
    const [showSlideOverPatientId, setShowSlideOverPatientId] = useState<string | null>(null);

    const parentRef = useRef<HTMLDivElement>(null);
    const previousHeightRef = useRef<number>(0);
    const lastMessageIdRef = useRef<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [activeTimeMsgId, setActiveTimeMsgId] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Identify last read staff message
    const lastReadStaffMsgId = useMemo(() => {
        const lastReadMsg = [...messages].reverse().find(m => m.senderType === 'staff' && m.readAt);
        return lastReadMsg ? lastReadMsg.id : null;
    }, [messages]);

    // Flatten data
    const flatItems = useMemo(() => {
        const items: any[] = [];
        let currentDateKey: string | null = null;

        messages.forEach((msg, index) => {
            const dateKey = formatDateDivider(msg.sentAt);

            if (dateKey !== currentDateKey) {
                items.push({ type: 'date', id: `date-${dateKey}`, dateStr: dateKey });
                currentDateKey = dateKey;
            }

            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];
            const FIVE_MINUTES = 5 * 60 * 1000;

            const isOwnMessage = msg.senderType === 'staff';

            const isFirstInGroup = !prevMsg ||
                prevMsg.senderType !== msg.senderType ||
                (new Date(msg.sentAt).getTime() - new Date(prevMsg.sentAt).getTime() > FIVE_MINUTES) ||
                formatDateDivider(prevMsg.sentAt) !== dateKey;

            const isLastInGroup = !nextMsg ||
                nextMsg.senderType !== msg.senderType ||
                (new Date(nextMsg.sentAt).getTime() - new Date(msg.sentAt).getTime() > FIVE_MINUTES) ||
                formatDateDivider(nextMsg.sentAt) !== dateKey;

            const isAbsoluteLastMsg = index === messages.length - 1 && isOwnMessage;
            const isLastReadMsg = msg.id === lastReadStaffMsgId;
            const showStatusBlock = isAbsoluteLastMsg || (isOwnMessage && isLastReadMsg);

            items.push({
                type: 'message',
                id: msg.id,
                message: msg,
                isOwnMessage,
                isFirstInGroup,
                isLastInGroup,
                showStatusBlock
            });
        });

        return items;
    }, [messages, lastReadStaffMsgId]);

    // Virtualizer
    const virtualizer = useVirtualizer({
        count: flatItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80,
        overscan: 10,
    });

    const scrollToBottom = (smooth = false) => {
        if (flatItems.length > 0) {
            virtualizer.scrollToIndex(flatItems.length - 1, {
                align: 'end',
                behavior: smooth ? 'smooth' : 'auto'
            });
            setShowScrollButton(false);
        }
    };

    const lastItemId = flatItems.length > 0 ? flatItems[flatItems.length - 1].id : null;

    useEffect(() => {
        if (!loading && lastItemId) {
            if (lastMessageIdRef.current !== lastItemId) {
                requestAnimationFrame(() => scrollToBottom());
                lastMessageIdRef.current = lastItemId;
            }
        }
    }, [loading, lastItemId]);

    useEffect(() => {
        if (isPatientTyping && !showScrollButton) scrollToBottom(true);
    }, [isPatientTyping])

    // Load More
    const handleScroll = async (e: UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

        setShowScrollButton(distanceFromBottom > 50);

        if (loadingMore || !hasMore) return;

        if (target.scrollTop <= 1 && flatItems.length > 0) {
            previousHeightRef.current = target.scrollHeight;
            await loadMore();
            setTimeout(() => {
                if (parentRef.current) {
                    const newHeight = parentRef.current.scrollHeight;
                    parentRef.current.scrollTop = newHeight - previousHeightRef.current;
                }
            }, 0);
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
        emitTyping();
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
        scrollToBottom();

        try {
            await sendMessage(text);
            scrollToBottom();
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

    const getLatestZone = (conv: Conversation) => {
        const assessments = conv.patient?.assessments;
        if (!assessments || assessments.length === 0) return 'unknown';
        const sorted = [...assessments].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sorted[0]?.zone || 'unknown';
    };

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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-md z-20 relative">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shadow-sm text-sm border border-primary/20">
                        {conversation.patient?.firstName?.[0]?.toUpperCase()}
                        {conversation.patient?.lastName?.[0]?.toUpperCase()}
                        {isPatientOnline && (<span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500" />)}
                        {/* <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500 ${isPatientOnline ? 'bg-green-500' : 'bg-amber-400'}`} /> */}
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

                <button
                    onClick={() => setShowSlideOverPatientId(conversation.patientId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                    <Info className="h-4 w-4 text-slate-450" />
                    <span className="hidden sm:block">Patient Details</span>
                </button>
            </div>

            {/* Chat Body (Virtual Scroll Area) */}
            <div className="flex-1 relative min-h-0 flex flex-col bg-slate-50/50 dark:bg-slate-900/30">
                <div
                    ref={parentRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto relative p-4"
                >
                    {isReconnecting && (
                        <div className="sticky top-4 z-10 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 flex items-center justify-center gap-2 mb-4 mx-auto max-w-sm shadow-sm">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600 dark:border-amber-500"></div>
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-500">Reconnecting...</span>
                        </div>
                    )}

                    {loadingMore && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white/80 dark:bg-slate-800/80 p-2 rounded-full shadow-sm backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        </div>
                    )}

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
                        <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center space-y-4">
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
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const item = flatItems[virtualRow.index];

                                return (
                                    <div
                                        key={item.id}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                        className="px-2"
                                    >
                                        {item.type === 'date' ? (
                                            <div className="flex justify-center pt-6 pb-4">
                                                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700/50 shadow-2xs uppercase tracking-wider">
                                                    {item.dateStr}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className={`w-full ${item.isFirstInGroup ? 'pt-6' : ''} pb-1`}>
                                                {!item.isOwnMessage && item.isFirstInGroup && (
                                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-1.5 mb-1 block text-left">
                                                        {patientName}
                                                    </span>
                                                )}

                                                <MessageBubble
                                                    message={item.message}
                                                    isOwnMessage={item.isOwnMessage}
                                                    bubbleShapeClass={`rounded-2xl ${item.isOwnMessage
                                                        ? (item.isFirstInGroup && item.isLastInGroup ? '' : item.isFirstInGroup ? 'rounded-br-xs' : item.isLastInGroup ? 'rounded-tr-xs' : 'rounded-tr-xs rounded-br-xs')
                                                        : (item.isFirstInGroup && item.isLastInGroup ? '' : item.isFirstInGroup ? 'rounded-bl-xs' : item.isLastInGroup ? 'rounded-tl-xs' : 'rounded-tl-xs rounded-bl-xs')
                                                        }`}
                                                    showStatusBlock={item.showStatusBlock}
                                                    formatTime={formatBubbleTime}
                                                    isTimeVisible={activeTimeMsgId === item.id}
                                                    onToggleTime={() => setActiveTimeMsgId(prev => prev === item.id ? null : item.id)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Typing Indicator */}
                {(isPatientTyping && !showScrollButton) && (
                    <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-2">
                        <span className="text-xs text-slate-500 italic">{patientName} is typing</span>
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}

                {/* Scroll to bottom button */}
                <button
                    onClick={() => scrollToBottom(true)}
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center w-9 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-full text-slate-500 hover:text-primary transition-all duration-300 z-20 ${showScrollButton
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                        }`}
                >
                    {isPatientTyping ? (
                        <div className="flex gap-1">
                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>) : <ChevronDown className="w-5 h-5" />}
                </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-20 relative">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={handleTextChange}
                        disabled={isReconnecting}
                        placeholder={isReconnecting ? "Reconnecting..." : "Type a message..."}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="flex-1 resize-none overflow-y-auto max-h-[150px] min-h-[44px] px-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 text-sm text-slate-900 dark:text-white transition-all disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || sending || isReconnecting}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.97] transition-all text-white disabled:opacity-30 disabled:pointer-events-none shadow-md shrink-0 shadow-primary/10 cursor-pointer"
                    >
                        <Send className="w-4.5 h-4.5" />
                    </button>
                </div>
            </form>

            <PatientSlideOver patientId={showSlideOverPatientId} onClose={() => setShowSlideOverPatientId(null)} />
        </div>
    );
}