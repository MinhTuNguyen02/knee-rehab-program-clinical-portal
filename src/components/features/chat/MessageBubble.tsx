import { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';
import Linkify from 'linkify-react';

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
    patientId: string;
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
    onReplyClick,
    patientId
}: MessageBubbleProps) {
    const isPending = message.isPending;
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const linkifyOptions = {
        target: '_blank',
        rel: 'noopener noreferrer',
        className: `underline hover:opacity-80 transition-opacity ${!isOwnMessage ? 'text-primary dark:text-blue-400' : ''}`,
        onClick: (e: any) => e.stopPropagation()
    };

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
                                    <Linkify options={linkifyOptions}>{message.body}</Linkify>
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
                {message.reactions && Object.keys(message.reactions).length > 0 && (() => {
                    const reactionEntries = Object.entries(message.reactions!);
                    const totalReactions = reactionEntries.reduce((sum, [_, data]) => sum + data.count, 0);

                    const getTooltip = (reactorIds: string[]) => {
                        return reactorIds.map(id => id === patientId ? 'Patient' : 'You').join(', ');
                    };

                    return (
                        <div className={`flex flex-wrap gap-1 -mt-2.5 relative z-10 w-full ${isOwnMessage ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                            {totalReactions === 2 && reactionEntries.length === 2 ? (
                                <button
                                    title={reactionEntries.map(([emoji, data]) => `${emoji}: ${getTooltip(data.reactorIds)}`).join(' | ')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Find which emoji the staff reacted to
                                        const myReaction = reactionEntries.find(([_, data]) => data.reactorIds.some(id => id !== patientId));
                                        if (myReaction) onToggleReaction(myReaction[0]);
                                    }}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded-full border transition-colors shadow-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    <span className="text-[13px] leading-none">{reactionEntries[0][0]}</span>
                                    <span className="text-[13px] leading-none">{reactionEntries[1][0]}</span>
                                </button>
                            ) : (
                                reactionEntries.map(([emoji, { count, reactorIds }]) => {
                                    return (
                                        <button
                                            key={emoji}
                                            title={getTooltip(reactorIds)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleReaction(emoji);
                                            }}
                                            className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full border transition-colors shadow-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            <span className="text-[13px] leading-none">{emoji}</span>
                                            {count > 1 && <span className="leading-none">{count}</span>}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    );
                })()}

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