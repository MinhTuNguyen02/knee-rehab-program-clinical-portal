import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { ChatMessage } from '@/types/chat';

export function useStaffChat(conversationId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const latestSentAtRef = useRef<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
                // Reverse to get chronological order (API returns newest first)
                setMessages(fetchedMessages.reverse());
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

    // Background polling for new messages
    useEffect(() => {
        if (!conversationId) return;

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
                            const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
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
            }
        };
    }, [conversationId]);

    const sendMessage = async (body: string) => {
        if (!conversationId || !body.trim() || sending) return;
        setSending(true);
        try {
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
        } catch (err: any) {
            toast.error(err.message || 'Failed to send message');
            throw err;
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
                    const uniqueOlder = olderMessages.reverse().filter(m => !existingIds.has(m.id));
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
        try {
            await fetch(`/api/chat/conversations/${conversationId}/read`, { method: 'PATCH' });
        } catch (e) {
            // Fail silently
        }
    };

    return {
        messages,
        loading,
        loadingMore,
        hasMore,
        sending,
        error,
        sendMessage,
        loadMore,
        markAsRead,
    };
}
