"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteCodeCard({ unitId }: { unitId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresInSec, setExpiresInSec] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function issue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/units/${unitId}/invite-codes`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.code);
        setExpiresInSec(data.expiresInSec);
      } else {
        const json = await res.json();
        setError(json.message ?? "초대코드 발급 실패");
      }
    } catch {
      setError("초대코드 발급 중 오류가 발생했어요");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareLink =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/invite?code=${code}`
      : null;

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {!code ? (
        <Button
          variant="secondary"
          onClick={issue}
          disabled={loading}
        >
          {loading ? "발급 중…" : "초대코드 발급"}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="rounded-[12px] bg-surface-2 px-4 py-3 text-center font-mono text-[18px] font-bold tracking-widest text-text">
            {code}
          </div>
          {expiresInSec !== null && (
            <p className="text-center text-[12px] text-text-3">
              {Math.floor(expiresInSec / 60)}분 후 만료
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyCode} className="flex-1">
              {copied ? "복사됨!" : "코드 복사"}
            </Button>
            <Button variant="ghost" onClick={copyLink} className="flex-1">
              링크 복사
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-center text-[13px] text-danger">{error}</p>}
    </div>
  );
}
