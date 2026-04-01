"use client";

import { useEffect, useRef } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiChatSidebarProps = {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  error: string | null;
  isOpen: boolean;
  onToggle: () => void;
};

export const AiChatSidebar = ({
  messages,
  input,
  onInputChange,
  onSend,
  isSending,
  error,
  isOpen,
  onToggle,
}: AiChatSidebarProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <aside
      className={[
        "flex w-full flex-col rounded-[28px] border border-[var(--stroke)] bg-white/90 shadow-[var(--shadow)] backdrop-blur",
        "transition-all duration-200",
        isOpen ? "max-h-[720px]" : "max-h-[64px]",
        "lg:max-h-none",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]">
            AI Assistant
          </p>
          <h2 className="mt-2 font-display text-lg font-semibold text-[var(--navy-dark)]">
            Plan with the board
          </h2>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-[var(--stroke)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--secondary-purple)] transition lg:hidden"
        >
          {isOpen ? "Close" : "Open"}
        </button>
      </div>

      <div className={isOpen ? "flex flex-1 flex-col gap-4 px-5 pb-5" : "hidden lg:flex lg:flex-1 lg:flex-col lg:gap-4 lg:px-5 lg:pb-5"}>
        <div
          ref={scrollRef}
          className="flex max-h-[320px] flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4 text-sm"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--gray-text)]">
              Ask the assistant to create, move, or update cards.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={[
                  "rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "self-end bg-[var(--primary-blue)] text-white"
                    : "self-start bg-white text-[var(--navy-dark)] border border-[var(--stroke)]",
                ].join(" ")}
              >
                {message.content}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3">
          <label
            htmlFor="ai-question"
            className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]"
          >
            Your request
          </label>
          <textarea
            id="ai-question"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ask the AI to update the board..."
            rows={3}
            className="w-full resize-none rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] shadow-[0_10px_20px_rgba(3,33,71,0.08)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          {error && (
            <p className="text-xs font-semibold text-[var(--secondary-purple)]">{error}</p>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={isSending || !input.trim()}
            className="rounded-full bg-[var(--secondary-purple)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_12px_24px_rgba(117,57,145,0.25)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send to AI"}
          </button>
        </div>
      </div>
    </aside>
  );
};
