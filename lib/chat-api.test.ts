import { backendMyRooms, backendRoomMessages, backendEnsureRoom } from "@/lib/api";
import { mockFetch, initOf, urlOf } from "@/test/mock-fetch";

it("backendMyRooms: /chat/rooms를 Bearer로 호출한다", async () => {
  const fetchMock = mockFetch(200, []);
  await backendMyRooms("tok");
  const init = initOf(fetchMock);
  expect(urlOf(fetchMock)).toMatch(/\/chat\/rooms$/);
  expect(init.method).toBe("GET");
  expect(init.headers).toMatchObject({ Authorization: "Bearer tok" });
});

it("backendRoomMessages: roomId·limit 쿼리를 붙인다", async () => {
  const fetchMock = mockFetch(200, []);
  await backendRoomMessages("tok", "r1", 50);
  expect(urlOf(fetchMock)).toMatch(/\/chat\/rooms\/r1\/messages\?limit=50$/);
});

it("backendEnsureRoom: POST body로 buildingId·tenantId를 보낸다", async () => {
  const fetchMock = mockFetch(201, { id: "r1" });
  await backendEnsureRoom("tok", { buildingId: "b1", tenantId: "t1" });
  const init = initOf(fetchMock);
  expect(init.method).toBe("POST");
  expect(JSON.parse(String(init.body))).toEqual({ buildingId: "b1", tenantId: "t1" });
});
