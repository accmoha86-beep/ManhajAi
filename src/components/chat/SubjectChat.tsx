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

/* ── Enhanced markdown renderer for chat messages ── */
function renderChatContent(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let tableHeaderCells: string[] = [];
  let tableBodyRows: string[][] = [];

  const renderInline = (t: string): React.ReactNode[] => {
    const parts = t.split(/(\*\*.*?\*\*|`[^`]+`)/g);
    return parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j} style={{ fontWeight: 700, color: "inherit" }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={j} style={{ background: "rgba(0,0,0,0.1)", padding: "1px 5px", borderRadius: "4px", fontSize: "0.88em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const flushTable = (idx: number) => {
    if (tableHeaderCells.length > 0 || tableBodyRows.length > 0) {
      const allRows = tableHeaderCells.length > 0 ? [tableHeaderCells, ...tableBodyRows] : tableBodyRows;
      const header = allRows[0] || [];
      const body = allRows.slice(1);
      elements.push(
        <div key={`tbl-${idx}`} style={{
          overflowX: "auto", margin: "8px 0", borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.06)",
        }}>
          <table dir="rtl" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88em", fontFamily: "'Cairo', sans-serif" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.12)" }}>
                {header.map((cell, ci) => (
                  <th key={ci} style={{
                    padding: "8px 12px", fontWeight: 700, textAlign: "center",
                    borderBottom: "2px solid rgba(255,255,255,0.15)",
                    borderLeft: ci < header.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  }}>{renderInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.04)" : "transparent" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: "6px 12px", textAlign: "center",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      borderLeft: ci < row.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      fontWeight: ci === 0 ? 600 : 400,
                    }}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaderCells = [];
      tableBodyRows = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Code block
    if (trimmed.startsWith("```")) {
      flushTable(i);
      if (inCode) {
        elements.push(
          <pre key={`code-${i}`} dir="ltr" style={{
            background: "rgba(0,0,0,0.15)", padding: "10px 14px", borderRadius: "10px",
            margin: "6px 0", fontSize: "0.85em", fontFamily: "monospace",
            lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap",
          }}>
            {codeLines.join("\n")}
          </pre>
        );
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    // Table row detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").filter(c => c.trim() !== "").map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return; // skip separator
      if (tableHeaderCells.length === 0) {
        tableHeaderCells = cells;
      } else {
        tableBodyRows.push(cells);
      }
      return;
    }
    // If we were collecting table rows and hit a non-table line, flush
    if (tableHeaderCells.length > 0 || tableBodyRows.length > 0) {
      flushTable(i);
    }

    // Empty line
    if (!trimmed) { elements.push(<div key={i} style={{ height: "6px" }} />); return; }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<div key={i} style={{ height: "1px", background: "currentColor", opacity: 0.15, margin: "8px 0" }} />);
      return;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      elements.push(
        <div key={i} style={{
          borderRight: "3px solid currentColor", paddingRight: "10px",
          marginRight: "4px", opacity: 0.85, fontSize: "0.93em",
          fontStyle: "italic", margin: "4px 0",
        }}>
          {renderInline(trimmed.slice(2))}
        </div>
      );
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontWeight: 800, fontSize: "0.98rem", marginTop: "10px", marginBottom: "3px" }}>{trimmed.slice(4)}</div>);
      return;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontWeight: 800, fontSize: "1.02rem", marginTop: "12px", marginBottom: "4px" }}>{trimmed.slice(3)}</div>);
      return;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(<div key={i} style={{ fontWeight: 800, fontSize: "1.08rem", marginTop: "12px", marginBottom: "4px" }}>{trimmed.slice(2)}</div>);
      return;
    }

    // Bullet points
    if (/^[-\u2022\u25CF\u25C6\*]\s/.test(trimmed)) {
      const bContent = trimmed.replace(/^[-\u2022\u25CF\u25C6\*]\s*/, "");
      elements.push(
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "2px", paddingRight: "4px" }}>
          <span style={{ color: "inherit", opacity: 0.7, marginTop: "2px", flexShrink: 0 }}>✦</span>
          <span>{renderInline(bContent)}</span>
        </div>
      );
      return;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)/)?.[1] || "1";
      const nContent = trimmed.replace(/^\d+[.)]\s*/, "");
      elements.push(
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "2px", paddingRight: "4px" }}>
          <span style={{
            minWidth: "22px", height: "22px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75em", fontWeight: 700, flexShrink: 0, marginTop: "2px",
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.15)",
          }}>{num}</span>
          <span>{renderInline(nContent)}</span>
        </div>
      );
      return;
    }

    // Normal text
    elements.push(
      <div key={i} style={{ marginBottom: "1px" }}>
        {renderInline(trimmed)}
      </div>
    );
  });

  // Flush any remaining table
  flushTable(lines.length);

  return <>{elements}</>;
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
