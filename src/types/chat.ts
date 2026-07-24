export interface PatientAssessment {
    id: string;
    displayId?: string;
    pain: number;
    functionScore: number;
    score: number;
    zone: 'green' | 'amber' | 'red' | string;
    createdAt: string;
}

export interface ChatPatient {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile?: string;
    age?: number;
    gender?: string;
    kneeSide?: string;
    consentAccepted?: boolean;
    createdAt: string;
    assessments?: PatientAssessment[];
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderType: 'patient' | 'staff';
    senderId: string;
    body: string;
    sentAt: string;
    readAt: string | null;
}

export interface Conversation {
    id: string;
    patientId: string;
    createdAt: string;
    lastMessageAt: string | null;
    patient: ChatPatient;
    lastMessage: ChatMessage | null;
    unreadCount: number;
}
