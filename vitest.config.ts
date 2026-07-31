import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // .claude/worktrees는 다른 워크트리의 체크아웃이 얹히는 스크래치 경로다
    // (.git/info/exclude가 무시하는 대상과 같은 범위로 좁힌다 — .claude/** 로
    // 넓게 잡으면 나중에 .claude 아래 추가되는 테스트가 조용히 빠진다).
    // 제외하지 않으면 그쪽 테스트까지 수집해 무관한 실패가 섞인다.
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/worktrees/**"],
  },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
