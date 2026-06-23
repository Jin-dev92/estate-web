import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StartChatButton } from "@/components/chat/start-chat-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockReset();
});

it("성공 시 생성된 방으로 이동한다", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "r9" }), { status: 201 })));
  render(<StartChatButton buildingId="b1" tenantId="t1" label="문의하기" />);
  fireEvent.click(screen.getByText("문의하기"));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/chat/r9"));
});

it("실패 시 에러 메시지를 표시한다", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "권한 없음" }), { status: 403 })));
  render(<StartChatButton buildingId="b1" tenantId="t1" label="문의하기" />);
  fireEvent.click(screen.getByText("문의하기"));
  await waitFor(() => expect(screen.getByText("권한 없음")).toBeInTheDocument());
  expect(push).not.toHaveBeenCalled();
});
