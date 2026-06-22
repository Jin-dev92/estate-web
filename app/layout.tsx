import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "터전",
  description: "건물주와 입주자를 잇는 커뮤니케이션 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* Pretendard (가변) — 추후 next/font/local 로 교체 가능 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
