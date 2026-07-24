import { ChatMessage } from '@/types/chat';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
    message: ChatMessage;
    isOwnMessage: boolean; // True if message is sent by staff (current user)
    bubbleShapeClass: string;
    showStatusBlock: boolean;
    formatTime: (dateStr: string) => string;
}

export function MessageBubble({
    message,
    isOwnMessage,
    bubbleShapeClass,
    showStatusBlock,
    formatTime
}: MessageBubbleProps) {
    return (
        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} w-full`}>
            <div className="max-w-[80%] sm:max-w-[70%] relative group">
                {/* Message text bubble wrapper */}
                <div className={`relative flex items-center w-fit max-w-full ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
                    <div
                        className={`px-4 py-2.5 text-sm leading-relaxed max-w-full ${
                            isOwnMessage
                                ? `bg-primary text-white shadow-xs ${bubbleShapeClass}`
                                : `bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs ${bubbleShapeClass}`
                        }`}
                    >
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-left">
                            {message.body}
                        </p>
                    </div>

                    {/* Time on hover */}
                    <span
                        className={`absolute ${
                            isOwnMessage ? 'right-full mr-3' : 'left-full ml-3'
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap select-none cursor-default top-1/2 -translate-y-1/2`}
                    >
                        {formatTime(message.sentAt)}
                    </span>
                </div>

                {/* Status Block (Time and Checkmarks for staff messages) */}
                {showStatusBlock && (
                    <div className="flex items-center gap-1 mt-1 px-1 justify-end">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
                                    <Check className="w-3.5 h-3.5 text-slate-400" />
                                )}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
