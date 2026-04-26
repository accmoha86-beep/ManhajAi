"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatMessage } from "@/store/chat-store";
import { Send, Bot, User, Trash2 } from "lucide-react";

interface SubjectChatProps {
  subjectId: string | null;
  subjectName: string | null;
}

const GENERAL_KEY = "__general__";

/* ── Typing dots animation (CSS-in-JS) ── */
const typingDotsStyle = `
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}
.typing-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--theme-primary, #6366f1); margin: 0 2px; }
.typing-dot:nth-child(1) { animation: typingBounce 1.2s infinite 0s; }
.typing-dot:nth-child(2) { animation: typingBounce 1.2s infinite 0.2s; }
.typing-dot:nth-child(3) { animation: typingBounce 1.2s infinite 0.4s; }
`;

/* ── Simple natural text renderer for chat — like a real teacher writing ── */
function renderChatContent(text: string) {
  if (!text) return null;
  
  // Split into paragraphs by double newlines or single newlines
  const lines = text.split("\n");
  
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        
        // Empty line = small spacer
        if (!trimmed) return <div key={i} style={{ height: "6px" }} />;
        
        // Strip any markdown artifacts that might slip through
        let clean = trimmed;
        // Remove ** bold markers
        clean = clean.replace(/\*\*(.*?)\*\*/g, "$1");
        // Remove * or _ italic markers
        clean = clean.replace(/(?<!\w)[*_](.*?)[*_](?!\w)/g, "$1");
        // Remove # headers
        clean = clean.replace(/^#{1,3}\s*/, "");
        // Remove bullet markers at start
        clean = clean.replace(/^[-•◆*]\s+/, "");
        // Remove numbered list markers
        clean = clean.replace(/^\d+[.):]\s*/, "");
        // Remove backtick code markers
        clean = clean.replace(/`([^`]+)`/g, "$1");
        // Remove blockquote markers
        clean = clean.replace(/^>\s*/, "");
        // Remove table pipes
        if (clean.startsWith("|") && clean.endsWith("|")) {
          clean = clean.replace(/\|/g, " — ").replace(/^\s*—\s*/, "").replace(/\s*—\s*$/, "").trim();
        }
        // Skip table separator rows
        if (/^[-|:\s]+$/.test(clean)) return null;
        
        return (
          <div key={i} style={{ marginBottom: "2px" }}>
            {clean}
          </div>
        );
      })}
    </>
  );
}

export default function SubjectChat({ subjectId, subjectName }: SubjectChatProps) {
  const chatKey = subjectId || GENERAL_KEY;
  const { messages: allMessages, addMessage, updateMessage, clearChat } = useChatStore();
  const messages = allMessages[chatKey] ?? [];
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [chatKey]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    addMessage(chatKey, userMsg);
    setInput("");
    setStreaming(true);

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
              updateMessage(chatKey, assistantId, {
                content: fullContent,
                isLoading: false,
              });
            }
          } catch {}
        }
      }

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
      inputRef.current?.focus();
    }
  }, [input, streaming, chatKey, subjectId, addMessage, updateMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (streaming && abortRef.current) abortRef.current.abort();
    clearChat(chatKey);
  };

  const chatFont: React.CSSProperties = {
    fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif",
  };

  return (
    <div className="flex flex-col h-full" style={{ ...chatFont, background: "var(--theme-card-bg)" }}>
      <style>{typingDotsStyle}</style>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--theme-surface-border)",
          background: "var(--theme-sidebar-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--theme-cta-gradient)" }}
          >
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--theme-text-primary)" }}>
              أستاذك الذكي 🤖
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--theme-text-muted)" }}>
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

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">🤖</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--theme-text-primary)", marginBottom: "6px" }}>
              أهلاً! أنا أستاذك الذكي
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--theme-text-secondary)", marginBottom: "16px" }}>
              {subjectName
                ? `اسألني أي سؤال عن ${subjectName} — هجاوبك فوراً! ⚡`
                : "اختر مادة ثم اسألني عن أي شيء"}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["اشرحلي الدرس ده", "عايز أسئلة تدريبية", "لخصلي أهم النقاط"].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="themed-btn-outline px-3 py-1.5 rounded-lg"
                  style={{ fontSize: "0.85rem" }}
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
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
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
              className="max-w-[82%] rounded-2xl px-4 py-3"
              style={{
                fontSize: "0.95rem",
                lineHeight: "1.75",
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
                <span className="flex items-center gap-1 py-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              ) : (
                renderChatContent(msg.content)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Input ── */}
      <div
        className="p-3 flex-shrink-0"
        style={{
          borderTop: "1px solid var(--theme-surface-border)",
          background: "var(--theme-sidebar-bg)",
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="themed-input flex-1 resize-none"
            rows={1}
            placeholder={subjectName ? `اسأل عن ${subjectName}...` : "اكتب سؤالك هنا..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            style={{ minHeight: "42px", maxHeight: "120px", fontSize: "0.95rem", fontFamily: "'Cairo', sans-serif" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="themed-btn-primary p-2.5 rounded-xl flex-shrink-0"
            style={{ opacity: !input.trim() || streaming ? 0.5 : 1 }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
