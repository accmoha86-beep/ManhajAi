// store/chat-store.ts — Zustand store for AI chat state
import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}

interface ChatState {
  /** Messages per subject: subjectId → message list */
  messages: Record<string, ChatMessage[]>;
  activeSubjectId: string | null;
  dailyCount: number;
  monthlyCount: number;
  dailyLimit: number;
  monthlyLimit: number;
  isSending: boolean;
  error: string | null;
}

interface ChatActions {
  setActiveSubject: (subjectId: string) => void;
  addMessage: (subjectId: string, message: ChatMessage) => void;
  updateMessage: (
    subjectId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ) => void;
  removeMessage: (subjectId: string, messageId: string) => void;
  sendMessage: (subjectId: string, content: string) => Promise<void>;
  clearChat: (subjectId: string) => void;
  clearAllChats: () => void;
  setLimits: (params: {
    dailyCount: number;
    monthlyCount: number;
    dailyLimit: number;
    monthlyLimit: number;
  }) => void;
  setSending: (isSending: boolean) => void;
  setError: (error: string | null) => void;
}

const initialState: ChatState = {
  messages: {},
  activeSubjectId: null,
  dailyCount: 0,
  monthlyCount: 0,
  dailyLimit: 50,
  monthlyLimit: 500,
  isSending: false,
  error: null,
};

export const useChatStore = create<ChatState & ChatActions>()((set, get) => ({
  ...initialState,

  setActiveSubject: (subjectId) => set({ activeSubjectId: subjectId }),

  addMessage: (subjectId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [subjectId]: [...(state.messages[subjectId] ?? []), message],
      },
    })),

  updateMessage: (subjectId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [subjectId]: (state.messages[subjectId] ?? []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    })),

  removeMessage: (subjectId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [subjectId]: (state.messages[subjectId] ?? []).filter(
          (msg) => msg.id !== messageId
        ),
      },
    })),

  sendMessage: async (subjectId, content) => {
    const state = get();

    if (state.isSending) return;
    if (!content.trim()) return;

    set({ isSending: true, error: null });

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    get().addMessage(subjectId, userMessage);

    // Add placeholder assistant message
    const assistantId = `assistant_${Date.now()}`;
    const placeholderMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    get().addMessage(subjectId, placeholderMessage);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, message: content.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        get().removeMessage(subjectId, assistantId);
        set({ error: data.error ?? 'فشل في إرسال الرسالة', isSending: false });
        return;
      }

      // Update placeholder with actual response
      get().updateMessage(subjectId, assistantId, {
        content: data.message,
        isLoading: false,
      });

      // Update usage counts
      if (data.usage) {
        set({
          dailyCount: state.dailyLimit - data.usage.dailyRemaining,
          monthlyCount: state.monthlyLimit - data.usage.monthlyRemaining,
        });
      }

      set({ isSending: false });
    } catch (error) {
      get().removeMessage(subjectId, assistantId);
      set({
        error: 'فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى',
        isSending: false,
      });
    }
  },

  clearChat: (subjectId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [subjectId]: [],
      },
    })),

  clearAllChats: () => set({ messages: {} }),

  setLimits: (params) => set(params),

  setSending: (isSending) => set({ isSending }),

  setError: (error) => set({ error }),
}));
