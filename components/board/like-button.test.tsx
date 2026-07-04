import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { LikeButton } from "./like-button";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// 제어 가능한 지연 응답: 낙관적 상태를 응답 전에 관찰하기 위함.
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

afterEach(() => vi.restoreAllMocks());

it("초기 렌더: initialLikeCount·initialLikedByMe를 반영한다", () => {
  renderWithClient(<LikeButton postId="p1" initialLikeCount={3} initialLikedByMe={true} />);
  const btn = screen.getByRole("button", { name: "좋아요" });
  expect(btn).toHaveAttribute("aria-pressed", "true");
  expect(within(btn).getByText("3")).toBeInTheDocument();
});

it("낙관적 좋아요: 클릭 즉시(응답 전) 카운트 +1·pressed=true", async () => {
  const d = deferred<Response>();
  vi.spyOn(globalThis, "fetch").mockReturnValueOnce(d.promise);
  renderWithClient(<LikeButton postId="p1" initialLikeCount={2} initialLikedByMe={false} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);

  expect(btn).toHaveAttribute("aria-pressed", "true");
  expect(within(btn).getByText("3")).toBeInTheDocument();

  // 정리: 응답 흘려보내 pending mutation 종료
  d.resolve(okResponse({ liked: true, likeCount: 3 }));
  await waitFor(() => expect(within(btn).getByText("3")).toBeInTheDocument());
});

it("성공 시 서버 likeCount로 보정한다(낙관 +1 이후 서버값 5)", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(okResponse({ liked: true, likeCount: 5 }));
  renderWithClient(<LikeButton postId="p1" initialLikeCount={2} initialLikedByMe={false} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);

  await waitFor(() => expect(within(btn).getByText("5")).toBeInTheDocument());
  expect(btn).toHaveAttribute("aria-pressed", "true");
});

it("실패 시 이전 카운트·pressed 상태로 롤백한다", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "fail" }), { status: 500 }),
  );
  renderWithClient(<LikeButton postId="p1" initialLikeCount={2} initialLikedByMe={false} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);
  // 낙관적으로 먼저 +1
  expect(within(btn).getByText("3")).toBeInTheDocument();

  // 실패 후 롤백
  await waitFor(() => expect(within(btn).getByText("2")).toBeInTheDocument());
  expect(btn).toHaveAttribute("aria-pressed", "false");
});

it("취소: liked=true에서 클릭하면 카운트 -1·pressed=false", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(okResponse({ liked: false, likeCount: 2 }));
  renderWithClient(<LikeButton postId="p1" initialLikeCount={3} initialLikedByMe={true} />);
  const btn = screen.getByRole("button", { name: "좋아요" });

  fireEvent.click(btn);

  await waitFor(() => expect(within(btn).getByText("2")).toBeInTheDocument());
  expect(btn).toHaveAttribute("aria-pressed", "false");
});
