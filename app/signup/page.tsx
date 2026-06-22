import Link from "next/link";

export default function SignupChoice() {
  return (
    <main className="flex-1 grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-[24px] font-extrabold tracking-tight text-text">어떻게 시작할까요?</h1>
        <p className="mb-6 text-[15px] text-text-2">역할에 맞는 방식으로 가입하세요.</p>
        <div className="flex flex-col gap-3">
          <Link href="/signup/owner" className="rounded-[20px] border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
            <div className="text-[16px] font-bold text-text">건물주로 시작</div>
            <div className="mt-1 text-[14px] text-text-2">건물·호실을 등록하고 입주자를 초대해요</div>
          </Link>
          <Link href="/signup/tenant" className="rounded-[20px] border border-border bg-surface p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5">
            <div className="text-[16px] font-bold text-text">입주자로 시작</div>
            <div className="mt-1 text-[14px] text-text-2">건물주에게 받은 초대코드가 필요해요</div>
          </Link>
        </div>
        <p className="mt-5 text-center text-[14px] text-text-2">
          이미 계정이 있나요? <Link href="/login" className="font-bold text-brand-600">로그인</Link>
        </p>
      </div>
    </main>
  );
}
