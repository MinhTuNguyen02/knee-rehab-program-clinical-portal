"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Images, Download, MessageSquare, Calendar, Loader2 } from 'lucide-react';
import { ChatMessage } from '@/types/chat';
import { ImageLightbox, downloadImage } from './ImageLightbox';

export function getThumbnailUrl(url?: string, size = 300): string {
    if (!url) return '';
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
    }
    return url;
}

interface ChatMediaDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    patientName?: string;
    onJumpToMessage: (message: ChatMessage) => void;
}

interface GroupedMedia {
    monthYear: string;
    items: ChatMessage[];
}

export function ChatMediaDrawer({
    isOpen,
    onClose,
    conversationId,
    patientName,
    onJumpToMessage,
}: ChatMediaDrawerProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);
    const [media, setMedia] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle entrance and exit animation
    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    // Fetch initial media whenever drawer opens or conversationId changes
    useEffect(() => {
        if (!isOpen || !conversationId) return;

        let isCancelled = false;
        setLoading(true);
        setError(null);

        fetch(`/api/chat/conversations/${conversationId}/media?limit=36`)
            .then(async (res) => {
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || 'Failed to load media.');
                }
                return res.json();
            })
            .then((resJson) => {
                if (!isCancelled) {
                    const validMedia = (resJson.data || []).filter(
                        (m: ChatMessage) => Boolean(m.imageUrl) && !m.stickerUrl
                    );
                    setMedia(validMedia);
                    setHasMore(resJson.meta?.hasMore || false);
                }
            })
            .catch((err) => {
                if (!isCancelled) setError(err.message || 'Error loading photos');
            })
            .finally(() => {
                if (!isCancelled) setLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [isOpen, conversationId]);

    // Load older media on demand
    const handleLoadMore = async () => {
        if (loadingMore || !hasMore || media.length === 0) return;
        setLoadingMore(true);

        const oldestItem = media[media.length - 1];
        const before = oldestItem.sentAt;

        try {
            const res = await fetch(`/api/chat/conversations/${conversationId}/media?limit=36&before=${encodeURIComponent(before)}`);
            if (!res.ok) throw new Error('Failed to load older photos.');
            const resJson = await res.json();
            const olderItems = (resJson.data || []).filter(
                (m: ChatMessage) => Boolean(m.imageUrl) && !m.stickerUrl
            );

            setMedia(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueNew = olderItems.filter((m: ChatMessage) => !existingIds.has(m.id));
                return [...prev, ...uniqueNew];
            });
            setHasMore(resJson.meta?.hasMore || false);
        } catch (err: any) {
            console.error('Load more media error:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Keyboard accessibility: Escape key closes the drawer (unless lightbox is open)
    useEffect(() => {
        if (!isOpen || selectedImageIndex !== null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setVisible(false);
                setTimeout(onClose, 200);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedImageIndex, onClose]);

    // Prevent background scrolling when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Group items by Month and Year
    const groupedMedia = useMemo(() => {
        const groups: Record<string, ChatMessage[]> = {};
        for (const item of media) {
            const date = new Date(item.sentAt);
            const monthYear = date.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
            });
            if (!groups[monthYear]) {
                groups[monthYear] = [];
            }
            groups[monthYear].push(item);
        }

        return Object.entries(groups).map(([monthYear, items]): GroupedMedia => ({
            monthYear,
            items,
        }));
    }, [media]);

    const imageUrls = useMemo(() => {
        return media.map((m) => m.imageUrl!).filter(Boolean);
    }, [media]);

    const handleJump = (e: React.MouseEvent, item: ChatMessage) => {
        e.stopPropagation();
        setVisible(false);
        onClose();
        onJumpToMessage(item);
    };

    const handleDownloadSingle = (e: React.MouseEvent, url: string, dateStr: string) => {
        e.stopPropagation();
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        const formattedDate = new Date(dateStr).toISOString().slice(0, 10);
        downloadImage(url, `knee-rehab-${formattedDate}.${ext}`);
    };

    if (!mounted || (!isOpen && !visible)) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
            {/* Backdrop overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ${
                    visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => {
                    setVisible(false);
                    setTimeout(onClose, 200);
                }}
            />

            {/* Slide-over panel wrapper */}
            <div className="fixed inset-y-0 right-0 max-w-full flex">
                <div
                    className={`w-screen max-w-md sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out transform border-l border-slate-200 dark:border-slate-800 ${
                        visible ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Images className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                    Shared Photos
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {loading
                                        ? 'Loading photos...'
                                        : `${media.length} photo${media.length === 1 ? '' : 's'}${hasMore ? '+' : ''}${
                                              patientName ? ` · ${patientName}` : ''
                                          }`}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setVisible(false);
                                setTimeout(onClose, 200);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            aria-label="Close media drawer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        {loading && (
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {Array.from({ length: 9 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                                    />
                                ))}
                            </div>
                        )}

                        {!loading && error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {!loading && !error && media.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3 ring-8 ring-slate-100/50 dark:ring-slate-800/30">
                                    <Images className="w-8 h-8" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                                    No photos shared yet
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                                    Photos and medical images sent during this conversation will be organized and displayed here.
                                </p>
                            </div>
                        )}

                        {!loading && !error && media.length > 0 && (
                            <div className="space-y-6">
                                {groupedMedia.map((group) => (
                                    <div key={group.monthYear} className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 bg-white/90 dark:bg-slate-900/90 py-1 backdrop-blur-xs z-10">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{group.monthYear}</span>
                                            <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-400">
                                                {group.items.length}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                            {group.items.map((item) => {
                                                const globalIndex = media.findIndex((m) => m.id === item.id);
                                                const isPatientSender = item.senderType === 'patient';
                                                const sentDate = new Date(item.sentAt);
                                                const formattedTime = sentDate.toLocaleDateString('en-US', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                });

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => setSelectedImageIndex(globalIndex)}
                                                        className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-zoom-in border border-slate-200/60 dark:border-slate-700/60 shadow-xs hover:shadow-md transition-all duration-200"
                                                    >
                                                        {/* Optimized Thumbnail via Cloudinary transformation */}
                                                        <img
                                                            src={getThumbnailUrl(item.imageUrl, 280)}
                                                            alt="Shared media"
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            loading="lazy"
                                                            decoding="async"
                                                        />

                                                        {/* Hover overlay gradient */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2 pointer-events-none">
                                                            {/* Top bar: Sender Tag */}
                                                            <div className="flex items-center justify-between pointer-events-auto">
                                                                <span
                                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm shadow-2xs ${
                                                                        isPatientSender
                                                                            ? 'bg-amber-500/80 text-white'
                                                                            : 'bg-primary/80 text-white'
                                                                    }`}
                                                                >
                                                                    {isPatientSender ? 'Patient' : 'Staff'}
                                                                </span>

                                                                {/* Quick Action: Download */}
                                                                <button
                                                                    onClick={(e) =>
                                                                        handleDownloadSingle(
                                                                            e,
                                                                            item.imageUrl!,
                                                                            item.sentAt
                                                                        )
                                                                    }
                                                                    className="p-1 rounded-md bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
                                                                    title="Download photo"
                                                                    aria-label="Download photo"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            {/* Bottom bar: Date & Jump to message button */}
                                                            <div className="flex items-center justify-between text-white text-[11px] pointer-events-auto">
                                                                <span className="font-medium text-white/90 text-[10px]">
                                                                    {formattedTime}
                                                                </span>

                                                                <button
                                                                    onClick={(e) => handleJump(e, item)}
                                                                    className="flex items-center gap-1 text-[10px] font-semibold bg-white/25 hover:bg-white/40 active:scale-95 px-2 py-1 rounded-md transition-all cursor-pointer shadow-sm"
                                                                    title="Go to message in chat"
                                                                >
                                                                    <MessageSquare className="w-3 h-3" />
                                                                    <span>Jump</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {/* Load more button if there are older photos */}
                                {hasMore && (
                                    <div className="flex justify-center pt-2 pb-2">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                                        >
                                            {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                            <span>{loadingMore ? 'Loading older photos...' : 'Load more photos'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox Preview (Loads full quality images) */}
            {selectedImageIndex !== null && (
                <ImageLightbox
                    images={imageUrls}
                    initialIndex={selectedImageIndex}
                    onClose={() => setSelectedImageIndex(null)}
                />
            )}
        </div>,
        document.body
    );
}
