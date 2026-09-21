// Builds the VLC Collection Entry Report for one date + shift: every VLC in the
// user's branch list, with what has happened to its milk so far.
//
//   completed      a finalized VLC entry exists (weight + FAT/SNF/rate)
//   pending        weighed (sample number given) but not analysed yet
//   not_collected  nothing recorded for this VLC in the shift
//
// A VLC can deliver more than one can (cow and buffalo, say), so it can have
// several rows. Its overall status is the least finished of them: any pending
// sample makes the VLC pending.

import type { VLCWeightRecord } from "@/services/vlcCollectionApi";

export type VlcReportStatus = "completed" | "pending" | "not_collected";

export interface VlcReportBranch {
  username: string;
  name: string;
  branchName?: string;
}

// A finalized row from /vlc-entries (vlc_collection_entry). DECIMALs arrive as strings.
export interface VlcReportEntry {
  id: number;
  vlc_id: string;
  type?: string | null;
  weight: number | string;
  fat: number | string;
  snf: number | string;
  clr: number | string;
  rate: number | string;
  amount: number | string;
  sample_id?: number | string | null;
  vlc_weight_id?: number | null;
}

export interface VlcReportRow {
  key: string;
  status: VlcReportStatus;
  sampleId: number | string | null;
  type: string | null;
  weight: number | null;
  fat: number | null;
  snf: number | null;
  clr: number | null;
  rate: number | null;
  amount: number | null;
}

export interface VlcReportGroup {
  vlcId: string;
  vlcName: string;
  branchName: string;
  status: VlcReportStatus;
  rows: VlcReportRow[];
}

export interface VlcReportSummary {
  totalVlcs: number;
  completedVlcs: number;
  pendingVlcs: number;
  notCollectedVlcs: number;
  completedSamples: number;
  pendingSamples: number;
  completedWeight: number;
  pendingWeight: number;
  totalAmount: number;
  // Weighted by weight over completed entries; null when nothing is completed.
  avgFat: number | null;
  avgSnf: number | null;
}

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const sampleOrder = (row: VlcReportRow) => {
  const n = Number(row.sampleId);
  return row.sampleId != null && row.sampleId !== "" && Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

// Totals of a set of rows — weight of everything listed, amount and weighted
// FAT/SNF of the completed ones. Used for the table footer and the exports, so
// both add up to exactly what is shown.
export function totalsOfRows(rows: VlcReportRow[]) {
  const done = rows.filter((r) => r.status === "completed");
  const doneWeight = done.reduce((s, r) => s + (r.weight ?? 0), 0);
  const avg = (pick: (r: VlcReportRow) => number | null) =>
    doneWeight > 0 ? done.reduce((s, r) => s + (pick(r) ?? 0) * (r.weight ?? 0), 0) / doneWeight : null;
  return {
    weight: rows.reduce((s, r) => s + (r.weight ?? 0), 0),
    amount: done.reduce((s, r) => s + (r.amount ?? 0), 0),
    fat: avg((r) => r.fat),
    snf: avg((r) => r.snf),
  };
}

export function buildVlcCollectionReport(
  branches: VlcReportBranch[],
  entries: VlcReportEntry[],
  weights: VLCWeightRecord[]
): { groups: VlcReportGroup[]; summary: VlcReportSummary } {
  // Weight rows that already became an entry are shown through that entry.
  const linkedWeightIds = new Set(entries.map((e) => e.vlc_weight_id).filter((id) => id != null).map(Number));

  const groups: VlcReportGroup[] = branches.map((branch) => {
    const vlcId = String(branch.username);

    const completedRows: VlcReportRow[] = entries
      .filter((e) => String(e.vlc_id) === vlcId)
      .map((e) => ({
        key: `entry-${e.id}`,
        status: "completed",
        sampleId: e.sample_id ?? null,
        type: e.type ?? null,
        weight: num(e.weight),
        fat: num(e.fat),
        snf: num(e.snf),
        clr: num(e.clr),
        rate: num(e.rate),
        amount: num(e.amount),
      }));

    const pendingRows: VlcReportRow[] = weights
      .filter((w) => String(w.vlc_id) === vlcId && Number(w.is_completed) !== 1 && !linkedWeightIds.has(Number(w.id)))
      .map((w) => ({
        key: `weight-${w.id}`,
        status: "pending",
        sampleId: w.sample_id ?? null,
        type: w.type ?? null,
        weight: num(w.weight),
        fat: null,
        snf: null,
        clr: null,
        rate: null,
        amount: null,
      }));

    const rows = [...completedRows, ...pendingRows].sort((a, b) => sampleOrder(a) - sampleOrder(b));
    const status: VlcReportStatus = pendingRows.length
      ? "pending"
      : completedRows.length
        ? "completed"
        : "not_collected";

    return {
      vlcId,
      vlcName: branch.name ?? "",
      branchName: branch.branchName ?? "",
      status,
      rows: rows.length
        ? rows
        : [{
            key: `none-${vlcId}`, status: "not_collected", sampleId: null, type: null,
            weight: null, fat: null, snf: null, clr: null, rate: null, amount: null,
          }],
    };
  });

  const allRows = groups.flatMap((g) => g.rows);
  const completed = allRows.filter((r) => r.status === "completed");
  const pending = allRows.filter((r) => r.status === "pending");
  const totals = totalsOfRows(allRows);

  return {
    groups,
    summary: {
      totalVlcs: groups.length,
      completedVlcs: groups.filter((g) => g.status === "completed").length,
      pendingVlcs: groups.filter((g) => g.status === "pending").length,
      notCollectedVlcs: groups.filter((g) => g.status === "not_collected").length,
      completedSamples: completed.length,
      pendingSamples: pending.length,
      completedWeight: totalsOfRows(completed).weight,
      pendingWeight: totalsOfRows(pending).weight,
      totalAmount: totals.amount,
      avgFat: totals.fat,
      avgSnf: totals.snf,
    },
  };
}
