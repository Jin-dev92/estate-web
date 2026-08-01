import { vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/test/query-wrapper";
import { mockFetch, initOf } from "@/test/mock-fetch";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";

afterEach(() => vi.unstubAllGlobals());

it("성공 시 호출되고 에러 없음", async () => {
  const fetchMock = mockFetch(200);
  renderWithClient(<MarkAllReadButton />);
  fireEvent.click(screen.getByText("모두 읽음"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(initOf(fetchMock).method).toBe("PATCH");
});

it("실패 시 에러 메시지 표시", async () => {
  mockFetch(500, { message: "처리하지 못했어요. 잠시 후 다시 시도해주세요." });
  renderWithClient(<MarkAllReadButton />);
  fireEvent.click(screen.getByText("모두 읽음"));
  await waitFor(() =>
    expect(screen.getByText("처리하지 못했어요. 잠시 후 다시 시도해주세요.")).toBeInTheDocument(),
  );
});
