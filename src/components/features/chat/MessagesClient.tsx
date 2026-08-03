"use client";

import { useState, useEffect, useRef } from 'react';
import { Conversation } from '@/types/chat';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { SocketProvider, useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';

export function MessagesClient() {
    return (
        <SocketProvider>
            <MessagesClientInner />
        </SocketProvider>
    );
}

function MessagesClientInner() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [onlinePatients, setOnlinePatients] = useState<Set<string>>(new Set());
    const globalOfflineTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const fetchConversations = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const res = await fetch('/api/chat/conversations');
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'Failed to load inbox conversations');
            }
            const data = await res.json();
            const list = data.data || data || [];

            // Map list to keep it as Conversation[]
            setConversations(list);
        } catch (err: any) {
            console.error('Error fetching conversations:', err);
            if (!isSilent) {
                toast.error(err.message || 'Failed to load inbox');
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    // Load list initially
    useEffect(() => {
        fetchConversations();
    }, []);

    const { socket, isConnected } = useSocket();

    // Polling list every 10 seconds for previews/unread counts
    useEffect(() => {
        if (isConnected) return;

        const timer = setInterval(() => {
            fetchConversations(true);
        }, 10000);
        return () => clearInterval(timer);
    }, [isConnected]);

    // Listen to global socket updates for inbox
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleConversationUpdate = (data: { conversationId: string, lastMessage: any }) => {
            setConversations(prev => {
                const idx = prev.findIndex(c => c.id === data.conversationId);
                if (idx === -1) {
                    // new conversation? Need to fetch to get patient details
                    fetchConversations(true);
                    return prev;
                }
                const updatedList = [...prev];
                const updatedConv = { ...updatedList[idx] };
                updatedConv.lastMessage = data.lastMessage;
                updatedConv.lastMessageAt = data.lastMessage.sentAt;

                // If it's from patient and we don't have it selected, increment unread count
                if (data.lastMessage.senderType === 'patient' && data.conversationId !== selectedConversationId) {
                    updatedConv.unreadCount = (updatedConv.unreadCount || 0) + 1;
                }

                updatedList[idx] = updatedConv;

                // re-sort by lastMessageAt
                updatedList.sort((a, b) => new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime());

                return updatedList;
            });
        };

        const handleGlobalStatus = (data: { patientId: string, isOnline: boolean }) => {
            if (data.isOnline) {
                if (globalOfflineTimersRef.current.has(data.patientId)) {
                    clearTimeout(globalOfflineTimersRef.current.get(data.patientId)!);
                    globalOfflineTimersRef.current.delete(data.patientId);
                }

                setOnlinePatients(prev => {
                    const newSet = new Set(prev);
                    newSet.add(data.patientId);
                    return newSet;
                });
            } else {
                const timer = setTimeout(() => {
                    setOnlinePatients(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(data.patientId);
                        return newSet;
                    });
                    globalOfflineTimersRef.current.delete(data.patientId);
                }, 10000);

                globalOfflineTimersRef.current.set(data.patientId, timer);
            }
        };

        const handleGlobalInitial = (onlineIds: string[]) => {
            setOnlinePatients(new Set(onlineIds));
        };

        socket.on('conversation:update', handleConversationUpdate);
        socket.on('patient:global_status', handleGlobalStatus);
        socket.on('patient:global_initial', handleGlobalInitial);

        return () => {
            socket.off('conversation:update', handleConversationUpdate);
            socket.off('patient:global_status', handleGlobalStatus);
            socket.off('patient:global_initial', handleGlobalInitial);
        };
    }, [socket, isConnected, selectedConversationId]);

    useEffect(() => {
        return () => {
            globalOfflineTimersRef.current.forEach(timer => clearTimeout(timer));
            globalOfflineTimersRef.current.clear();
        };
    }, []);

    // Find the currently selected conversation
    const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

    // Handle mark as read when selecting conversation
    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id);

        // Reset unread count locally for immediate response
        setConversations(prev =>
            prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c))
        );
    };

    const handleBack = () => {
        setSelectedConversationId(null);
    };

    return (
        <div className="-mx-4 -mt-4 sm:mx-0 sm:mt-0">

            <div className="mx-auto flex h-[calc(100dvh-4rem)] sm:h-[calc(100vh-10rem)] md:h-[calc(100vh-11rem)] bg-white dark:bg-slate-900 rounded-none sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-none sm:shadow-sm overflow-hidden animate-in fade-in duration-200">
                {/* Conversation List Column */}
                <div className={`${selectedConversationId ? 'hidden md:block' : 'w-full'} md:w-[320px] shrink-0 h-full`}>
                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversationId}
                        onSelect={handleSelectConversation}
                        loading={loading}
                        onlinePatients={onlinePatients}
                    />
                </div>

                {/* Conversation View Column */}
                <div className={`${!selectedConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full min-w-0`}>
                    <ConversationView
                        conversation={selectedConversation}
                        isPatientOnline={selectedConversation ? onlinePatients.has(selectedConversation.patientId) : false}
                        onBack={selectedConversationId ? handleBack : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
