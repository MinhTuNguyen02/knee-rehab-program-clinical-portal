import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getClientMessaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

export interface StaffNotification {
    id: string;
    staffId: string;
    type: 'patient_message';
    title: string;
    body: string;
    payload: Record<string, any> | null;
    readAt: string | null;
    createdAt: string;
}

const infiniteFetcher = async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch');
    return json;
};

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to fetch');
    return json.data;
};

export function useStaffNotifications() {
    const [isFcmActive, setIsFcmActive] = useState<boolean | null>(null);
    const activeConversationIdRef = useRef<string | null>(null);

    const getKey = (pageIndex: number, previousPageData: any) => {
        if (previousPageData && !previousPageData.meta?.hasMore) return null;

        if (pageIndex === 0) return `/api/staff/notifications?limit=20`;

        const lastItem = previousPageData.data[previousPageData.data.length - 1];
        return `/api/staff/notifications?limit=20&before=${lastItem.createdAt}`;
    };

    const {
        data: infiniteData,
        error: listError,
        size,
        setSize,
        isLoading: listLoading,
        isValidating,
        mutate: mutateList,
    } = useSWRInfinite(getKey, infiniteFetcher, {
        refreshInterval: isFcmActive === false ? 30000 : 0,
        revalidateOnFocus: true,
    });

    const {
        data: countData,
        error: countError,
        isLoading: countLoading,
        mutate: mutateCount,
    } = useSWR<{ count: number }>(
        '/api/staff/notifications/unread-count',
        fetcher,
        {
            refreshInterval: isFcmActive === false ? 30000 : 0,
            revalidateOnFocus: true,
        }
    );

    const notificationsData = infiniteData ? infiniteData.flatMap(page => page.data) : [];
    const isLoadingMore = listLoading || (size > 0 && infiniteData && typeof infiniteData[size - 1] === "undefined");
    const isEmpty = infiniteData?.[0]?.data?.length === 0;
    const hasMore = isEmpty ? false : (infiniteData && infiniteData[infiniteData.length - 1]?.meta?.hasMore);

    const loadMore = () => {
        if (hasMore && !isLoadingMore) {
            setSize(size + 1);
        }
    };

    const refreshNotifications = () => {
        mutateList();
        mutateCount();
    };

    const markAsRead = async (id: string) => {
        try {
            mutateList((prev) => prev?.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n), false);
            mutateCount((prev) => prev ? { count: Math.max(0, prev.count - 1) } : prev, false);

            const res = await fetch(`/api/staff/notifications/${id}/read`, { method: 'PATCH' });
            if (!res.ok) throw new Error('Failed to mark as read');
        } catch (err) {
            console.error(err);
        } finally {
            refreshNotifications();
        }
    };

    const markAllAsRead = async () => {
        try {
            mutateList((prev) => prev?.map(n => ({ ...n, readAt: new Date().toISOString() })), false);
            mutateCount({ count: 0 }, false);

            const res = await fetch('/api/staff/notifications', { method: 'PATCH' });
            if (!res.ok) throw new Error('Failed to mark all as read');
        } catch (err) {
            console.error(err);
        } finally {
            refreshNotifications();
        }
    };

    const checkAndClearUnread = useCallback((cid: string | null, data: any[]) => {
        if (!cid || !data || data.length === 0) return;

        const unreadIds = data
            .filter(n => !n.readAt && n.payload?.conversationId === cid)
            .map(n => n.id);

        if (unreadIds.length > 0) {
            mutateList(pages => {
                if (!pages) return pages;
                return pages.map(page => ({
                    ...page,
                    data: page.data.map((n: StaffNotification) =>
                        unreadIds.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n
                    )
                }));
            }, false);

            mutateCount(prev => prev ? { count: Math.max(0, prev.count - unreadIds.length) } : prev, false);

            unreadIds.forEach(id => {
                fetch(`/api/staff/notifications/${id}/read`, { method: 'PATCH' }).catch(console.error);
            });
        }
    }, [mutateList, mutateCount]);

    const notificationsDataRef = useRef(notificationsData);
    useEffect(() => {
        notificationsDataRef.current = notificationsData;
    }, [notificationsData]);

    useEffect(() => {
        const handleChatOpened = (e: CustomEvent) => {
            const cid = e.detail;
            activeConversationIdRef.current = cid;
            checkAndClearUnread(cid, notificationsDataRef.current);
        };
        const handleChatClosed = () => {
            activeConversationIdRef.current = null;
        };

        window.addEventListener('chat_opened', handleChatOpened as EventListener);
        window.addEventListener('chat_closed', handleChatClosed);

        return () => {
            window.removeEventListener('chat_opened', handleChatOpened as EventListener);
            window.removeEventListener('chat_closed', handleChatClosed);
        };
    }, [checkAndClearUnread]);

    useEffect(() => {
        checkAndClearUnread(activeConversationIdRef.current, notificationsData);
    }, [notificationsData, checkAndClearUnread]);

    // FCM Setup for Staff
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let active = true;

        const setupFCM = async () => {
            try {
                if (!('Notification' in window)) {
                    if (active) setIsFcmActive(false);
                    return;
                }

                if (Notification.permission === 'default') {
                    await Notification.requestPermission();
                }

                if (Notification.permission !== 'granted') {
                    if (active) setIsFcmActive(false);
                    return;
                }

                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                const messaging = await getClientMessaging();

                if (!messaging) {
                    if (active) setIsFcmActive(false);
                    return;
                }

                const fcmToken = await getToken(messaging, {
                    serviceWorkerRegistration: registration,
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                });

                if (fcmToken) {
                    await fetch('/api/staff/fcm-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fcmToken }),
                    });
                }

                onMessage(messaging, async (payload) => {
                    console.log('Staff Foreground FCM received:', payload);

                    const incomingCid = payload.data?.conversationId;
                    const notifId = payload.data?.id;
                    if (activeConversationIdRef.current === incomingCid) {
                        if (notifId) {
                            try {
                                await fetch(`/api/staff/notifications/${notifId}/read`, { method: 'PATCH' });
                                refreshNotifications();
                            } catch (e) { console.error('Auto-read failed', e); }
                        }
                        return;
                    }

                    refreshNotifications();
                });

                if (active) setIsFcmActive(true);

            } catch (err) {
                console.error('FCM Registration error (Staff):', err);
                if (active) setIsFcmActive(false);
            }
        };

        setupFCM();
        return () => { active = false; };
    }, []);

    return {
        notifications: notificationsData || [],
        unreadCount: countData?.count || 0,
        loading: listLoading || countLoading,
        loadingMore: isLoadingMore,
        hasMore,
        loadMore,
        error: listError || countError,
        isFcmActive,
        markAsRead,
        markAllAsRead,
        refresh: refreshNotifications
    };
}