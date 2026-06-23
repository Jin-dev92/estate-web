import { authGet } from "./client";
import { LeaseStatus } from "../constants";

export type Lease = {
  id: string;
  unitId: string;
  status: LeaseStatus;
  unitName: string | null;
  buildingName: string | null;
  buildingId: string | null;
};

export const backendMyLeases = (t: string) => authGet<Lease[]>("/me/leases", t);
