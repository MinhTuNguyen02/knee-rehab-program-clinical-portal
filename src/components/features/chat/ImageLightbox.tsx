"use client";

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export async function downloadImage(url: string, filename = 'shared-photo.jpg') {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

interface ImageLightboxProps {
    src?: string;
    images?: string[];
    initialIndex?: number;
    onClose: () => void;
}

export function ImageLightbox({ src, images, initialIndex = 0, onClose }: ImageLightboxProps) {
    const [mounted, setMounted] = useState(false);
    const allImages = images && images.length > 0 ? images : (src ? [src] : []);
    const [currentIndex, setCurrentIndex] = useState(() => {
        if (initialIndex >= 0 && initialIndex < allImages.length) return initialIndex;
        if (src && allImages.includes(src)) return allImages.indexOf(src);
        return 0;
    });

    const activeSrc = allImages[currentIndex] || src || '';

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
    }, [allImages.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    }, [allImages.length]);

    const handleDownload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeSrc) return;
        const ext = activeSrc.split('.').pop()?.split('?')[0] || 'jpg';
        downloadImage(activeSrc, `photo-${Date.now()}.${ext}`);
    }, [activeSrc]);

    useEffect(() => {
        setMounted(true);
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && allImages.length > 1) {
                handlePrev();
            } else if (e.key === 'ArrowRight' && allImages.length > 1) {
                handleNext();
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose, handlePrev, handleNext, allImages.length]);

    if (!mounted || !activeSrc) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center select-none"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-200" />

            {/* Top Toolbar */}
            <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 bg-black/40 backdrop-blur-md text-white/90 text-xs px-3 py-1.5 rounded-full border border-white/10 font-medium">
                    {allImages.length > 1 ? `${currentIndex + 1} / ${allImages.length}` : 'Photo'}
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10"
                        title="Download image"
                        aria-label="Download image"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10"
                        aria-label="Close image"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Prev / Next navigation */}
            {allImages.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/75 text-white/90 hover:text-white transition-all cursor-pointer border border-white/10 shadow-lg backdrop-blur-sm"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/75 text-white/90 hover:text-white transition-all cursor-pointer border border-white/10 shadow-lg backdrop-blur-sm"
                        aria-label="Next image"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Image */}
            <div className="relative z-10 max-w-[90vw] max-h-[85vh] flex items-center justify-center p-2">
                <img
                    key={activeSrc}
                    src={activeSrc}
                    alt="Full size"
                    className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>,
        document.body
    );
}
