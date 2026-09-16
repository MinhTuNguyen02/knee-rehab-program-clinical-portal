"use client";

import { useState, useRef, useEffect, UIEvent, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Conversation, ChatMessage } from '@/types/chat';
import { useStaffChat } from '@/hooks/useStaffChat';
import { MessageBubble } from './MessageBubble';
import { ZoneBadge } from '@/components/ui/ZoneBadge';
import { PatientSlideOver } from '@/components/management/PatientSlideOver';
import { StickerPicker } from './StickerPicker';
import { ChatMediaDrawer } from './ChatMediaDrawer';
import { Send, MessageSquare, AlertCircle, Info, ArrowLeft, ChevronDown, Smile, SmilePlus, CornerUpLeft, X, ImagePlus, Flame, Sticker, Images } from 'lucide-react';
import { formatDateDivider, formatBubbleTime } from '@/lib/utils';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { EmojiClickData } from 'emoji-picker-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const DEFAULT_REACTIONS = [
    { unified: '1f44d', emoji: '👍' },
    { unified: '2764-fe0f', emoji: '❤️' },
    { unified: '1f606', emoji: '😆' },
    { unified: '1f62e', emoji: '😮' },
];

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
        loadMore,
        toggleReaction,
        setMessages,
    } = useStaffChat(conversation ? conversation.id : null);

    const [inputText, setInputText] = useState('');
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [imageToSend, setImageToSend] = useState<string | null>(null);  // Cloudinary URL after upload
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null); // local preview
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [showSlideOverPatientId, setShowSlideOverPatientId] = useState<string | null>(null);
    const [showMediaDrawer, setShowMediaDrawer] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);

    const parentRef = useRef<HTMLDivElement>(null);
    const previousHeightRef = useRef<number>(0);
    const lastMessageIdRef = useRef<string | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const emojiBtnRef = useRef<HTMLButtonElement>(null);
    const stickerPickerRef = useRef<HTMLDivElement>(null);
    const stickerBtnRef = useRef<HTMLButtonElement>(null);
    const reactionPickerRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTimeMsgId, setActiveTimeMsgId] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    useEffect(() => {
        if (conversation?.id) {
            window.dispatchEvent(new CustomEvent('chat_opened', { detail: conversation.id }));
        }

        return () => {
            window.dispatchEvent(new Event('chat_closed'));
        };
    }, [conversation?.id]);

    // Close sticker picker when clicking outside
    useEffect(() => {
        if (!showStickerPicker) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                stickerPickerRef.current &&
                !stickerPickerRef.current.contains(e.target as Node) &&
                stickerBtnRef.current &&
                !stickerBtnRef.current.contains(e.target as Node)
            ) {
                setShowStickerPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showStickerPicker]);

    // Close reaction picker when clicking outside
    useEffect(() => {
        if (!reactionPickerMsgId) return;
        const handler = (e: MouseEvent) => {
            if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
                setReactionPickerMsgId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [reactionPickerMsgId]);

    // Close emoji picker when clicking outside
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(e.target as Node) &&
                emojiBtnRef.current &&
                !emojiBtnRef.current.contains(e.target as Node)
            ) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
        const emoji = emojiData.emoji;
        const textarea = inputRef.current;
        if (!textarea) {
            setInputText(prev => prev + emoji);
            return;
        }
        const start = textarea.selectionStart ?? inputText.length;
        const end = textarea.selectionEnd ?? inputText.length;
        const newText = inputText.slice(0, start) + emoji + inputText.slice(end);
        setInputText(newText);
        // Restore cursor position after state update
        requestAnimationFrame(() => {
            textarea.focus();
            const newPos = start + emoji.length;
            textarea.setSelectionRange(newPos, newPos);
            // Auto-resize
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        });
    }, [inputText]);

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

    // Defer measureElement via queueMicrotask to prevent flushSync-inside-render error.
    const measureRef = useCallback((el: Element | null) => {
        if (!el) return;
        queueMicrotask(() => {
            if (el.isConnected) {
                virtualizer.measureElement(el);
            }
        });
    }, [virtualizer]);

    const scrollToBottom = (smooth = false) => {
        if (flatItems.length > 0) {
            virtualizer.scrollToIndex(flatItems.length - 1, {
                align: 'end',
                behavior: smooth ? 'smooth' : 'auto'
            });
            setShowScrollButton(false);
        }
    };

    const scrollToMessage = async (target: string | ChatMessage) => {
        const messageId = typeof target === 'string' ? target : target.id;
        const targetMessage = typeof target === 'object' ? target : messages.find(m => m.id === messageId);

        let index = flatItems.findIndex(item => item.id === messageId);

        // If message is not yet loaded in chat, fetch older messages around its timestamp
        if (index === -1 && targetMessage && conversation?.id) {
            const targetTime = targetMessage.client_timestamp || new Date(targetMessage.sentAt).getTime();
            try {
                const res = await fetch(`/api/chat/conversations/${conversation.id}/messages?before=${targetTime + 15000}&limit=40`);
                const data = await res.json();
                if (res.ok && data.data && data.data.length > 0) {
                    const olderMsgs: ChatMessage[] = data.data;
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueOlder = olderMsgs.filter(m => !existingIds.has(m.id)).reverse();
                        return [...uniqueOlder, ...prev];
                    });
                }
            } catch (err) {
                console.error('Failed to load older messages for jump:', err);
            }
        }

        // Wait for state updates and DOM elements to settle
        setTimeout(() => {
            const finalIndex = flatItems.findIndex(item => item.id === messageId);
            if (finalIndex !== -1) {
                // Instantly mount target row in virtualizer
                virtualizer.scrollToIndex(finalIndex, { align: 'center', behavior: 'auto' });

                // Smoothly center the element once mounted
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        const el = document.getElementById(`msg-${messageId}`);
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        setHighlightedMessageId(messageId);
                        setTimeout(() => {
                            setHighlightedMessageId(curr => curr === messageId ? null : curr);
                        }, 2500);
                    }, 60);
                });
            }
        }, 120);
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

    const uploadImageFile = async (file: File) => {
        setIsUploadingImage(true);
        setImagePreviewUrl(URL.createObjectURL(file));
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/chat/upload-image', { method: 'POST', body: fd });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Upload failed');
            setImageToSend(json.data?.url || json.url);
        } catch (err: any) {
            setImagePreviewUrl(null);
            setImageToSend(null);
            alert(err.message || 'Image upload failed');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadImageFile(file);
        e.target.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) uploadImageFile(file);
                return;
            }
        }
    };

    const clearImage = () => {
        setImageToSend(null);
        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
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
        if ((!text && !imageToSend) || sending || isUploadingImage) return;

        setInputText('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        inputRef.current?.focus();
        scrollToBottom();

        const imgUrl = imageToSend;
        clearImage();

        try {
            await sendMessage(text, replyingTo || undefined, imgUrl || undefined);
            setReplyingTo(null);
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

                <div className="flex items-center gap-2">
                    {/* Streak Indicator */}
                    {conversation && conversation.streakCount >= 3 && (
                        <div className={`flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 rounded-lg border transition-colors shadow-sm ${conversation.streakActiveToday
                                ? 'bg-orange-50 text-orange-500 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                                : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700'
                            }`}>
                            <Flame className={`w-4 h-4 ${conversation.streakActiveToday ? 'fill-orange-500 dark:fill-orange-400 text-orange-500 dark:text-orange-400' : 'fill-slate-400 dark:fill-slate-500 text-slate-400 dark:text-slate-500'}`} />
                            {conversation.streakCount}
                        </div>
                    )}

                    <button
                        onClick={() => setShowMediaDrawer(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                        title="Shared photos"
                    >
                        <Images className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="hidden sm:block">Photos</span>
                    </button>

                    <button
                        onClick={() => setShowSlideOverPatientId(conversation.patientId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                        <Info className="h-4 w-4 text-slate-450" />
                        <span className="hidden sm:block">Patient Details</span>
                    </button>
                </div>
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
                                        key={virtualRow.key}
                                        id={item.type === 'message' ? `msg-${item.id}` : undefined}
                                        data-index={virtualRow.index}
                                        ref={measureRef}
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

                                                {/* Hover wrapper: relative for absolute toolbar */}
                                                <div
                                                    className="relative w-full"
                                                    onMouseEnter={() => {
                                                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                        setHoveredMsgId(item.id);
                                                    }}
                                                    onMouseLeave={() => {
                                                        if (reactionPickerMsgId === item.id) return;
                                                        hoverTimeoutRef.current = setTimeout(() => setHoveredMsgId(null), 120);
                                                    }}
                                                >
                                                    {/* Reaction toolbar — absolute, above the bubble */}
                                                    <div className={`absolute bottom-full mb-1 z-30 flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-1 shadow-md transition-all duration-150
                                                        ${item.isOwnMessage ? 'right-0' : 'left-0'}
                                                        ${(hoveredMsgId === item.id || reactionPickerMsgId === item.id)
                                                            ? 'opacity-100 scale-100 pointer-events-auto'
                                                            : 'opacity-0 scale-90 pointer-events-none'}`}
                                                    >
                                                        {DEFAULT_REACTIONS.map(({ unified, emoji }) => (
                                                            <button
                                                                key={unified}
                                                                type="button"
                                                                title={emoji}
                                                                onClick={() => toggleReaction(item.id, emoji)}
                                                                className="text-lg leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-125 transition-all duration-100 cursor-pointer"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}

                                                        <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5 shrink-0" />

                                                        <div className="relative" ref={reactionPickerMsgId === item.id ? reactionPickerRef : null}>
                                                            <button
                                                                type="button"
                                                                title="More reactions"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setReactionPickerMsgId(prev => prev === item.id ? null : item.id);
                                                                    setHoveredMsgId(item.id);
                                                                }}
                                                                className={`w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer
                                                                    ${reactionPickerMsgId === item.id
                                                                        ? 'bg-primary/10 text-primary'
                                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary'}`}
                                                            >
                                                                <SmilePlus className="w-4 h-4" />
                                                            </button>

                                                            {reactionPickerMsgId === item.id && (
                                                                <div className={`absolute bottom-full mb-2 z-50 drop-shadow-2xl ${item.isOwnMessage ? 'right-0' : 'left-0'}`}>
                                                                    <EmojiPicker
                                                                        onEmojiClick={(emojiData) => {
                                                                            toggleReaction(item.id, emojiData.emoji);
                                                                            setReactionPickerMsgId(null);
                                                                            setHoveredMsgId(null);
                                                                        }}
                                                                        theme={"auto" as any}
                                                                        emojiStyle={"native" as any}
                                                                        autoFocusSearch={false}
                                                                        height={360}
                                                                        width={300}
                                                                        searchPlaceholder="Find emoji..."
                                                                        lazyLoadEmojis
                                                                        previewConfig={{ showPreview: false }}
                                                                        style={{
                                                                            '--epr-bg-color': 'var(--color-background, #fff)',
                                                                            '--epr-category-label-bg-color': 'var(--color-background, #fff)',
                                                                            '--epr-text-color': 'var(--color-foreground, #0f172a)',
                                                                            '--epr-search-border-color': 'var(--color-border, #e2e8f0)',
                                                                            '--epr-border-color': 'var(--color-border, #e2e8f0)',
                                                                            borderRadius: '16px',
                                                                            border: '1px solid',
                                                                            borderColor: 'var(--color-border, #e2e8f0)',
                                                                        } as React.CSSProperties}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5 shrink-0" />

                                                        <button
                                                            type="button"
                                                            title="Reply"
                                                            onClick={() => {
                                                                setReplyingTo(item.message);
                                                                inputRef.current?.focus();
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all cursor-pointer"
                                                        >
                                                            <CornerUpLeft className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Message bubble */}
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
                                                        onToggleReaction={(emoji) => toggleReaction(item.id, emoji)}
                                                        onReplyClick={() => {
                                                            if (item.message.replyToMessageId) {
                                                                scrollToMessage(item.message.replyToMessageId);
                                                            }
                                                        }}
                                                        patientId={conversation?.patientId || ''}
                                                        isHighlighted={highlightedMessageId === item.id}
                                                    />
                                                </div>
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
                    aria-label="Scroll to bottom"
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

                {replyingTo && (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 mb-3 border border-slate-200 dark:border-slate-700 mx-auto max-w-4xl relative shadow-sm">
                        <div className="w-1 absolute left-0 top-2 bottom-2 bg-primary rounded-r-md"></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-primary mb-0.5">
                                Replying to {replyingTo.senderType === 'staff' ? 'You' : patientName}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                {replyingTo.stickerUrl ? '🎨 Sticker' : replyingTo.imageUrl ? '📷 Photo' : replyingTo.body}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Image preview strip */}
                {imagePreviewUrl && (
                    <div className="flex items-center gap-3 mb-3 mx-auto max-w-4xl">
                        <div className="relative inline-block">
                            <img
                                src={imagePreviewUrl}
                                alt="Image to send"
                                className="h-20 w-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
                            />
                            {isUploadingImage && (
                                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={clearImage}
                                disabled={isUploadingImage}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-slate-700 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        {!isUploadingImage && <span className="text-xs text-green-600 dark:text-green-400 font-medium">Ready to send</span>}
                        {isUploadingImage && <span className="text-xs text-slate-500 dark:text-slate-400">Uploading...</span>}
                    </div>
                )}

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <div
                        ref={emojiPickerRef}
                        className="absolute bottom-full left-4 mb-2 z-50 drop-shadow-2xl"
                    >
                        <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            theme={"auto" as any}
                            emojiStyle={"native" as any}
                            height={380}
                            width={320}
                            searchPlaceholder="Find emoji..."
                            lazyLoadEmojis
                            previewConfig={{ showPreview: false }}
                            style={{
                                '--epr-bg-color': 'var(--color-background, #fff)',
                                '--epr-category-label-bg-color': 'var(--color-background, #fff)',
                                '--epr-text-color': 'var(--color-foreground, #0f172a)',
                                '--epr-search-border-color': 'var(--color-border, #e2e8f0)',
                                '--epr-border-color': 'var(--color-border, #e2e8f0)',
                                borderRadius: '16px',
                                border: '1px solid',
                                borderColor: 'var(--color-border, #e2e8f0)',
                            } as React.CSSProperties}
                        />
                    </div>
                )}

                {/* Sticker Picker Popover */}
                {showStickerPicker && (
                    <div
                        ref={stickerPickerRef}
                        className="absolute bottom-full left-4 mb-2 z-50 drop-shadow-2xl"
                    >
                        <StickerPicker
                            onSelectSticker={async (stickerUrl) => {
                                setShowStickerPicker(false);
                                try {
                                    await sendMessage('', replyingTo || undefined, undefined, stickerUrl);
                                    setReplyingTo(null);
                                    scrollToBottom();
                                } catch (err) { }
                            }}
                            onClose={() => setShowStickerPicker(false)}
                        />
                    </div>
                )}

                <div className="flex items-end gap-2 max-w-4xl mx-auto">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {/* Emoji Button */}
                    <button
                        ref={emojiBtnRef}
                        type="button"
                        aria-label="Open emoji picker"
                        onClick={() => {
                            setShowEmojiPicker(prev => !prev);
                            setShowStickerPicker(false);
                        }}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all shrink-0 cursor-pointer
                            ${showEmojiPicker
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-400 hover:text-primary dark:hover:text-primary'
                            }`}
                    >
                        <Smile className="w-5 h-5" />
                    </button>

                    {/* Sticker Button */}
                    <button
                        ref={stickerBtnRef}
                        type="button"
                        aria-label="Open sticker picker"
                        onClick={() => {
                            setShowStickerPicker(prev => !prev);
                            setShowEmojiPicker(false);
                        }}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all shrink-0 cursor-pointer
                            ${showStickerPicker
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-400 hover:text-primary dark:hover:text-primary'
                            }`}
                    >
                        <Sticker className="w-5 h-5" />
                    </button>

                    {/* Image Button */}
                    <button
                        type="button"
                        aria-label="Send image"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border transition-all shrink-0 cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-400 hover:text-primary dark:hover:text-primary disabled:opacity-40"
                    >
                        <ImagePlus className="w-5 h-5" />
                    </button>

                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onChange={handleTextChange}
                        onPaste={handlePaste}
                        placeholder={"Type a message..."}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className="flex-1 resize-none overflow-y-auto max-h-[150px] min-h-[44px] px-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 text-sm text-slate-900 dark:text-white transition-all disabled:opacity-50"
                    />
                    <button
                        aria-label="Send message"
                        type="submit"
                        disabled={(!inputText.trim() && !imageToSend) || sending || isUploadingImage}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.97] transition-all text-white disabled:opacity-30 disabled:pointer-events-none shadow-md shrink-0 shadow-primary/10 cursor-pointer"
                    >
                        <Send className="w-4.5 h-4.5" />
                    </button>
                </div>
            </form>

            <PatientSlideOver patientId={showSlideOverPatientId} onClose={() => setShowSlideOverPatientId(null)} />

            <ChatMediaDrawer
                isOpen={showMediaDrawer}
                onClose={() => setShowMediaDrawer(false)}
                conversationId={conversation.id}
                patientName={patientName}
                onJumpToMessage={scrollToMessage}
            />
        </div>
    );
}