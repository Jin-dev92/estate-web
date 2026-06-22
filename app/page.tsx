export default function Home() {
  return (
    <main className="flex-1 grid place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-white">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 11l8-7 8 7M6 9.5V20h12V9.5"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-text">터전</h1>
        <p className="mt-2 text-[15px] text-text-2">
          건물주와 입주자를 잇는 커뮤니케이션 플랫폼
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <a
            href="/login"
            className="grid h-[50px] place-items-center rounded-[14px] bg-brand-500 font-bold text-white transition hover:bg-brand-600 active:scale-[.985]"
          >
            로그인
          </a>
          <a
            href="/signup"
            className="grid h-[50px] place-items-center rounded-[14px] bg-surface-2 font-bold text-text transition active:scale-[.985]"
          >
            회원가입
          </a>
        </div>
        <p className="mt-10 text-xs text-text-3">estate-web · 디자인 시스템 v0 (#1F8A70)</p>
      </div>
    </main>
  );
}
