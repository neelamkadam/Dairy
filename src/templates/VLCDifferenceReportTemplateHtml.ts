
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
      <td class="milk">${row.milk_collection ? parseFloat(row.milk_collection.avg_clr).toFixed(2) : '-'}</td>`;

  const milkGroupHeader = !includeMilkCollection ? '' : `
            <th colspan="4" style="background-color: #e5e7eb;">MILK COLLECTION</th>`;

  const milkSubHeader = !includeMilkCollection ? '' : `
            <th style="background-color: #e5e7eb;">Qty</th>
            <th style="background-color: #e5e7eb;">Fat</th>
            <th style="background-color: #e5e7eb;">SNF</th>
            <th style="background-color: #e5e7eb;">CLR</th>`;

  const tableRows = reportData.map((row) => `
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
    </tr>
  `).join('');

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
    </body>
    </html>
  `;
};
