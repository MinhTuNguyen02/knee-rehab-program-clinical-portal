import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
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

    // Offline queue: stored in ref (no re-render on mutation)
    // flushCounter: state that triggers the flush effect
    const pendingQueueRef = useRef<{ id: string; body: string }[]>([]);
    const isFlushingRef = useRef(false);
    const [flushTrigger, setFlushTrigger] = useState(0);

    // Keep latest message timestamp updated for polling
    useEffect(() => {
        if (messages.length > 0) {
            latestSentAtRef.current = new Date(
                Math.max(...messages.map(m => new Date(m.sentAt).getTime()))
            ).toISOString();
        } else {
            latestSentAtRef.current = null;
        }
    }, [messages]);

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
        }
    }, [isConnected, socket, conversationId]);

    // Flush pending queue — runs whenever flushTrigger increments
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
                    const newMessage: ChatMessage = await new Promise((resolve, reject) => {
                        const timer = setTimeout(() => reject(new Error('Timeout')), 8000);

                        socket.emit('message:send', {
                            conversationId,
                            body: pending.body,
                            tempId: pending.id,
                        }, (response: any) => {
                            clearTimeout(timer);
                            if (response?.id) resolve(response);
                            else if (response?.data?.id) resolve(response.data);
                            else reject(new Error(response?.error?.message || 'Send failed'));
                        });
                    });

                    // Remove from queue only after success
                    pendingQueueRef.current = pendingQueueRef.current.slice(1);

                    // Replace optimistic message with confirmed message
                    setMessages(prev => {
                        const mapped = prev.map(m =>
                            m.id === pending.id ? { ...newMessage, isPending: false } : m
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
    // flushTrigger is NOT a dep here — it's only used to re-run via the
    // effect above. This effect re-runs when socket/conversationId changes.
    }, [flushTrigger, socket, isConnected, conversationId]);

    const emitTyping = useCallback(() => {
        if (!conversationId || !isConnected || !socket) return;

        socket.emit('typing:start', { conversationId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { conversationId });
        }, 3000);
    }, [conversationId, isConnected, socket]);

    const sendMessage = async (body: string) => {
        if (!conversationId || !body.trim()) return;

        // Clear typing
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socket && isConnected) socket.emit('typing:stop', { conversationId });

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimisticMessage: ChatMessage = {
            id: tempId,
            conversationId,
            senderType: 'staff',
            senderId: 'optimistic',
            body: body.trim(),
            sentAt: new Date().toISOString(),
            readAt: null,
            isPending: true,
        };

        // Always show optimistic message immediately
        setMessages(prev => [...prev, optimisticMessage]);

        if (isConnected && socket) {
            // Online path: send via socket, await ACK
            setSending(true);
            try {
                const newMessage: ChatMessage = await new Promise((resolve, reject) => {
                    const timer = setTimeout(() => reject(new Error('Timeout')), 8000);

                    socket.emit('message:send', {
                        conversationId,
                        body: body.trim(),
                        tempId,
                    }, (response: any) => {
                        clearTimeout(timer);
                        if (response?.id) resolve(response);
                        else if (response?.data?.id) resolve(response.data);
                        else reject(new Error(response?.error?.message || 'Invalid response'));
                    });
                });

                setMessages(prev => {
                    const mapped = prev.map(m =>
                        m.id === tempId ? { ...newMessage, isPending: false } : m
                    );
                    const seen = new Set<string>();
                    return mapped.filter(m => {
                        if (seen.has(m.id)) return false;
                        seen.add(m.id);
                        return true;
                    });
                });
            } catch (err: any) {
                // Socket send failed → queue for retry
                toast.error('Network error. Message queued.');
                pendingQueueRef.current = [...pendingQueueRef.current, { id: tempId, body: body.trim() }];
            } finally {
                setSending(false);
            }
        } else {
            // Offline path: queue immediately, DON'T block with sending flag
            pendingQueueRef.current = [...pendingQueueRef.current, { id: tempId, body: body.trim() }];
            // No toast — message is visible as pending in UI
        }
    };

    const loadMore = async () => {
        if (!conversationId || loadingMore || !hasMore || messages.length === 0) return;
        setLoadingMore(true);
        try {
            const oldestSentAt = messages[0].sentAt;
            const res = await fetch(
                `/api/chat/conversations/${conversationId}/messages?before=${encodeURIComponent(oldestSentAt)}&limit=20`
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
