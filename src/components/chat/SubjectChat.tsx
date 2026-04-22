"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import { useAuthStore } from "@/store/auth-store";
import { Send, Bot, User, Sparkles, MessageCircle } from "lucide-react";

interface SubjectChatProps {
  subjectId: string;
  subjectName: string;
  subjectIcon: string;
}

const suggestionsBySubject: Record<string, string[]> = {
  math: ["اشرحلي التفاضل", "ازاي أحل معادلات تانية؟", "قوانين التكامل", "مسألة هندسة فراغية"],
  physics: ["اشرحلي قانون نيوتن", "ازاي أحسب التسارع؟", "قوانين الكهربية", "مسألة على الحركة"],
  chemistry: ["اشرحلي الكيمياء العضوية", "ازاي أوزن معادلة؟", "الاتزان الكيميائي", "مسألة على المول"],
};

export default function SubjectChat({ subjectId, subjectName, subjectIcon }: SubjectChatProps) {
  const { messages, addMessage, dailyCount } = useChatStore();
  const { isAuthenticated } = useAuthStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMessages = messages[subjectId] ?? [];
  const suggestions = suggestionsBySubject[subjectId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || dailyCount >= 50) return;

    addMessage(subjectId, {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    });
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), subject_id: subjectId }),
      });

      if (res.ok) {
        const data = await res.json();
        addMessage(subjectId, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data?.reply || "عذراً، حدث خطأ. حاول مرة أخرى.",
          timestamp: new Date().toISOString(),
        });
      } else {
        addMessage(subjectId, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "عذراً، حدث خطأ في الاتصال. حاول مرة أخرى.",
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      addMessage(subjectId, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "عذراً، فشل الاتصال. تأكد من اتصالك بالإنترنت.",
        timestamp: new Date().toISOString(),
      });
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className="flex flex-col font-cairo"
      style={{
        height: "calc(100vh - 4rem)",
        background: "var(--theme-surface-bg)",
        borderRight: "1px solid var(--theme-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{
          background: "var(--theme-cta-gradient)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <Bot size={20} color="#fff" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">
            أستاذك الذكي — {subjectIcon} {subjectName}
          </div>
          <div className="text-white/60 text-xs">أسألني أي سؤال عن المادة</div>
        </div>
        <div
          className="px-2 py-1 rounded-lg text-xs font-bold text-white"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          {dailyCount}/50
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--theme-text-primary)" }}>
              أهلاً! أنا أستاذك الذكي
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--theme-text-secondary)" }}>
              اسألني أي سؤال عن {subjectName} وهساعدك!
            </p>
            {/* Suggestions */}
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all hover:scale-105"
                  style={{
                    background: "var(--theme-hover-overlay)",
                    color: "var(--theme-primary)",
                    border: "1px solid var(--theme-surface-border)",
                  }}
                >
                  <Sparkles size={12} className="inline ml-1" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: msg.role === "user" ? "var(--theme-cta-gradient)" : "var(--theme-hover-overlay)",
              }}
            >
              {msg.role === "user" ? (
                <User size={16} color="#fff" />
              ) : (
                <Bot size={16} style={{ color: "var(--theme-primary)" }} />
              )}
            </div>
            <div
              className="max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
              style={{
                background: msg.role === "user"
                  ? "var(--theme-cta-gradient)"
                  : "var(--theme-surface-bg)",
                color: msg.role === "user" ? "#fff" : "var(--theme-text-primary)",
                border: msg.role === "user" ? "none" : "1px solid var(--theme-surface-border)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--theme-hover-overlay)" }}>
              <Bot size={16} style={{ color: "var(--theme-primary)" }} />
            </div>
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--theme-surface-bg)", border: "1px solid var(--theme-surface-border)" }}>
              <span className="typing-dots" style={{ color: "var(--theme-text-muted)" }}>
                جارٍ التفكير...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: "1px solid var(--theme-border)" }}>
        {dailyCount >= 50 ? (
          <div className="text-center py-3 text-sm font-bold" style={{ color: "var(--theme-text-muted)" }}>
            ⚠️ استهلكت الحد اليومي (50 سؤال). ارجع بكرة!
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`اسأل عن ${subjectName}...`}
              rows={1}
              className="themed-input flex-1 resize-none"
              style={{
                fontSize: "1.1rem",
                minHeight: "2.8rem",
                maxHeight: "8rem",
                padding: "0.6rem 1rem",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
              style={{
                background: input.trim() ? "var(--theme-cta-gradient)" : "var(--theme-surface-border)",
                color: "#fff",
                border: "none",
                opacity: input.trim() ? 1 : 0.5,
                boxShadow: input.trim() ? "var(--theme-btn-shadow)" : "none",
              }}
            >
              <Send size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}