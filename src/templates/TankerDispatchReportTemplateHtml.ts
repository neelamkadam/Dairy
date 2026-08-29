export interface TankerDispatchReportRow {
  isSummary?: boolean;
  label?: string;
  time?: string;
  vehicleNumber?: string;
  driverName?: string;
  destinationName?: string;
  milkType?: string;
  dispatch: { qty: any; fat: any; snf: any; clr: any; amount: any };
  dairy?: { qty: any; fat: any; snf: any; clr: any; amount: any } | null;
  difference?: { qty: any; fat: any; snf: any; clr: any; amount: any } | null;
}

export const generateTankerDispatchReportHtml = (
  rows: TankerDispatchReportRow[],
  vlcId: string,
  branchName: string,
  date: string
): string => {
  const formatDate = (value: string) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  const diffColor = (v: any) => {
    const n = parseFloat(v);
    if (isNaN(n)) return '#4b5563';
    if (n < 0) return '#dc2626';
    if (n > 0) return '#16a34a';
    return '#4b5563';
  };

  const num = (v: any, decimals = 2) => {
    if (v === null || v === undefined || v === '') return '-';
    const n = parseFloat(v);
    return isNaN(n) ? '-' : n.toFixed(decimals);
  };

  const cell = (cls: string, v: any, bold = false) =>
    `<td class="${cls}"${bold ? ' style="font-weight: bold;"' : ''}>${num(v)}</td>`;

  const diffCell = (v: any, bold = false) =>
    `<td class="diff" style="color: ${diffColor(v)};${bold ? ' font-weight: bold;' : ''}">${num(v)}</td>`;

  const emptyGroup = (cls: string) => `<td class="${cls}">-</td>`.repeat(5);

  const tableRows = rows.map((row) => {
    if (row.isSummary) {
      return `
    <tr class="summary-row">
      <td colspan="4" style="text-align: left; font-weight: bold; padding-left: 8px;">${row.label || 'TOTAL'}</td>
      ${cell('dispatch', row.dispatch.qty, true)}${cell('dispatch', row.dispatch.fat, true)}${cell('dispatch', row.dispatch.snf, true)}${cell('dispatch', row.dispatch.clr, true)}${cell('dispatch', row.dispatch.amount, true)}
      ${cell('dairy', row.dairy?.qty, true)}${cell('dairy', row.dairy?.fat, true)}${cell('dairy', row.dairy?.snf, true)}${cell('dairy', row.dairy?.clr, true)}${cell('dairy', row.dairy?.amount, true)}
      ${diffCell(row.difference?.qty, true)}${diffCell(row.difference?.fat, true)}${diffCell(row.difference?.snf, true)}${diffCell(row.difference?.clr, true)}${diffCell(row.difference?.amount, true)}
    </tr>`;
    }
    return `
    <tr>
      <td>${row.time || '-'}</td>
      <td>${row.vehicleNumber || '-'}<br/><span style="color: #6b7280;">${row.driverName || '-'}</span></td>
      <td>${row.destinationName || '-'}</td>
      <td>${row.milkType || '-'}</td>
      ${cell('dispatch', row.dispatch.qty)}${cell('dispatch', row.dispatch.fat)}${cell('dispatch', row.dispatch.snf)}${cell('dispatch', row.dispatch.clr)}${cell('dispatch', row.dispatch.amount)}
      ${emptyGroup('dairy')}
      ${emptyGroup('diff')}
    </tr>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Noto Sans Devanagari', 'Arial', sans-serif; margin: 0; padding: 20px 24px; color: #1f2937; }
        .header { text-align: center; margin-bottom: 16px; }
        .header h1 { margin: 0; font-size: 22px; color: #111827; }
        .header h2 { margin: 5px 0; font-size: 16px; color: #374151; }
        .info { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        th, td {
          border: 1px solid #9ca3af;
          text-align: center;
          vertical-align: middle;
          word-break: break-word;
          overflow: hidden;
        }
        th { background-color: #f3f4f6; padding: 6px 3px; font-size: 9px; font-weight: bold; line-height: 1.3; }
        td { padding: 5px 3px; font-size: 9px; line-height: 1.4; }
        td.dispatch { background-color: #f0fdf4; }
        td.dairy { background-color: #eff6ff; }
        td.diff { background-color: #faf5ff; }
        .section-header { background-color: #f3f4f6; font-weight: bold; }
        .summary-row td { background-color: #fef3c7; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Tanker Dispatch Report</h1>
        <h2>${branchName}</h2>
      </div>
      <div class="info">
        <div><strong>VLC ID:</strong> ${vlcId}</div>
        <div><strong>Date:</strong> ${formatDate(date)}</div>
        <div><strong>Generated On:</strong> ${formatDate(new Date().toISOString())}</div>
      </div>
      <table>
        <thead>
          <tr class="section-header">
            <th rowspan="2" style="width: 6%;">Time</th>
            <th rowspan="2" style="width: 11%;">Vehicle / Driver</th>
            <th rowspan="2" style="width: 10%;">Destination</th>
            <th rowspan="2" style="width: 6%;">Milk Type</th>
            <th colspan="5" style="background-color: #f0fdf4;">DISPATCH ENTRY</th>
            <th colspan="5" style="background-color: #eff6ff;">DAIRY DATA</th>
            <th colspan="5" style="background-color: #faf5ff;">DIFFERENCE (DISPATCH - DAIRY)</th>
          </tr>
          <tr>
            <th style="background-color: #f0fdf4;">Qty</th>
            <th style="background-color: #f0fdf4;">Fat</th>
            <th style="background-color: #f0fdf4;">SNF</th>
            <th style="background-color: #f0fdf4;">CLR</th>
            <th style="background-color: #f0fdf4;">Amt</th>
            <th style="background-color: #eff6ff;">Qty</th>
            <th style="background-color: #eff6ff;">Fat</th>
            <th style="background-color: #eff6ff;">SNF</th>
            <th style="background-color: #eff6ff;">CLR</th>
            <th style="background-color: #eff6ff;">Amt</th>
            <th style="background-color: #faf5ff;">Qty</th>
            <th style="background-color: #faf5ff;">Fat</th>
            <th style="background-color: #faf5ff;">SNF</th>
            <th style="background-color: #faf5ff;">CLR</th>
            <th style="background-color: #faf5ff;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
};
