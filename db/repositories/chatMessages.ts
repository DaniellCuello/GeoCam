// db/repositories/chatMessages.ts
// Reto C1: Persistencia del historial de chat en SQLite con Drizzle

import { asc } from 'drizzle-orm';
import { db } from '../client';
import { chatMessages, type ChatMessage } from '../schema';

export async function getAllMessages(): Promise<ChatMessage[]> {
  return db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt));
}

export async function saveMessage(msg: {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: unknown;
}): Promise<void> {
  const partsStr = msg.parts ? JSON.stringify(msg.parts) : null;
  await db
    .insert(chatMessages)
    .values({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      parts: partsStr,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: chatMessages.id,
      set: {
        content: msg.content,
        parts: partsStr,
      },
    });
}

export async function saveAllMessages(
  messages: Array<{
    id: string;
    role: string;
    content?: string;
    parts?: unknown;
  }>
): Promise<void> {
  for (const m of messages) {
    const role = (m.role === 'user' || m.role === 'assistant' || m.role === 'system' ? m.role : 'user') as
      | 'user'
      | 'assistant'
      | 'system';

    let content = m.content ?? '';
    if (!content && Array.isArray(m.parts)) {
      content = m.parts
        .map((p: any) => (p?.type === 'text' ? p.text : ''))
        .filter(Boolean)
        .join(' ');
    }

    await saveMessage({
      id: m.id,
      role,
      content: content || '...',
      parts: m.parts,
    });
  }
}

export async function clearChatHistory(): Promise<void> {
  await db.delete(chatMessages);
}

export const chatMessagesRepo = {
  getAll: getAllMessages,
  saveMessage,
  saveAll: saveAllMessages,
  clear: clearChatHistory,
};
