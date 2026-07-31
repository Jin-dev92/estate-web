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
    // (.git/info/exclude로 무시됨). 제외하지 않으면 그쪽 .next 산출물까지
    // 검사해 이 레포와 무관한 에러가 수백 건 섞인다.
    ".claude/**",
  ]),
]);

export default eslintConfig;
