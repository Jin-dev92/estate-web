import { call, authGet } from "./client";

export type Building = { id: string; name: string; address: string };
export type Unit = { id: string; buildingId: string; name: string; floor: number };

export const backendMyBuildings = (t: string) => authGet<Building[]>("/buildings", t);

export const backendBuildingUnits = (t: string, buildingId: string) =>
  authGet<Unit[]>(`/buildings/${buildingId}/units`, t);

export const backendCreateBuilding = (t: string, body: { name: string; address: string }) =>
  call<Building>("/buildings", {
    method: "POST",
    headers: { Authorization: `Bearer ${t}` },
    body: JSON.stringify(body),
  }, {});
