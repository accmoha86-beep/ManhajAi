"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/store/chat-store";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";

interface SubjectChatProps {
  subjectId: string | null;
  subjectName: string | null;
}

const GENERAL_KEY = "__general__";

export default function SubjectChat({ subjectId, subjectName }: SubjectChatProps) {
  const chatKey = subjectId || GENERAL_KEY;
  const { messages: allMessages, addMessage, clearChat } = useChatStore();
  const messages = allMessages[chatKey] ?? [];
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    addMessage(chatKey, userMsg);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject_id: subjectId || undefined,
          message: trimmed,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        const reply = data.data?.reply || data.message || "لم أتمكن من الإجابة";
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        };
        addMessage(chatKey, aiMsg);
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.error || "حدث خطأ. يرجى المحاولة مرة أخرى",
          timestamp: new Date().toISOString(),
        };
        addMessage(chatKey, errorMsg);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى",
        timestamp: new Date().toISOString(),
      };
      addMessage(chatKey, errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearChat(chatKey);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--theme-card-bg)" }}>
      {/* Chat Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--theme-surface-border)",
          background: "var(--theme-sidebar-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--theme-cta-gradient)" }}
          >
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <div className="text-sm font-extrabold" style={{ color: "var(--theme-text-primary)" }}>
              المساعد الذكي 🤖
            </div>
            <div className="text-[0.65rem]" style={{ color: "var(--theme-text-muted)" }}>
              {subjectName || "اسألني عن أي شيء"}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: "var(--theme-text-muted)", background: "none", border: "none", cursor: "pointer" }}
            title="مسح المحادثة"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-base font-extrabold mb-2" style={{ color: "var(--theme-text-primary)" }}>
              أهلاً! أنا مساعدك الذكي
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--theme-text-secondary)" }}>
              {subjectName
                ? `اسألني أي سؤال عن ${subjectName}`
                : "اختر مادة ثم اسألني عن أي شيء"}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "اشرحلي الدرس ده",
                "عايز أسئلة تدريبية",
                "فهمني النقطة دي",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="themed-btn-outline text-xs px-3 py-1"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
              style={{
                background:
                  msg.role === "user"
                    ? "var(--theme-cta-gradient)"
                    : "var(--theme-hover-overlay)",
                color: msg.role === "user" ? "#fff" : "var(--theme-primary)",
              }}
            >
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background:
                  msg.role === "user"
                    ? "var(--theme-cta-gradient)"
                    : "var(--theme-hover-overlay)",
                color: msg.role === "user" ? "#fff" : "var(--theme-text-primary)",
                borderTopLeftRadius: msg.role === "user" ? "1rem" : "0.25rem",
                borderTopRightRadius: msg.role === "user" ? "0.25rem" : "1rem",
              }}
            >
              {msg.isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  جارٍ التفكير...
                </span>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-primary)" }}
            >
              <Bot size={14} />
            </div>
            <div
              className="rounded-2xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ background: "var(--theme-hover-overlay)", color: "var(--theme-text-secondary)" }}
            >
              <Loader2 size={14} className="animate-spin" />
              جارٍ التفكير...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="p-3 flex-shrink-0"
        style={{
          borderTop: "1px solid var(--theme-surface-border)",
          background: "var(--theme-sidebar-bg)",
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            className="themed-input flex-1 resize-none"
            rows={1}
            placeholder="اكتب سؤالك هنا..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="themed-btn-primary p-2.5 rounded-xl flex-shrink-0"
            style={{ opacity: !input.trim() || sending ? 0.5 : 1 }}
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
