import { authPost } from "./client";
import type { Unit } from "./building";

export const backendCreateUnit = (t: string, buildingId: string, body: { name: string; floor: number }) =>
  authPost<Unit>(`/buildings/${buildingId}/units`, t, body);
