"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const { messages: allMessages, addMessage, updateMessage, clearChat } = useChatStore();
  const messages = allMessages[chatKey] ?? [];
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    addMessage(chatKey, userMsg);
    setInput("");
    setStreaming(true);

    // Add placeholder assistant message
    const assistantId = `a_${Date.now()}`;
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    addMessage(chatKey, placeholder);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject_id: subjectId || undefined,
          message: trimmed,
        }),
        signal: abortRef.current.signal,
      });

      // Non-streaming error response
      if (!res.ok || !res.body) {
        let errorText = "حدث خطأ. يرجى المحاولة مرة أخرى";
        try {
          const errData = await res.json();
          errorText = errData.error || errorText;
        } catch {}
        updateMessage(chatKey, assistantId, { content: errorText, isLoading: false });
        setStreaming(false);
        return;
      }

      // ━━━ Read SSE stream ━━━
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "delta" && event.text) {
              fullContent += event.text;
              updateMessage(chatKey, assistantId, {
                content: fullContent,
                isLoading: false,
              });
            }

            if (event.type === "error") {
              updateMessage(chatKey, assistantId, {
                content: event.error || "حدث خطأ",
                isLoading: false,
              });
            }

            if (event.type === "done") {
              // Stream complete
              updateMessage(chatKey, assistantId, {
                content: fullContent,
                isLoading: false,
              });
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Ensure final state is correct
      if (fullContent) {
        updateMessage(chatKey, assistantId, { content: fullContent, isLoading: false });
      } else {
        updateMessage(chatKey, assistantId, {
          content: "لم أتمكن من الإجابة. حاول مرة أخرى",
          isLoading: false,
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      updateMessage(chatKey, assistantId, {
        content: "فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى",
        isLoading: false,
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, chatKey, subjectId, addMessage, updateMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (streaming && abortRef.current) {
      abortRef.current.abort();
    }
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
              أستاذك الذكي 🤖
            </div>
            <div className="text-[0.65rem]" style={{ color: "var(--theme-text-muted)" }}>
              {subjectName ? `متخصص في ${subjectName}` : "اختر مادة للبدء"}
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
              أهلاً! أنا أستاذك الذكي
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--theme-text-secondary)" }}>
              {subjectName
                ? `اسألني أي سؤال عن ${subjectName} — هجاوبك فوراً! ⚡`
                : "اختر مادة ثم اسألني عن أي شيء"}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "اشرحلي الدرس ده",
                "عايز أسئلة تدريبية",
                "لخصلي أهم النقاط",
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
            placeholder={subjectName ? `اسأل عن ${subjectName}...` : "اكتب سؤالك هنا..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="themed-btn-primary p-2.5 rounded-xl flex-shrink-0"
            style={{ opacity: !input.trim() || streaming ? 0.5 : 1 }}
          >
            {streaming ? (
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
