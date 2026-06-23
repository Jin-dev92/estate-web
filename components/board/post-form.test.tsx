import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { PostForm } from "./post-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

it("빈 폼 제출 시 zod 검증 오류가 표시되고 fetch는 호출되지 않는다", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  render(<PostForm buildingId="building-1" />);

  // title과 content를 지운 뒤 submit
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "글 등록" }));

  await waitFor(() => {
    const errors = screen.getAllByText("입력값을 확인해주세요");
    expect(errors.length).toBeGreaterThan(0);
  });

  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

it("유효한 폼 제출 시 API_ROUTES.buildingPosts(buildingId)로 fetch를 호출한다", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ id: "p1" }), { status: 201 }),
  );
  render(<PostForm buildingId="building-1" />);

  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "테스트 제목" } });
  // textarea는 label 연결이 없으므로 querySelector로 직접 선택
  const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: "테스트 내용" } });
  fireEvent.click(screen.getByRole("button", { name: "글 등록" }));

  await waitFor(() => {
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/buildings/building-1/posts",
      expect.objectContaining({ method: "POST" }),
    );
  });

  fetchSpy.mockRestore();
});
