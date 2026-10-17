import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/redux/store";
import type { BranchState } from "@/redux/branchSlice";
import { routeApi } from "@/services/routeBmcCcApi";

export const ALL_ROUTES = "all";

type Branch = BranchState["branches"][number];

export interface VlcRoute {
  id: string;
  name: string;
  vlcCount: number;
}

// The routes created under the user's admin (sub-users share them), for pages
// that pick VLCs: choosing a route narrows the VLC list to that route's VLCs.
// Only VLCs in the user's own branch list count, so a route with none of them
// is left out, and a route's VLCs keep their branch-list order (VLC numbering).
export const useRouteFilter = () => {
  const userId = useAppSelector((state) => state.authData.userData?.id);
  const branches = useAppSelector((state) => state.branch.branches);
  const [rawRoutes, setRawRoutes] = useState<any[]>([]);
  const [routeId, setRouteId] = useState(ALL_ROUTES);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    routeApi
      .list(Number(userId))
      .then((r) => {
        const data = r.data?.data ?? r.data ?? [];
        if (!cancelled) setRawRoutes(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error("Failed to load routes:", error));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const branchesByRoute = useMemo(() => {
    const map = new Map<string, Branch[]>();
    rawRoutes.forEach((route) => {
      const dairyIds = new Set((route.vlcs ?? []).map((v: any) => String(v.dairy_id ?? v.id)));
      const own = (branches || []).filter((b) => dairyIds.has(String(b.branch_id)));
      if (own.length > 0) map.set(String(route.route_id ?? route.id), own);
    });
    return map;
  }, [rawRoutes, branches]);

  const routes: VlcRoute[] = useMemo(
    () =>
      rawRoutes
        .map((route) => {
          const id = String(route.route_id ?? route.id);
          return { id, name: route.name || id, vlcCount: branchesByRoute.get(id)?.length ?? 0 };
        })
        .filter((route) => route.vlcCount > 0),
    [rawRoutes, branchesByRoute]
  );

  // The VLCs of a route; every branch for "All Routes" (or a route that is gone).
  const branchesOf = (id: string): Branch[] =>
    (id !== ALL_ROUTES && branchesByRoute.get(id)) || branches || [];

  return { routes, routeId, setRouteId, branchesOf, routeBranches: branchesOf(routeId) };
};
