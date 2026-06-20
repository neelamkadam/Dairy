
export const generateVLCDifferenceReportHtml = (
  reportData: any[],
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

  const tableRows = reportData.map((row) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb;">${row.period}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb;">${row.shift}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb;">${row.type}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #f0fdf4;">${parseFloat(row.vlc.total_weight).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #f0fdf4;">${parseFloat(row.vlc.avg_fat).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #f0fdf4;">${parseFloat(row.vlc.avg_snf).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #f0fdf4;">${parseFloat(row.vlc.avg_rate || 0).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #f0fdf4;">${parseFloat(row.vlc.total_amount).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #e5e7eb;">${row.milk_collection ? parseFloat(row.milk_collection.total_weight).toFixed(2) : '-'}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #e5e7eb;">${row.milk_collection ? parseFloat(row.milk_collection.avg_fat).toFixed(2) : '-'}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #e5e7eb;">${row.milk_collection ? parseFloat(row.milk_collection.avg_snf).toFixed(2) : '-'}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #e5e7eb;">${row.milk_collection ? parseFloat(row.milk_collection.avg_clr).toFixed(2) : '-'}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #eff6ff;">${parseFloat(row.dairy.total_weight).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #eff6ff;">${parseFloat(row.dairy.avg_fat).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #eff6ff;">${parseFloat(row.dairy.avg_snf).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #eff6ff;">${parseFloat(row.dairy.avg_rate || 0).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; background-color: #eff6ff;">${parseFloat(row.dairy.total_amount).toFixed(2)}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; color: ${parseFloat(row.difference.weight) < 0 ? '#dc2626' : '#16a34a'};">${row.difference.weight}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; color: ${parseFloat(row.difference.fat) < 0 ? '#dc2626' : '#16a34a'};">${row.difference.fat}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; color: ${parseFloat(row.difference.snf) < 0 ? '#dc2626' : '#16a34a'};">${row.difference.snf}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; color: ${parseFloat(row.difference.rate || 0) < 0 ? '#dc2626' : '#16a34a'};">${row.difference.rate}</td>
      <td style="padding: 4px; font-size: 10px; border: 1px solid #e5e7eb; color: ${parseFloat(row.difference.amount) < 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${row.difference.amount}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Noto Sans Devanagari', 'Arial', sans-serif; margin: 0; padding: 20px 40px; color: #1f2937; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; color: #111827; }
        .header h2 { margin: 5px 0; font-size: 18px; color: #374151; }
        .info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
        th { background-color: #f9fafb; padding: 6px 4px; font-size: 8px; font-weight: bold; border: 1px solid #e5e7eb; text-align: center; }
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
            <th colspan="5" style="background-color: #f0fdf4;">VLC DATA</th>
            <th colspan="4" style="background-color: #e5e7eb;">MILK COLLECTION</th>
            <th colspan="5" style="background-color: #eff6ff;">DAIRY DATA</th>
            <th colspan="5">DIFFERENCE</th>
          </tr>
          <tr>
            <th style="background-color: #f0fdf4;">Qty</th>
            <th style="background-color: #f0fdf4;">Fat</th>
            <th style="background-color: #f0fdf4;">SNF</th>
            <th style="background-color: #f0fdf4;">Rate</th>
            <th style="background-color: #f0fdf4;">Amt</th>
            <th style="background-color: #e5e7eb;">Qty</th>
            <th style="background-color: #e5e7eb;">Fat</th>
            <th style="background-color: #e5e7eb;">SNF</th>
            <th style="background-color: #e5e7eb;">CLR</th>
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
