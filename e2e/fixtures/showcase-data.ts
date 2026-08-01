import type { Building, Unit, ChatRoom, Post, PostDetail, Comment, Notification, backendUnreadCount } from "../../lib/api";
import { POST_CATEGORY, NOTIFICATION_TYPE } from "../../lib/constants";
import { E2E_BUILDING, E2E_BOARD, E2E_CHAT } from "./e2e-constants";

/**
 * README 스크린샷(`docs/screenshots/screens.gif`) 전용 데이터.
 *
 * E2E 픽스처(mock-data.ts)는 "존재 확인"만 하면 되므로 항목이 1건씩이다. 그 상태로 화면을
 * 찍으면 목록이 한 줄이고 아래가 텅 비어 서비스가 실제보다 빈약해 보인다. 여기서는 실제
 * 사용 중인 화면처럼 보이도록 항목을 채운다.
 *
 * **E2E와 격리된다.** 목 BE는 `MOCK_SHOWCASE=1`일 때만 이 데이터를 쓴다. 환경변수가 없으면
 * 기존 E2E 픽스처 그대로다 — 데이터를 늘리면 빈 목록에 의존하는 테스트가 깨진다
 * (`chat.spec.ts`의 "입주자는 채팅이 없을 때 건물주에게 문의를 시작해").
 *
 * 반환 타입은 E2E 픽스처와 동일하게 `lib/api` 도메인 타입에 묶는다(drift 게이트).
 */

const OWNER_ID = "u-owner-e2e";
const TENANT_ID = "u-e2e";

// 화면에 날짜가 보이므로 상대적으로 최근처럼 읽히는 고정 날짜를 쓴다.
// 고정값이라 스크린샷을 다시 찍어도 결과가 같다(GIF 재생성 시 diff 최소화).
const DAY = (d: number) => `2026-07-${String(d).padStart(2, "0")}T09:00:00.000Z`;

export function showcaseBuildings(): Building[] {
  return [
    { id: E2E_BUILDING.id, name: E2E_BUILDING.name, address: E2E_BUILDING.address },
    { id: "b-sunwoo", name: "선우빌라", address: "서울시 마포구 성미산로 23" },
    { id: "b-hanul", name: "하늘채 오피스텔", address: "서울시 성동구 왕십리로 118" },
  ];
}

export function showcaseUnits(): Unit[] {
  return [
    { id: E2E_BUILDING.unitId, buildingId: E2E_BUILDING.id, name: E2E_BUILDING.unitName, floor: E2E_BUILDING.floor },
    { id: "u-202", buildingId: E2E_BUILDING.id, name: "202호", floor: 2 },
    { id: "u-301", buildingId: E2E_BUILDING.id, name: "301호", floor: 3 },
    { id: "u-302", buildingId: E2E_BUILDING.id, name: "302호", floor: 3 },
    { id: "u-401", buildingId: E2E_BUILDING.id, name: "401호", floor: 4 },
  ];
}

export function showcaseChatRooms(): ChatRoom[] {
  return [
    {
      id: E2E_CHAT.roomId,
      buildingId: E2E_BUILDING.id,
      ownerId: OWNER_ID,
      tenantId: TENANT_ID,
      lastMessage: { content: "확인했습니다. 오늘 오후에 기사님 보낼게요.", createdAt: DAY(28) },
    },
    {
      id: "room-202",
      buildingId: E2E_BUILDING.id,
      ownerId: OWNER_ID,
      tenantId: "u-202-tenant",
      lastMessage: { content: "네, 관리비 고지서 확인했습니다. 감사합니다.", createdAt: DAY(26) },
    },
    {
      id: "room-301",
      buildingId: E2E_BUILDING.id,
      ownerId: OWNER_ID,
      tenantId: "u-301-tenant",
      lastMessage: { content: "주차 자리 변경 건 문의드려요.", createdAt: DAY(24) },
    },
  ];
}

export function showcasePosts(): Post[] {
  return [
    { id: E2E_BOARD.postId, category: POST_CATEGORY.NOTICE, title: "8월 정기 소독 안내 (8/5 오전)", authorId: OWNER_ID, createdAt: DAY(30), likeCount: 12, likedByMe: true },
    { id: "p-water", category: POST_CATEGORY.NOTICE, title: "저수조 청소로 8/2 10~14시 단수됩니다", authorId: OWNER_ID, createdAt: DAY(29), likeCount: 8, likedByMe: false },
    { id: "p-parking", category: POST_CATEGORY.FREE, title: "지하 주차장 자리 바꾸실 분 계신가요?", authorId: TENANT_ID, createdAt: DAY(27), likeCount: 5, likedByMe: false },
    { id: "p-recycle", category: POST_CATEGORY.FREE, title: "분리수거 요일 헷갈려서 정리해봤어요", authorId: "u-202-tenant", createdAt: DAY(25), likeCount: 21, likedByMe: true },
    { id: "p-wifi", category: POST_CATEGORY.FREE, title: "공용 와이파이 비밀번호 바뀐 것 맞나요?", authorId: "u-301-tenant", createdAt: DAY(23), likeCount: 3, likedByMe: false },
    { id: "p-elevator", category: POST_CATEGORY.NOTICE, title: "엘리베이터 정기 점검 결과 공유", authorId: OWNER_ID, createdAt: DAY(21), likeCount: 6, likedByMe: false },
  ];
}

export function showcaseComments(): Comment[] {
  return [
    { id: "c-1", authorId: "u-202-tenant", content: "안내 감사합니다. 그날 오전에는 창문 닫아두면 될까요?" },
    { id: "c-2", authorId: OWNER_ID, content: "네, 창문만 닫아두시면 됩니다. 30분이면 끝납니다." },
    { id: "c-3", authorId: "u-301-tenant", content: "저희 집은 오후에 부탁드려도 될까요? 오전에 재택이라서요." },
    { id: "c-4", authorId: OWNER_ID, content: "가능합니다. 301호는 오후 2시로 잡아두겠습니다." },
  ];
}

/**
 * 게시글 상세. 목록에 있는 글이면 그 글로, 아니면 첫 글로 폴백한다.
 * 본문은 스크린샷에서 한 화면을 채울 만큼만 쓴다.
 */
export function showcasePostDetail(id: string): PostDetail {
  const base = showcasePosts().find((p) => p.id === id) ?? showcasePosts()[0];
  return {
    ...base,
    content:
      "8월 5일(화) 오전 9시부터 11시까지 전 세대 정기 소독을 진행합니다.\n\n" +
      "소독약은 인체에 무해한 친환경 제품을 사용하며, 세대당 5분 내외로 끝납니다.\n" +
      "부재 시에도 공용부만 진행하니 따로 연락 주시지 않아도 됩니다.\n\n" +
      "문의는 이 글 댓글이나 1:1 채팅으로 남겨주세요.",
    comments: showcaseComments(),
  };
}

export function showcaseNotifications(): Notification[] {
  return [
    { id: "n-1", type: NOTIFICATION_TYPE.PostAdded, title: "새 공지가 등록됐어요", body: "8월 정기 소독 안내 (8/5 오전)", entityType: "post", entityId: E2E_BOARD.postId, buildingId: E2E_BOARD.buildingId, readAt: null, createdAt: DAY(30) },
    { id: "n-2", type: NOTIFICATION_TYPE.CommentAdded, title: "댓글이 달렸어요", body: "네, 창문만 닫아두시면 됩니다. 30분이면 끝납니다.", entityType: "comment", entityId: E2E_BOARD.postId, buildingId: E2E_BOARD.buildingId, readAt: null, createdAt: DAY(30) },
    { id: "n-3", type: NOTIFICATION_TYPE.MessageReceived, title: "새 메시지가 도착했어요", body: "확인했습니다. 오늘 오후에 기사님 보낼게요.", entityType: "chat", entityId: E2E_CHAT.roomId, buildingId: E2E_BUILDING.id, readAt: null, createdAt: DAY(28) },
    { id: "n-4", type: NOTIFICATION_TYPE.PostAdded, title: "새 공지가 등록됐어요", body: "저수조 청소로 8/2 10~14시 단수됩니다", entityType: "post", entityId: "p-water", buildingId: E2E_BOARD.buildingId, readAt: DAY(29), createdAt: DAY(29) },
    { id: "n-5", type: NOTIFICATION_TYPE.CommentAdded, title: "댓글이 달렸어요", body: "분리수거 요일 헷갈려서 정리해봤어요", entityType: "comment", entityId: "p-recycle", buildingId: E2E_BOARD.buildingId, readAt: DAY(25), createdAt: DAY(25) },
  ];
}

/** 미읽음 개수 — showcaseNotifications()의 readAt=null 건수와 일치시킨다. */
export function showcaseUnreadCount(): Awaited<ReturnType<typeof backendUnreadCount>> {
  return { count: showcaseNotifications().filter((n) => n.readAt === null).length };
}
