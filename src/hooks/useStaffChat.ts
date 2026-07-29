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
    const [pendingMessages, setPendingMessages] = useState<{ id: string, body: string }[]>([]);

    const latestSentAtRef = useRef<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            // Auto mark as read
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
                if (!res.ok) {
                    throw new Error(data.error?.message || 'Failed to load messages');
                }

                const fetchedMessages = data.data || [];
                setMessages([...fetchedMessages].reverse());
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



    // Handle sending pending messages on reconnect
    useEffect(() => {
        if (isConnected && socket && conversationId && pendingMessages.length > 0) {
            const sendPending = async () => {
                const msgsToProcess = [...pendingMessages];
                setPendingMessages([]);

                for (const pending of msgsToProcess) {
                    try {
                        const newMessage: ChatMessage = await new Promise((resolve, reject) => {
                            socket.emit('message:send', { conversationId, body: pending.body }, (response: any) => {
                                if (response?.id) resolve(response);
                                else reject(new Error('No response'));
                            });
                        });
                        setMessages(prev => prev.map(m => m.id === pending.id ? newMessage : m));
                    } catch (e) {
                        setPendingMessages(prev => [...prev, pending]);
                    }
                }
            };
            sendPending();
        }
    }, [isConnected, socket, conversationId, pendingMessages]);

    // Background polling for new messages (fallback)
    useEffect(() => {
        if (!conversationId || isConnected) {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            return;
        }

        const startPolling = () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const query = latestSentAtRef.current ? `?after=${encodeURIComponent(latestSentAtRef.current)}` : '';
                    const res = await fetch(`/api/chat/conversations/${conversationId}/messages${query}`);

                    if (!res.ok) return;

                    const json = await res.json();
                    const newMessages: ChatMessage[] = json.data || [];

                    if (newMessages.length > 0) {
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id));
                            const uniqueNew = [...newMessages].reverse().filter(m => !existingIds.has(m.id));
                            if (uniqueNew.length === 0) return prev;
                            // Sort uniqueNew chronologically if any, and append
                            return [...prev, ...uniqueNew.reverse()];
                        });
                        await markAsRead();
                    }
                } catch (e) {
                    // Ignore background polling errors
                }
            }, 4000);
        };

        startPolling();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [conversationId, isConnected]);

    const emitTyping = useCallback(() => {
        if (!conversationId || !isConnected || !socket) return;

        socket.emit('typing:start', { conversationId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing:stop', { conversationId });
        }, 3000);
    }, [conversationId, isConnected, socket]);

    const sendMessage = async (body: string) => {
        if (!conversationId || !body.trim() || sending) return;

        // Clear typing status
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socket && isConnected) socket.emit('typing:stop', { conversationId });

        setSending(true);
        try {
            if (isConnected && socket) {
                const newMessage: ChatMessage = await new Promise((resolve, reject) => {
                    socket.emit('message:send', { conversationId, body: body.trim() }, (response: any) => {
                        if (response?.id) resolve(response);
                        else reject(new Error('Failed to send message via socket'));
                    });
                });

                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    if (existingIds.has(newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                return newMessage;
            } else {
                const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ body: body.trim() }),
                });

                const responseJson = await res.json();

                if (!res.ok) {
                    throw new Error(responseJson.error?.message || 'Failed to send message');
                }

                const newMessage = responseJson.data || responseJson;
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    if (existingIds.has(newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                return newMessage;
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to send message');
            // Queue for offline
            const tempId = `temp-${Date.now()}`;
            const optimisticMessage: ChatMessage = {
                id: tempId,
                conversationId,
                senderType: 'staff',
                senderId: 'optimistic',
                body: body.trim(),
                sentAt: new Date().toISOString(),
                readAt: null
            };

            setMessages(prev => [...prev, optimisticMessage]);
            setPendingMessages(prev => [...prev, { id: tempId, body: body.trim() }]);
        } finally {
            setSending(false);
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

            if (!res.ok) {
                throw new Error(data.error?.message || 'Failed to load older messages');
            }

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
            } catch (e) {
                // Fail silently
            }
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
