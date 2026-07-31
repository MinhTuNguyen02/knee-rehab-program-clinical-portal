import { useState } from 'react';
import { ChatMessage } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
    message: ChatMessage;
    isOwnMessage: boolean; // True if message is sent by staff (current user)
    bubbleShapeClass: string;
    showStatusBlock: boolean;
    formatTime: (dateStr: string) => string;
    isTimeVisible: boolean;
    onToggleTime: () => void;
}

export function MessageBubble({
    message,
    isOwnMessage,
    bubbleShapeClass,
    showStatusBlock,
    formatTime,
    isTimeVisible,
    onToggleTime
}: MessageBubbleProps) {
    const isPending = message.isPending;
    return (
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} w-full`}>
            <div
                className="max-w-[80%] sm:max-w-[70%] relative group cursor-pointer sm:cursor-auto"
                onClick={onToggleTime}
            >
                <div className={`relative flex items-center w-fit max-w-full ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
                    <div
                        className={`px-4.5 py-2.5 text-base leading-relaxed max-w-full transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'} ${isOwnMessage
                            ? `bg-primary text-white shadow-xs ${bubbleShapeClass}`
                            : `bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs ${bubbleShapeClass}`
                            }`}
                    >
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-left">
                            {message.body}
                        </p>
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

                {/* Status Block (Time and Checkmarks for staff messages) */}
                {showStatusBlock && (
                    <div className="flex items-center gap-1 mt-1 px-1 justify-end">
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
        </div>
    );
}