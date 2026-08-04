import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/types/chat';
import { useSocket } from './useSocket';

export function useStaffChat(conversationId: string | null) {
    const { socket, isConnected, isReconnecting } = useSocket();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPatientTyping, setIsPatientTyping] = useState(false);

    const latestSentAtRef = useRef<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Offline queue: stored in ref and synced to localStorage
    const pendingQueueRef = useRef<{ id: string; body: string; client_timestamp: number }[]>([]);
    const isFlushingRef = useRef(false);
    const [flushTrigger, setFlushTrigger] = useState(0);

    // 1. Calculate latest timestamp for polling based ONLY on confirmed messages
    useEffect(() => {
        const confirmedMessages = messages.filter(m => !m.isPending);
        if (confirmedMessages.length > 0) {
            latestSentAtRef.current = new Date(
                Math.max(...confirmedMessages.map(m => new Date(m.sentAt).getTime()))
            ).toISOString();
        } else {
            latestSentAtRef.current = null;
        }
    }, [messages]);

    // Helper to sync queue to localStorage
    const syncQueueToStorage = useCallback((queue: any[]) => {
        if (!conversationId) return;
        try {
            localStorage.setItem(`staff_chat_queue_${conversationId}`, JSON.stringify(queue));
        } catch (e) {
            console.error('Failed to sync offline queue to storage');
        }
    }, [conversationId]);

    // 2. Restore queue from localStorage on mount/conversation change
    useEffect(() => {
        if (!conversationId) return;
        try {
            const savedQueue = localStorage.getItem(`staff_chat_queue_${conversationId}`);
            if (savedQueue) {
                pendingQueueRef.current = JSON.parse(savedQueue);
                if (pendingQueueRef.current.length > 0 && isConnected) {
                    setFlushTrigger(n => n + 1);
                }
            }
        } catch (e) {
            console.error('Failed to parse offline queue');
        }
    }, [conversationId, isConnected]);

    // WebSocket event listeners
    useEffect(() => {
        if (!socket || !conversationId) return;

        const handleMessageReceive = (message: ChatMessage) => {
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                if (existingIds.has(message.id)) return prev;
                return [...prev, message];
            });
            socket.emit('message:read', { conversationId });
        };

        const handleMessageRead = (data: { conversationId: string, readBy: string }) => {
            if (data.conversationId === conversationId && data.readBy === 'patient') {
                setMessages(prev => prev.map(m => m.readAt ? m : { ...m, readAt: new Date().toISOString() }));
            }
        };

        const handleTypingStart = (data: { userType: string }) => {
            if (data.userType === 'patient') setIsPatientTyping(true);
        };

        const handleTypingStop = (data: { userType: string }) => {
            if (data.userType === 'patient') setIsPatientTyping(false);
        };

        socket.on('message:receive', handleMessageReceive);
        socket.on('message:read', handleMessageRead);
        socket.on('typing:start', handleTypingStart);
        socket.on('typing:stop', handleTypingStop);

        return () => {
            socket.off('message:receive', handleMessageReceive);
            socket.off('message:read', handleMessageRead);
            socket.off('typing:start', handleTypingStart);
            socket.off('typing:stop', handleTypingStop);
        };
    }, [socket, conversationId]);

    // Join room when conversation changes
    useEffect(() => {
        if (!socket || !isConnected || !conversationId) return;

        const joinTimer = setTimeout(() => {
            socket.emit('join:conversation', { conversationId });
        }, 150);

        return () => {
            clearTimeout(joinTimer);
            socket.emit('leave:conversation', { conversationId });
        };
    }, [socket, isConnected, conversationId]);

    // Load initial messages when conversation changes
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            setHasMore(false);
            setLoading(false);
            setError(null);
            return;
        }

        const loadInitialMessages = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/chat/conversations/${conversationId}/messages?limit=20`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || 'Failed to load messages');

                setMessages([...data.data || []].reverse());
                setHasMore(data.meta?.hasMore || false);
                await markAsRead();
            } catch (err: any) {
                setError(err.message);
                toast.error(err.message || 'Failed to load messages');
            } finally {
                setLoading(false);
            }
        };

        loadInitialMessages();
    }, [conversationId]);

    // Background polling for new messages (fallback when disconnected)
    useEffect(() => {
        if (!conversationId || isConnected) {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            return;
        }

        pollingIntervalRef.current = setInterval(async () => {
            try {
                const query = latestSentAtRef.current
                    ? `?after=${encodeURIComponent(latestSentAtRef.current)}`
                    : '';
                const res = await fetch(`/api/chat/conversations/${conversationId}/messages${query}`);
                if (!res.ok) return;

                const json = await res.json();
                const newMessages: ChatMessage[] = json.data || [];
                if (newMessages.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
                        if (uniqueNew.length === 0) return prev;
                        return [...prev, ...uniqueNew.reverse()];
                    });
                }
            } catch (_) { /* ignore */ }
        }, 4000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [conversationId, isConnected]);

    // Trigger queue flush when connection is restored
    useEffect(() => {
        if (isConnected && socket && conversationId) {
            setFlushTrigger(n => n + 1);
            markAsRead();
        }
    }, [isConnected, socket, conversationId]);

    // 4. Flush Queue (FIFO, strictly handles socket communication)
    useEffect(() => {
        if (!isConnected || !socket || !conversationId) return;
        if (pendingQueueRef.current.length === 0) return;
        if (isFlushingRef.current) return;

        const flushQueue = async () => {
            isFlushingRef.current = true;

            // Process until queue is empty
            while (pendingQueueRef.current.length > 0) {
                // Take first item (FIFO)
                const pending = pendingQueueRef.current[0];

                try {
                    const ackMessage: ChatMessage = await new Promise((resolve, reject) => {
                        const timer = setTimeout(() => reject(new Error('Timeout')), 8000);

                        socket.emit('message:send', {
                            conversationId,
                            id: pending.id,
                            client_timestamp: pending.client_timestamp,
                            body: pending.body,
                        }, (response: any) => {
                            clearTimeout(timer);
                            if (response?.id) resolve(response);
                            else if (response?.data?.id) resolve(response.data);
                            else reject(new Error(response?.error?.message || 'Send failed'));
                        });
                    });

                    // Remove from queue only after success
                    pendingQueueRef.current = pendingQueueRef.current.slice(1);
                    syncQueueToStorage(pendingQueueRef.current);

                    // Replace optimistic message with confirmed message
                    setMessages(prev => {
                        const mapped = prev.map(m =>
                            m.id === pending.id ? { ...ackMessage, isPending: false, sentAt: m.sentAt } : m
                        );
                        // Dedup: keep first occurrence of each real id
                        const seen = new Set<string>();
                        return mapped.filter(m => {
                            if (seen.has(m.id)) return false;
                            seen.add(m.id);
                            return true;
                        });
                    });

                    // Short delay to maintain order
                    await new Promise(r => setTimeout(r, 100));

                } catch (_) {
                    // On failure, stop flushing — will retry on next trigger
                    break;
                }
            }

            isFlushingRef.current = false;
        };

        flushQueue();
    }, [flushTrigger, socket, isConnected, conversationId, syncQueueToStorage]);

    useEffect(() => {
        if (isConnected && messages.length > 0) {
            const fetchMissedMessages = async () => {
                try {

                    const query = latestSentAtRef.current
                        ? `?after=${encodeURIComponent(latestSentAtRef.current)}`
                        : '';

                    const res = await fetch(`/api/chat/conversations/${conversationId}/messages${query}`);
                    if (!res.ok) return;

                    const json = await res.json();
                    const missedMessages: ChatMessage[] = json.data || [];

                    if (missedMessages.length > 0) {
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id));
                            const uniqueNew = missedMessages.filter(m => !existingIds.has(m.id));
                            return [...prev, ...uniqueNew];
                        });
                    }
                } catch (e) {
                    console.error("Error fetching missed messages:", e);
                }
            };

            fetchMissedMessages();
        }
    }, [isConnected]);

    const emitTyping = useCallback(() => {
        if (!conversationId || !isConnected || !socket) return;

        socket.emit('typing:start', { conversationId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { conversationId });
        }, 3000);
    }, [conversationId, isConnected, socket]);

    // 3. Send Message Logic: Only updates Optimistic UI and enqueues
    const sendMessage = async (body: string) => {
        if (!conversationId || !body.trim()) return;

        // Clear typing
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socket && isConnected) socket.emit('typing:stop', { conversationId });

        const realUuid = uuidv4();
        const clientTimestamp = Date.now();
        const optimisticMessage: ChatMessage = {
            id: realUuid,
            conversationId,
            senderType: 'staff',
            senderId: 'optimistic',
            body: body.trim(),
            sentAt: new Date().toISOString(),
            readAt: null,
            isPending: true,
            client_timestamp: clientTimestamp,
        };

        // Always show optimistic message immediately
        setMessages(prev => [...prev, optimisticMessage]);

        // Add to persistent queue
        pendingQueueRef.current = [...pendingQueueRef.current, { id: realUuid, body: body.trim(), client_timestamp: clientTimestamp }];
        syncQueueToStorage(pendingQueueRef.current);

        // Trigger flush (if connected, the flushQueue effect will pick this up)
        setFlushTrigger(n => n + 1);
    };

    const loadMore = async () => {
        if (!conversationId || loadingMore || !hasMore || messages.length === 0) return;
        setLoadingMore(true);
        try {
            const oldestClientTimestamp = messages[0].client_timestamp || new Date(messages[0].sentAt).getTime();
            const res = await fetch(
                `/api/chat/conversations/${conversationId}/messages?before=${oldestClientTimestamp}&limit=20`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'Failed to load older messages');

            const olderMessages: ChatMessage[] = data.data || [];
            if (olderMessages.length > 0) {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueOlder = [...olderMessages].reverse().filter(m => !existingIds.has(m.id));
                    return [...uniqueOlder, ...prev];
                });
            }
            setHasMore(data.meta?.hasMore || false);
        } catch (err: any) {
            toast.error(err.message || 'Could not load older messages');
        } finally {
            setLoadingMore(false);
        }
    };

    const markAsRead = async () => {
        if (!conversationId) return;
        if (isConnected && socket) {
            socket.emit('message:read', { conversationId });
        } else {
            try {
                await fetch(`/api/chat/conversations/${conversationId}/read`, { method: 'PATCH' });
            } catch (_) { /* fail silently */ }
        }
    };

    return {
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
        markAsRead,
    };
}
