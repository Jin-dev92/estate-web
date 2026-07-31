import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 다른 워크트리의 체크아웃·빌드 산출물이 얹히는 스크래치 경로
    // (.git/info/exclude가 무시하는 대상과 같은 범위로 좁힌다 — .claude/** 로
    // 넓게 잡으면 나중에 .claude 아래 추가되는 소스가 조용히 린트에서 빠진다).
    // 제외하지 않으면 그쪽 .next 산출물까지 검사해 무관한 에러가 수백 건 섞인다.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
