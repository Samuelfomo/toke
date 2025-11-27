import { MessageType } from '../../constants/tenant/memos.js';

export interface Attachment {
  title?: string | undefined;
  link: string;
}

export interface Message {
  type: MessageType;
  content: string | string[]; // Array<string>
}

export interface MemoContent {
  created_at: Date | string;
  user: string;
  message: Message;
  type?: 'initial' | 'response' | 'validation' | 'escalation';
}
