import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const reset = vi.fn();
vi.mock("@/components/notifications/notification-provider", () => ({
  useNotifications: () => ({ reset, unread: 3, liveItems: [], decrement: vi.fn() }),
}));

import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset(); reset.mockReset(); });

it("성공 시 reset과 refresh 호출", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
  render(<MarkAllReadButton />);
  fireEvent.click(screen.getByText("모두 읽음"));
  await waitFor(() => expect(reset).toHaveBeenCalled());
  expect(refresh).toHaveBeenCalled();
});

it("실패 시 에러 메시지 표시", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "처리하지 못했어요. 잠시 후 다시 시도해주세요." }), { status: 500 })));
  render(<MarkAllReadButton />);
  fireEvent.click(screen.getByText("모두 읽음"));
  await waitFor(() => expect(screen.getByText("처리하지 못했어요. 잠시 후 다시 시도해주세요.")).toBeInTheDocument());
  expect(reset).not.toHaveBeenCalled();
});
