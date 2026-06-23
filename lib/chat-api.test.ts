import { vi } from "vitest";
import { backendMyRooms, backendRoomMessages, backendEnsureRoom } from "@/lib/api";

it("backendMyRooms: /chat/rooms를 Bearer로 호출한다", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendMyRooms("tok");
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toMatch(/\/chat\/rooms$/);
  expect((init as RequestInit).method).toBe("GET");
  expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
});

it("backendRoomMessages: roomId·limit 쿼리를 붙인다", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendRoomMessages("tok", "r1", 50);
  expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/chat\/rooms\/r1\/messages\?limit=50$/);
});

it("backendEnsureRoom: POST body로 buildingId·tenantId를 보낸다", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "r1" }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  await backendEnsureRoom("tok", { buildingId: "b1", tenantId: "t1" });
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  expect(init.method).toBe("POST");
  expect(JSON.parse(String(init.body))).toEqual({ buildingId: "b1", tenantId: "t1" });
});
