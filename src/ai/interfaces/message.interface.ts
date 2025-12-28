export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  position: string;
  messages: Message[];
  createdAt: Date;
  lastActivityAt: Date;
}
