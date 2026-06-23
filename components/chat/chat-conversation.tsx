"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/lib/api";
import { WS_URL } from "@/lib/chat/ws";
import { MESSAGES } from "@/lib/messages";

type Props = { token: string; roomId: string; myId: string; initial: ChatMessage[] };

export function ChatConversation({ token, roomId, myId, initial }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setError(null);
      socket.emit("join", { roomId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setError(MESSAGES.chat.connectFailed));
    socket.on("message", (m: ChatMessage) => {
      if (m.roomId !== roomId) return;
      // 히스토리·echo 중복 방지(messageId 기준).
      setMessages((prev) => (prev.some((x) => x.messageId === m.messageId) ? prev : [...prev, m]));
    });
    socket.on("error", (e: { code?: string; message?: string }) => {
      setError(e.code === "CHAT_NOT_ROOM_PARTICIPANT" ? MESSAGES.chat.notParticipant : (e.message ?? MESSAGES.chat.connectFailed));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send() {
    const content = draft.trim();
    if (!content || !socketRef.current) return;
    socketRef.current.emit("message", { roomId, content });
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-[12px] bg-danger/10 px-4 py-2 text-[13px] text-danger">{error}</p>}
      {!error && !connected && <p className="text-[13px] text-text-3">{MESSAGES.chat.disconnected}</p>}

      <div className="flex flex-col gap-2 pb-2">
        {messages.map((m) => {
          const mine = m.senderId === myId;
          return (
            <div key={m.messageId} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] whitespace-pre-wrap rounded-[16px] px-4 py-2.5 text-[15px] ${mine ? "bg-brand-500 text-white" : "bg-surface-2 text-text"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 flex items-end gap-2 bg-bg pt-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={MESSAGES.chat.inputPlaceholder}
          className="flex-1 resize-none rounded-[14px] border border-border bg-surface px-4 py-3 text-[15px] text-text outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50"
        />
        <button
          onClick={send}
          disabled={!connected || draft.trim().length === 0}
          className="h-[50px] shrink-0 rounded-[14px] bg-brand-500 px-5 font-bold text-[15px] text-white transition active:scale-[.985] disabled:opacity-50"
        >
          전송
        </button>
      </div>
    </div>
  );
}
