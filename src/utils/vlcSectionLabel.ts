import { useMemo } from "react";
import { useAppSelector } from "@/redux/store";

// Only this web user sees VLCs numbered 1, 2, 3 … across the app (dropdowns,
// report tables, headings and exports), as on VLC collection entry.
// A VLC's number is its position in the full branch list, so it is the same
// on every page whatever list a page passes around.
export const VLC_SERIAL_USER_ID = 44;

interface VlcLike {
  username: string | number;
  name?: string;
  branchName?: string;
}

export const useVlcNumbering = () => {
  const branches = useAppSelector((state) => state.branch.branches) || [];
  const userId = useAppSelector((state) => state.authData.userData?.id);
  const enabled = Number(userId) === VLC_SERIAL_USER_ID;

  const { byUsername, byBranchId } = useMemo(() => {
    const byUsername = new Map<string, number>();
    const byBranchId = new Map<string, number>();
    branches.forEach((b, i) => {
      byUsername.set(String(b.username), i + 1);
      byBranchId.set(String(b.branch_id), i + 1);
    });
    return { byUsername, byBranchId };
  }, [branches]);

  // Position in the branch list whether or not numbering is on (used by the dropdown).
  const positionOf = (username: string | number | null | undefined) =>
    username == null ? undefined : byUsername.get(String(username));

  // The VLC's number, or null when numbering is off / the VLC is unknown.
  // Accepts the VLC login id (500xxx) or, failing that, the branch id.
  const numberOf = (id: string | number | null | undefined): number | null => {
    if (!enabled || id == null) return null;
    return byUsername.get(String(id)) ?? byBranchId.get(String(id)) ?? null;
  };

  // "3. " for a numbered VLC, "" otherwise — put in front of any VLC text.
  const prefix = (id: string | number | null | undefined) => {
    const n = numberOf(id);
    return n != null ? `${n}. ` : "";
  };

  return { enabled, positionOf, numberOf, prefix };
};

/**
 * The VLC heading used by the Farmer List and NEFT reports and their exports:
 * "[n. ]VLC id - VLC name · branch name".
 */
export const useVlcSectionLabel = () => {
  const { enabled, numberOf } = useVlcNumbering();

  const label = (v: VlcLike) => {
    const serial = numberOf(v.username);
    return `${serial ? `${serial}. ` : ""}${v.username} - ${v.name || ""}${v.branchName ? ` · ${v.branchName}` : ""}`;
  };

  // Compact form for a table column: "1 - VLC name - branch" (the VLC id in place of
  // the number for everyone who does not use the numbering).
  const columnLabel = (v: VlcLike) => {
    const serial = numberOf(v.username);
    return [serial ?? v.username, v.name, v.branchName].filter(Boolean).join(" - ");
  };

  return { showSerials: enabled, label, columnLabel };
};
