import { vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/test/query-wrapper";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

afterEach(() => vi.unstubAllGlobals());

it("성공 시 호출되고 에러 없음", async () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  renderWithClient(<MarkAllReadButton />);
  fireEvent.click(screen.getByText("모두 읽음"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("PATCH");
});

it("실패 시 에러 메시지 표시", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "처리하지 못했어요. 잠시 후 다시 시도해주세요." }), { status: 500 })));
  renderWithClient(<MarkAllReadButton />);
  fireEvent.click(screen.getByText("모두 읽음"));
  await waitFor(() => expect(screen.getByText("처리하지 못했어요. 잠시 후 다시 시도해주세요.")).toBeInTheDocument());
});
