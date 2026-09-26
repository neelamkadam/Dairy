import { useMemo } from "react";
import { useAppSelector } from "@/redux/store";

// Only this web user sees VLCs numbered 1, 2, 3 … on the reports, as on VLC
// collection entry. A VLC's number is its position in the branch list.
export const VLC_SERIAL_USER_ID = 44;

interface VlcLike {
  username: string | number;
  name?: string;
  branchName?: string;
}

/**
 * The VLC heading used by the Farmer List and NEFT reports and their exports:
 * "[n. ]VLC id - VLC name · branch name". Also sorts VLC ids into branch-list
 * order, which is the order those numbers run in.
 */
export const useVlcSectionLabel = () => {
  const branches = useAppSelector((state) => state.branch.branches) || [];
  const userId = useAppSelector((state) => state.authData.userData?.id);
  const showSerials = Number(userId) === VLC_SERIAL_USER_ID;

  const positionByUsername = useMemo(
    () => new Map(branches.map((b, i) => [String(b.username), i + 1])),
    [branches]
  );

  const label = (v: VlcLike) => {
    const serial = showSerials ? positionByUsername.get(String(v.username)) : undefined;
    return `${serial ? `${serial}. ` : ""}${v.username} - ${v.name || ""}${v.branchName ? ` · ${v.branchName}` : ""}`;
  };

  return { showSerials, label };
};
