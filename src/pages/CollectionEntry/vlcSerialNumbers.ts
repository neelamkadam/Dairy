import { useMemo } from "react";
import { useAppSelector } from "@/redux/store";

// Web users whose operators know their VLCs as 1, 2, 3 … rather than by the
// 500xxx ids. On VLC collection they get a number box beside the VLC picker.
// The number is only a shortcut: entries are still saved with the real VLC id.
const VLC_SERIAL_USER_IDS = [44];

interface NumberedBranch {
  username: string;
}

/**
 * VLC numbering for the logged-in user: a VLC's number is its position in the
 * branch list (the order the VLC dropdown shows), starting at 1.
 * `enabled` is false for everyone not in VLC_SERIAL_USER_IDS.
 */
export const useVlcSerialNumbers = <T extends NumberedBranch>(branches: T[]) => {
  const userId = useAppSelector((state) => state.authData?.userData?.id);
  const enabled = VLC_SERIAL_USER_IDS.includes(Number(userId));

  const numberByUsername = useMemo(
    () => new Map(branches.map((branch, index) => [String(branch.username), index + 1])),
    [branches]
  );

  return {
    enabled,
    count: branches.length,
    // The VLC's number, or null when numbering is off or the VLC is not in the list.
    numberOf: (username: string) => (enabled ? numberByUsername.get(String(username)) ?? null : null),
    // The VLC at a 1-based number, or null when out of range.
    branchAt: (number: number): T | null =>
      Number.isInteger(number) && number >= 1 && number <= branches.length ? branches[number - 1] : null,
  };
};
