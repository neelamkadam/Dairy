import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@/redux/store";
import { getMachineOnly, getSidebarAccess } from "@/services/sidebarAccessApi";

export interface MachineEntryLock {
  /** FAT/SNF/CLR may not be typed: only the analyser fills them. */
  analyser: boolean;
  /** The weight / quantity may not be typed: only the weighing machine fills it. */
  weight: boolean;
}

const NO_LOCK: MachineEntryLock = { analyser: false, weight: false };

/**
 * The signed-in user's Machine Entry Lock (Settings → Machine Entry Lock),
 * read from their Sidebar Access. The same at every VLC. The VLC's General
 * Settings switches are for the mobile app and play no part here.
 *
 * On the web the analyser can fill FAT/SNF on Farmer Collection Entry; there
 * is no weighing-machine connection, so a user locked on weight cannot save
 * a weight here at all (Doodh Setu PC reads the scale).
 */
export function useMachineEntryLock(): MachineEntryLock {
  const userId = useAppSelector((state) => state.authData.userData?.id);
  const [lock, setLock] = useState<MachineEntryLock>(NO_LOCK);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getSidebarAccess(Number(userId))
      .then((response) => {
        if (!cancelled && response?.success) setLock(getMachineOnly(response.data));
      })
      .catch((error) => console.error("Failed to load Machine Entry Lock:", error));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return lock;
}

/**
 * What the machine last put in each field. A locked save checks the field
 * still holds that, which also catches a value typed before the lock loaded.
 * Values loaded to edit a saved entry are accepted too.
 */
export function useMachineValues<K extends string>() {
  const values = useRef<Partial<Record<K, string>>>({});
  return useMemo(
    () => ({
      accept: (field: K, value: string) => {
        values.current[field] = value;
      },
      fromMachine: (field: K, value: string) => values.current[field] === value,
    }),
    []
  );
}

/** Look of a machine-only entry field (readOnly: still focusable, so Enter moves on). */
export const LOCKED_INPUT_CLASS = "bg-gray-100 text-gray-900 cursor-not-allowed";
export const LOCKED_INPUT_TITLE = "Comes from the machine only (Machine Entry Lock)";
