import { authGet } from "./client";

export type Building = { id: string; name: string; address: string };

export const backendMyBuildings = (t: string) => authGet<Building[]>("/buildings", t);
