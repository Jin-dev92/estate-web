import { test, expect } from "@playwright/test";
import { PAGE_ROUTES } from "../../lib/constants";
import { loginAs } from "../fixtures/auth";

// Playwright 에이전트(Planner/Generator)의 환경 시드 — 에이전트가 이 테스트를 실행해
// 인증된 상태에서 탐색을 시작하고, 여기 쓰인 셋업 패턴(loginAs 쿠키 주입)을 배운다.
// 인증 시작점 규약(AGENTS.md E2E): 로그인 UI를 거치지 않고 loginAs로 세션을 주입한다.
test("seed", async ({ page, context }) => {
  await loginAs(context);
  await page.goto(PAGE_ROUTES.dashboard);
  await expect(page.getByRole("heading", { name: "내 계약" })).toBeVisible();
});
