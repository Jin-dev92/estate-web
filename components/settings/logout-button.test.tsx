import { vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { LogoutButton } from "@/components/settings/logout-button";

afterEach(() => { vi.unstubAllGlobals(); push.mockReset(); });

it("DELETE /api/session 후 로그인으로 이동", async () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  render(<LogoutButton />);
  fireEvent.click(screen.getByText("로그아웃"));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
});
