import { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';

interface MessageBubbleProps {
    message: ChatMessage;
    isOwnMessage: boolean; // True if message is sent by staff (current user)
    bubbleShapeClass: string;
    showStatusBlock: boolean;
    formatTime: (dateStr: string) => string;
    isTimeVisible: boolean;
    onToggleTime: () => void;
    onToggleReaction: (emoji: string) => void;
    onReplyClick?: () => void;
}

export function MessageBubble({
    message,
    isOwnMessage,
    bubbleShapeClass,
    showStatusBlock,
    formatTime,
    isTimeVisible,
    onToggleTime,
    onToggleReaction,
    onReplyClick
}: MessageBubbleProps) {
    const isPending = message.isPending;
    const [lightboxOpen, setLightboxOpen] = useState(false);

    return (
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} w-full`}>
            <div
                className="max-w-[80%] sm:max-w-[70%] relative group cursor-pointer sm:cursor-auto"
                onClick={onToggleTime}
            >
                <div className={`flex flex-col w-fit max-w-full ${isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    {message.replyToMessage && (
                        <div 
                            className={`mb-1 max-w-[85%] text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 relative cursor-pointer hover:opacity-100 transition-opacity ${isOwnMessage ? 'opacity-80' : 'opacity-80'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onReplyClick?.();
                            }}
                        >
                            <p className="font-semibold mb-0.5 opacity-80">
                                {message.replyToMessage.senderType === 'staff' ? 'Staff' : 'Patient'}
                            </p>
                            {message.replyToMessage.imageUrl ? (
                                <p className="opacity-70 italic">📷 Image</p>
                            ) : (
                                <p className="truncate opacity-90">{message.replyToMessage.body}</p>
                            )}
                            <div className={`absolute top-full w-2 h-2 bg-slate-100 dark:bg-slate-800/80 border-b border-r border-slate-200/50 dark:border-slate-700/50 transform rotate-45 ${isOwnMessage ? 'right-4 -mt-1' : 'left-4 -mt-1'}`}></div>
                        </div>
                    )}
                
                    <div className="relative flex items-center w-fit max-w-full">
                        <div
                            className={`transition-opacity overflow-hidden ${isPending ? 'opacity-60' : 'opacity-100'} ${isOwnMessage
                                ? `bg-primary text-white shadow-xs ${bubbleShapeClass}`
                                : `bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs ${bubbleShapeClass}`
                                } ${message.imageUrl && !message.body ? 'p-1' : 'px-4.5 py-2.5'}`}
                        >
                            {message.imageUrl && (
                                <img
                                    src={message.imageUrl}
                                    alt="Shared image"
                                    className="max-w-[280px] max-h-[320px] w-auto h-auto object-cover rounded-lg cursor-zoom-in block"
                                    style={{ display: 'block' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxOpen(true);
                                    }}
                                />
                            )}
                            {message.body && (
                                <p className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-left text-base leading-relaxed ${message.imageUrl ? 'mt-1.5 px-2 pb-1' : ''}`}>
                                    {message.body}
                                </p>
                            )}
                        </div>

                        {/* Time Indicator */}
                        <span
                            className={`absolute ${isOwnMessage ? 'right-full mr-3' : 'left-full ml-3'} 
                                transition-opacity duration-200 text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap select-none top-1/2 -translate-y-1/2
                                ${isTimeVisible ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'} 
                            `}
                        >
                            {formatTime(message.sentAt)}
                        </span>
                    </div>
                </div>

                {/* Render Reactions */}
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-0.5 w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(message.reactions).map(([emoji, { count, reactorIds }]) => {
                            const hasReacted = reactorIds.length > 0;
                            return (
                                <button
                                    key={emoji}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleReaction(emoji);
                                    }}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full border transition-colors shadow-xs
                                        ${hasReacted 
                                            ? 'bg-primary/10 border-primary/30 text-primary dark:text-primary-light' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="text-[13px] leading-none">{emoji}</span>
                                    <span className="leading-none">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Status Block (Time and Checkmarks for staff messages) */}
                {showStatusBlock && (
                    <div className="flex items-center gap-1 mt-1 px-1 justify-end min-h-[20px]">
                        {isPending ? (

                            <span className="text-[10px] italic text-slate-400 dark:text-slate-500">
                                Sending...
                            </span>
                        ) : (

                            <>
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                    {formatTime(message.sentAt)}
                                </span>

                                {isOwnMessage && (
                                    <span
                                        title={message.readAt ? 'Seen' : 'Sent'}
                                        className="text-primary dark:text-primary-hover"
                                    >
                                        {message.readAt ? (
                                            <CheckCheck className="w-3.5 h-3.5" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {lightboxOpen && message.imageUrl && (
                <ImageLightbox src={message.imageUrl} onClose={() => setLightboxOpen(false)} />
            )}
        </div>
    );
}