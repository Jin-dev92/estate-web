import { backendRefresh } from "./api";
import type { TokenPair } from "./api";

/**
 * 갱신 결과를 공유하는 시간(ms). 갱신이 끝난 직후 도착한 병렬 요청까지 덮는다.
 *
 * 왜 필요한가: 브라우저는 한 페이지에서 문서와 여러 /api/* 요청을 병렬로 보낸다.
 * 이들이 모두 액세스 쿠키 없이 출발하면, 하나가 갱신을 마친 뒤 나머지가
 * 옛 리프레시 토큰을 제출한다. BE는 이미 소비된 토큰의 재제출을 침해로 판정해
 * 세션 가족 전체를 폐기한다(estate-server refresh-tokens.use-case.ts:46) —
 * 정상 사용자가 전 기기에서 로그아웃된다. 결과를 잠깐 남겨 그 재제출을 없앤다.
 *
 * 10초는 한 페이지 로드의 병렬 요청이 모두 도착하기에 넉넉하고,
 * 15분 액세스 토큰 수명에 비해 짧아 갱신 주기를 늘리지 않는다.
 */
const RESULT_TTL_MS = 10_000;

/**
 * 진행 중이거나 방금 끝난 갱신을 리프레시 토큰별로 보관한다.
 *
 * ponytail: 프로세스 메모리 맵이라 서버 인스턴스가 여러 개면 인스턴스별로만
 * 합쳐진다. 인스턴스 간 경합까지 막아야 하면 공유 저장소(Redis 등) 락으로
 * 승격한다. Next docs가 proxy에서 공유 모듈 의존을 권하지 않지만(proxy.md:19,
 * CDN 분산 배포 전제), proxy 런타임은 nodejs 고정이라 단일 프로세스 안에서는
 * 동작한다.
 *
 * ponytail: RESULT_TTL_MS(10초)를 넘겨 도착하는 요청은 여전히 옛 토큰을 들고
 * 있으면 가족 폐기를 유발한다 — 서버리스 콜드 스타트, 느린 SSR 뒤 큐잉된 요청,
 * 백그라운드 탭 복귀, 모바일 네트워크 지연이 이 구간에 들어간다. 10초는
 * "한 페이지 로드의 병렬 요청"을 덮는 휴리스틱이지 보장이 아니다. 이 절벽까지
 * 없애려면 옛→새 토큰 매핑을 세션 가족 단위로 더 길게(예: 액세스 토큰 수명만큼)
 * 보관해 늦게 도착한 옛 토큰도 새 토큰으로 매핑해주는 방식으로 승격한다.
 */
const inFlight = new Map<string, Promise<TokenPair>>();

/**
 * 리프레시 토큰으로 새 토큰 쌍을 받는다. 같은 토큰의 갱신은 한 번만 실행되고
 * 결과가 공유된다(single-flight). backendRefresh를 직접 부르지 말고 이 함수를 쓴다.
 */
export function refreshSession(refreshToken: string): Promise<TokenPair> {
  const shared = inFlight.get(refreshToken);
  if (shared) return shared;

  const pending = backendRefresh(refreshToken);
  inFlight.set(refreshToken, pending);

  pending.then(
    () => {
      // 성공은 TTL 동안 남긴다(위 RESULT_TTL_MS 주석 참고).
      // unref로 타이머가 프로세스 종료를 붙잡지 않게 한다(테스트·서버리스 환경).
      // identity 체크: 이 타이머가 예약된 뒤 이 항목이 지워지고 같은 키로
      // 새 항목이 들어오면, 발화 시점에 옛 타이머가 그 새 항목까지 지우지
      // 않게 막는다(무효화 경로가 늘어나도 안전).
      const timer = setTimeout(() => {
        if (inFlight.get(refreshToken) === pending) inFlight.delete(refreshToken);
      }, RESULT_TTL_MS);
      timer.unref?.();
    },
    () => {
      // 실패는 즉시 비운다 — 순단으로 한 번 실패한 것을 붙잡아두면
      // 복구 가능한 사용자를 로그인 화면으로 보낸다.
      if (inFlight.get(refreshToken) === pending) inFlight.delete(refreshToken);
    },
  );

  return pending;
}
