
export const generateVLCDifferenceReportHtml = (
  reportData: any[],
  vlcId: string,
  fromDate: string,
  toDate: string,
  shift: string,
  branchName: string,
  includeMilkCollection: boolean = false
): string => {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  const diffColor = (v: any) => {
    const n = parseFloat(v);
    if (n < 0) return '#dc2626';
    if (n > 0) return '#16a34a';
    return '#4b5563';
  };

  const milkBody = (row: any) => !includeMilkCollection ? '' : `
      <td class="milk">${row.milk_collection ? parseFloat(row.milk_collection.total_weight).toFixed(2) : '-'}</td>
      <td class="milk">${row.milk_collection ? parseFloat(row.milk_collection.avg_fat).toFixed(2) : '-'}</td>
      <td class="milk">${row.milk_collection ? parseFloat(row.milk_collection.avg_snf).toFixed(2) : '-'}</td>
      <td class="milk">${row.milk_collection ? parseFloat(row.milk_collection.avg_rate || 0).toFixed(2) : '-'}</td>
      <td class="milk">${row.milk_collection ? parseFloat(row.milk_collection.total_amount || 0).toFixed(2) : '-'}</td>`;

  const milkGroupHeader = !includeMilkCollection ? '' : `
            <th colspan="5" style="background-color: #e5e7eb;">MILK COLLECTION</th>`;

  const milkSubHeader = !includeMilkCollection ? '' : `
            <th style="background-color: #e5e7eb;">Qty</th>
            <th style="background-color: #e5e7eb;">Fat</th>
            <th style="background-color: #e5e7eb;">SNF</th>
            <th style="background-color: #e5e7eb;">Rate</th>
            <th style="background-color: #e5e7eb;">Amt</th>`;

  const diffCellHtml = (obj: any, key: string, cls: string, bold = false) => {
    const v = obj && obj[key] !== undefined && obj[key] !== null ? obj[key] : null;
    if (v === null) return `<td class="${cls}">-</td>`;
    return `<td class="${cls}" style="color: ${diffColor(v)};${bold ? ' font-weight: bold;' : ''}">${parseFloat(v).toFixed(2)}</td>`;
  };

  const totalCols = includeMilkCollection ? 23 : 18;

  const tableRows = reportData.map((row) => {
    // Section divider naming each VLC/branch when multiple VLCs are exported.
    if (row.isVlcHeader) {
      return `
    <tr>
      <td colspan="${totalCols}" style="text-align: left; font-weight: bold; background-color: #dbeafe; color: #1e3a8a; padding: 6px 8px; font-size: 10px;">${row.vlcLabel}</td>
    </tr>`;
    }
    // "SUMMARY" label row above the weighted-average summary rows.
    if (row.isSummaryHeader) {
      return `
    <tr>
      <td colspan="${totalCols}" style="text-align: left; font-weight: bold; background-color: #fde68a; color: #78350f; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Summary</td>
    </tr>`;
    }
    return `
    <tr>
      <td>${row.period}</td>
      <td>${row.shift}</td>
      <td>${row.type}</td>
      <td class="vlc">${parseFloat(row.vlc.total_weight).toFixed(2)}</td>
      <td class="vlc">${parseFloat(row.vlc.avg_fat).toFixed(2)}</td>
      <td class="vlc">${parseFloat(row.vlc.avg_snf).toFixed(2)}</td>
      <td class="vlc">${parseFloat(row.vlc.avg_rate || 0).toFixed(2)}</td>
      <td class="vlc">${parseFloat(row.vlc.total_amount).toFixed(2)}</td>${milkBody(row)}
      <td class="dairy">${parseFloat(row.dairy.total_weight).toFixed(2)}</td>
      <td class="dairy">${parseFloat(row.dairy.avg_fat).toFixed(2)}</td>
      <td class="dairy">${parseFloat(row.dairy.avg_snf).toFixed(2)}</td>
      <td class="dairy">${parseFloat(row.dairy.avg_rate || 0).toFixed(2)}</td>
      <td class="dairy">${parseFloat(row.dairy.total_amount).toFixed(2)}</td>
      <td class="diff" style="color: ${diffColor(row.difference.weight)};">${parseFloat(row.difference.weight).toFixed(2)}</td>
      <td class="diff" style="color: ${diffColor(row.difference.fat)};">${parseFloat(row.difference.fat).toFixed(2)}</td>
      <td class="diff" style="color: ${diffColor(row.difference.snf)};">${parseFloat(row.difference.snf).toFixed(2)}</td>
      <td class="diff" style="color: ${diffColor(row.difference.rate || 0)};">${parseFloat(row.difference.rate || 0).toFixed(2)}</td>
      <td class="diff" style="color: ${diffColor(row.difference.amount)}; font-weight: bold;">${parseFloat(row.difference.amount).toFixed(2)}</td>
    </tr>`;
  }).join('');

  // ---- Second table: difference breakdown (VLC − Milk | Milk − Dairy) ----
  const diffTableCols = 13;
  const diffTableRows = !includeMilkCollection ? '' : reportData.map((row) => {
    if (row.isVlcHeader) {
      return `
    <tr>
      <td colspan="${diffTableCols}" style="text-align: left; font-weight: bold; background-color: #dbeafe; color: #1e3a8a; padding: 6px 8px; font-size: 10px;">${row.vlcLabel}</td>
    </tr>`;
    }
    if (row.isSummaryHeader) {
      return `
    <tr>
      <td colspan="${diffTableCols}" style="text-align: left; font-weight: bold; background-color: #fde68a; color: #78350f; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Summary</td>
    </tr>`;
    }
    return `
    <tr>
      <td>${row.period}</td>
      <td>${row.shift}</td>
      <td>${row.type}</td>
      ${diffCellHtml(row.vlc_milk_collection_diff, 'weight', 'vmdiff')}
      ${diffCellHtml(row.vlc_milk_collection_diff, 'fat', 'vmdiff')}
      ${diffCellHtml(row.vlc_milk_collection_diff, 'snf', 'vmdiff')}
      ${diffCellHtml(row.vlc_milk_collection_diff, 'rate', 'vmdiff')}
      ${diffCellHtml(row.vlc_milk_collection_diff, 'amount', 'vmdiff', true)}
      ${diffCellHtml(row.milk_collection_dairy_diff, 'weight', 'mddiff')}
      ${diffCellHtml(row.milk_collection_dairy_diff, 'fat', 'mddiff')}
      ${diffCellHtml(row.milk_collection_dairy_diff, 'snf', 'mddiff')}
      ${diffCellHtml(row.milk_collection_dairy_diff, 'rate', 'mddiff')}
      ${diffCellHtml(row.milk_collection_dairy_diff, 'amount', 'mddiff', true)}
    </tr>`;
  }).join('');

  const diffTableHtml = !includeMilkCollection ? '' : `
      <h3 style="margin: 22px 0 6px; font-size: 13px; color: #111827;">Difference Breakdown — VLC vs Milk Collection &nbsp;|&nbsp; Milk Collection vs Dairy</h3>
      <table>
        <thead>
          <tr class="section-header">
            <th rowspan="2" style="width: 8%;">Period</th>
            <th rowspan="2" style="width: 5%;">Shift</th>
            <th rowspan="2" style="width: 5%;">Type</th>
            <th colspan="5" style="background-color: #fff7ed;">VLC − MILK COLLECTION</th>
            <th colspan="5" style="background-color: #f0fdfa;">MILK COLLECTION − DAIRY</th>
          </tr>
          <tr>
            <th style="background-color: #fff7ed;">Qty</th>
            <th style="background-color: #fff7ed;">Fat</th>
            <th style="background-color: #fff7ed;">SNF</th>
            <th style="background-color: #fff7ed;">Rate</th>
            <th style="background-color: #fff7ed;">Amt</th>
            <th style="background-color: #f0fdfa;">Qty</th>
            <th style="background-color: #f0fdfa;">Fat</th>
            <th style="background-color: #f0fdfa;">SNF</th>
            <th style="background-color: #f0fdfa;">Rate</th>
            <th style="background-color: #f0fdfa;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${diffTableRows}
        </tbody>
      </table>`;

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
        td.vlc { background-color: #f0fdf4; }
        td.dairy { background-color: #eff6ff; }
        td.milk { background-color: #e5e7eb; }
        td.vmdiff { background-color: #fff7ed; }
        td.mddiff { background-color: #f0fdfa; }
        .section-header { background-color: #f3f4f6; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>VLC Difference Report</h1>
        <h2>${branchName}</h2>
      </div>
      <div class="info">
        <div><strong>VLC ID:</strong> ${vlcId}</div>
        <div><strong>Period:</strong> ${formatDate(fromDate)} to ${formatDate(toDate)}</div>
        <div><strong>Shift:</strong> ${shift}</div>
        <div><strong>Date:</strong> ${formatDate(new Date().toISOString())}</div>
      </div>
      <table>
        <thead>
          <tr class="section-header">
            <th rowspan="2" style="width: 8%;">Period</th>
            <th rowspan="2" style="width: 5%;">Shift</th>
            <th rowspan="2" style="width: 5%;">Type</th>
            <th colspan="5" style="background-color: #f0fdf4;">VLC DATA</th>${milkGroupHeader}
            <th colspan="5" style="background-color: #eff6ff;">DAIRY DATA</th>
            <th colspan="5">DIFFERENCE</th>
          </tr>
          <tr>
            <th style="background-color: #f0fdf4;">Qty</th>
            <th style="background-color: #f0fdf4;">Fat</th>
            <th style="background-color: #f0fdf4;">SNF</th>
            <th style="background-color: #f0fdf4;">Rate</th>
            <th style="background-color: #f0fdf4;">Amt</th>${milkSubHeader}
            <th style="background-color: #eff6ff;">Qty</th>
            <th style="background-color: #eff6ff;">Fat</th>
            <th style="background-color: #eff6ff;">SNF</th>
            <th style="background-color: #eff6ff;">Rate</th>
            <th style="background-color: #eff6ff;">Amt</th>
            <th>Qty</th>
            <th>Fat</th>
            <th>SNF</th>
            <th>Rate</th>
            <th>Amt</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      ${diffTableHtml}
    </body>
    </html>
  `;
};

// Consolidated single-table variant: one weighted-average row per type
// (Cow/Buffalo/Both) per VLC, with all six column groups side by side.
export const generateVLCDifferenceConsolidatedHtml = (
  rows: any[],
  vlcId: string,
  fromDate: string,
  toDate: string,
  shift: string,
  branchName: string
): string => {
  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  const diffColor = (v: any) => {
    const n = parseFloat(v);
    if (n < 0) return '#dc2626';
    if (n > 0) return '#16a34a';
    return '#4b5563';
  };

  const num = (v: any) => parseFloat(v || 0).toFixed(2);
  const cell = (cls: string, v: any) => `<td class="${cls}">${num(v)}</td>`;
  const diffCell = (cls: string, v: any, bold = false) =>
    `<td class="${cls}" style="color: ${diffColor(v)};${bold ? ' font-weight: bold;' : ''}">${num(v)}</td>`;

  const totalCols = 31;

  const tableRows = rows.map((row) => {
    if (row.isVlcHeader) {
      return `
    <tr>
      <td colspan="${totalCols}" style="text-align: left; font-weight: bold; background-color: #dbeafe; color: #1e3a8a; padding: 6px 8px; font-size: 10px;">${row.vlcLabel}</td>
    </tr>`;
    }
    const v = row.vlc, m = row.milk_collection, d = row.dairy;
    const df = row.difference, vm = row.vlc_milk_collection_diff, md = row.milk_collection_dairy_diff;
    return `
    <tr>
      <td>${row.type}</td>
      ${cell('vlc', v.total_weight)}${cell('vlc', v.avg_fat)}${cell('vlc', v.avg_snf)}${cell('vlc', v.avg_rate)}${cell('vlc', v.total_amount)}
      ${cell('milk', m.total_weight)}${cell('milk', m.avg_fat)}${cell('milk', m.avg_snf)}${cell('milk', m.avg_rate)}${cell('milk', m.total_amount)}
      ${cell('dairy', d.total_weight)}${cell('dairy', d.avg_fat)}${cell('dairy', d.avg_snf)}${cell('dairy', d.avg_rate)}${cell('dairy', d.total_amount)}
      ${diffCell('diff', df.weight)}${diffCell('diff', df.fat)}${diffCell('diff', df.snf)}${diffCell('diff', df.rate)}${diffCell('diff', df.amount, true)}
      ${diffCell('vmdiff', vm.weight)}${diffCell('vmdiff', vm.fat)}${diffCell('vmdiff', vm.snf)}${diffCell('vmdiff', vm.rate)}${diffCell('vmdiff', vm.amount, true)}
      ${diffCell('mddiff', md.weight)}${diffCell('mddiff', md.fat)}${diffCell('mddiff', md.snf)}${diffCell('mddiff', md.rate)}${diffCell('mddiff', md.amount, true)}
    </tr>`;
  }).join('');

  const subHeads = (bg: string) =>
    `<th style="background-color: ${bg};">Qty</th><th style="background-color: ${bg};">Fat</th><th style="background-color: ${bg};">SNF</th><th style="background-color: ${bg};">Rate</th><th style="background-color: ${bg};">Amt</th>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Noto Sans Devanagari', 'Arial', sans-serif; margin: 0; padding: 14px 12px; color: #1f2937; }
        .header { text-align: center; margin-bottom: 16px; }
        .header h1 { margin: 0; font-size: 22px; color: #111827; }
        .header h2 { margin: 5px 0; font-size: 16px; color: #374151; }
        .info { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 12px; padding: 0 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: auto; }
        th, td { border: 1px solid #9ca3af; text-align: center; vertical-align: middle; white-space: nowrap; }
        th { background-color: #f3f4f6; padding: 5px 4px; font-size: 8px; font-weight: bold; line-height: 1.2; }
        td { padding: 4px 4px; font-size: 8px; line-height: 1.3; }
        td.vlc { background-color: #f0fdf4; }
        td.milk { background-color: #e5e7eb; }
        td.dairy { background-color: #eff6ff; }
        td.diff { background-color: #faf5ff; }
        td.vmdiff { background-color: #fff7ed; }
        td.mddiff { background-color: #f0fdfa; }
        .section-header { background-color: #f3f4f6; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>VLC Difference Report</h1>
        <h2>${branchName}</h2>
      </div>
      <div class="info">
        <div><strong>VLC ID:</strong> ${vlcId}</div>
        <div><strong>Period:</strong> ${formatDate(fromDate)} to ${formatDate(toDate)}</div>
        <div><strong>Shift:</strong> ${shift}</div>
        <div><strong>Date:</strong> ${formatDate(new Date().toISOString())}</div>
      </div>
      <table>
        <thead>
          <tr class="section-header">
            <th rowspan="2" style="width: 6%;">Type</th>
            <th colspan="5" style="background-color: #f0fdf4;">VLC DATA</th>
            <th colspan="5" style="background-color: #e5e7eb;">MILK COLLECTION</th>
            <th colspan="5" style="background-color: #eff6ff;">DAIRY DATA</th>
            <th colspan="5" style="background-color: #faf5ff;">DIFFERENCE (VLC − DAIRY)</th>
            <th colspan="5" style="background-color: #fff7ed;">VLC − MILK</th>
            <th colspan="5" style="background-color: #f0fdfa;">MILK − DAIRY</th>
          </tr>
          <tr>
            ${subHeads('#f0fdf4')}
            ${subHeads('#e5e7eb')}
            ${subHeads('#eff6ff')}
            ${subHeads('#faf5ff')}
            ${subHeads('#fff7ed')}
            ${subHeads('#f0fdfa')}
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
