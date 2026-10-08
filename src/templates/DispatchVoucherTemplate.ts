import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";

export interface DispatchVoucherData {
  voucherNo?: string | number;
  date: string;              // yyyy-MM-dd
  time?: string;             // HH:mm or HH:mm:ss
  vlc: string;
  vlcName?: string;
  dairyName?: string;
  driverName: string;
  vehicleNumber: string;
  compartment: string;
  destinationName: string;
  milkType: string;
  weight: number;
  liter: number;
  avgFat: number;
  avgSnf: number;
  acidity: number;
  temperature: number;
  clr?: number;              // Optional CLR value
  ratePerLiter: number;
  commissionPerLiter: number;
  totalAmount: number;
  alteration: boolean;
  /** Every adulterant tested, true = positive (found), false = negative (absent).
   *  All of them are printed, so a clean load carries proof it was tested. */
  adulterants?: Record<string, boolean>;
  seals?: string[];          // Optional seal numbers
  // The tanker purchase / sale vouchers reuse this layout. Left out, each one
  // falls back to the dispatch voucher's wording.
  title?: string;            // default "TANKER DISPATCH VOUCHER"
  subtitle?: string;         // line under the dairy name; default the VLC line
  partyLabel?: string;       // label for destinationName; default "Destination"
  refLabel?: string;         // default "VLC ID"
  refValue?: string;         // default vlc
  fileName?: string;         // default Dispatch_Voucher_<vlc>_<date>[_<voucherNo>].pdf
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return y && m && d ? `${d}-${m}-${y}` : dateStr;
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return "-";
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  if (isNaN(h)) return timeStr;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${mStr || "00"} ${suffix}`;
};

const num = (value: number, decimals = 2) =>
  isNaN(Number(value)) ? "-" : Number(value).toFixed(decimals);

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Amount in words — Indian numbering system
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigitWords = (n: number): string => {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
};

const numberToWords = (n: number): string => {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;

  if (crore) parts.push(`${numberToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigitWords(rest));

  return parts.join(" ");
};

export const amountInWords = (value: number) => {
  const amount = Math.abs(Number(value) || 0);
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const words = `${numberToWords(rupees)} Rupees`;
  return paise ? `${words} and ${twoDigitWords(paise)} Paise Only` : `${words} Only`;
};

const labelCell = (text: string) => ({
  text,
  style: "fieldLabel",
  margin: [8, 4, 4, 4],
});

const valueCell = (text: string) => ({
  text: text || "-",
  style: "fieldValue",
  margin: [0, 3, 8, 3],
});

const boxLayout = {
  hLineWidth: () => 0.8,
  vLineWidth: () => 0.8,
  hLineColor: () => "#cbd5e1",
  vLineColor: () => "#cbd5e1",
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

const gridLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => "#e2e8f0",
  vLineColor: () => "#e2e8f0",
};

const ADULTERANT_ORDER = ["sugar", "salt", "urea", "maltose", "soda", "starch"];

const buildVoucher = (data: DispatchVoucherData, copyLabel: string) => {
  const results = data.adulterants ?? {};
  const testedAdulterants = ADULTERANT_ORDER.filter((a) => a in results).length
    ? ADULTERANT_ORDER.filter((a) => a in results)
    : ADULTERANT_ORDER;

  // Header row of names over a row of POSITIVE/NEGATIVE, so the voucher records
  // the full test panel rather than only what was found.
  const adulterationTable = {
    table: {
      widths: testedAdulterants.map(() => "*"),
      body: [
        testedAdulterants.map((a) => ({
          text: a.charAt(0).toUpperCase() + a.slice(1),
          fontSize: 7,
          bold: true,
          color: "#475569",
          alignment: "center",
          margin: [0, 2, 0, 2],
        })),
        testedAdulterants.map((a) => ({
          text: results[a] ? "POSITIVE" : "NEGATIVE",
          fontSize: 7,
          bold: true,
          color: results[a] ? "#b91c1c" : "#047857",
          alignment: "center",
          margin: [0, 2, 0, 2],
        })),
      ],
    },
    layout: gridLayout,
    margin: [10, 2, 10, 6],
  };

  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              // Header
              {
                columns: [
                  {
                    width: "*",
                    stack: [
                      { text: data.dairyName || "Dairy", style: "dairyName" },
                      {
                        text: data.subtitle ?? (data.vlcName ? `${data.vlcName} (${data.vlc})` : `VLC: ${data.vlc}`),
                        style: "vlcLine",
                      },
                    ],
                  },
                  {
                    width: "auto",
                    stack: [
                      { text: data.title || "TANKER DISPATCH VOUCHER", style: "voucherTitle" },
                      { text: copyLabel, style: "copyLabel" },
                    ],
                  },
                ],
                margin: [10, 8, 10, 8],
              },

              // Meta strip
              {
                table: {
                  widths: ["*", "*", "*"],
                  body: [
                    [
                      { text: `Voucher No: ${data.voucherNo ?? "-"}`, style: "metaCell" },
                      { text: `Date: ${formatDate(data.date)}`, style: "metaCell", alignment: "center" },
                      { text: `Time: ${formatTime(data.time)}`, style: "metaCell", alignment: "right" },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0.5,
                  vLineWidth: () => 0,
                  hLineColor: () => "#cbd5e1",
                  fillColor: () => "#f1f5f9",
                  paddingLeft: () => 10,
                  paddingRight: () => 10,
                  paddingTop: () => 4,
                  paddingBottom: () => 4,
                },
              },

              // Dispatch details
              {
                table: {
                  widths: ["auto", "*", "auto", "*"],
                  body: [
                    [labelCell("Driver Name"), valueCell(data.driverName),
                    labelCell("Vehicle No"), valueCell(data.vehicleNumber)],
                    [labelCell("Compartment"), valueCell(data.compartment),
                    labelCell("Milk Type"), valueCell(data.milkType)],
                    [labelCell(data.partyLabel || "Destination"), valueCell(data.destinationName),
                    labelCell(data.refLabel || "VLC ID"), valueCell(data.refValue ?? data.vlc)],
                    ...(data.seals && data.seals.length > 0
                      ? [[
                          labelCell("Seal Nos"),
                          {
                            text: data.seals.join("  |  "),
                            style: "fieldValue",
                            colSpan: 3,
                            margin: [0, 4, 8, 4],
                          },
                          {}, {},
                        ]]
                      : []),
                  ],
                },
                layout: gridLayout,
              },

              // Quantity & quality
              {
                table: {
                  widths: data.clr != null ? ["*", "*", "*", "*", "*", "*", "*"] : ["*", "*", "*", "*", "*", "*"],
                  body: [
                    [
                      { text: "Weight (Kg)", style: "tableHeader" },
                      { text: "Liter", style: "tableHeader" },
                      { text: "Fat (%)", style: "tableHeader" },
                      { text: "SNF (%)", style: "tableHeader" },
                      { text: "Acidity", style: "tableHeader" },
                      { text: "Temp (°C)", style: "tableHeader" },
                      ...(data.clr != null ? [{ text: "CLR", style: "tableHeader" }] : []),
                    ],
                    [
                      { text: num(data.weight), style: "tableValue" },
                      { text: num(data.liter), style: "tableValue" },
                      { text: num(data.avgFat, 1), style: "tableValue" },
                      { text: num(data.avgSnf, 1), style: "tableValue" },
                      { text: num(data.acidity), style: "tableValue" },
                      { text: num(data.temperature, 1), style: "tableValue" },
                      ...(data.clr != null ? [{ text: num(data.clr, 1), style: "tableValue" }] : []),
                    ],
                  ],
                },
                layout: {
                  ...gridLayout,
                  fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f8fafc" : null),
                },
              },

              // Amounts
              {
                table: {
                  widths: ["*", "*", "*"],
                  body: [
                    [
                      { text: "Rate / Ltr", style: "tableHeader" },
                      { text: "Commission / Ltr", style: "tableHeader" },
                      { text: "Total Amount", style: "tableHeader" },
                    ],
                    [
                      { text: money(data.ratePerLiter), style: "tableValue" },
                      { text: money(data.commissionPerLiter), style: "tableValue" },
                      { text: money(data.totalAmount), style: "totalValue" },
                    ],
                  ],
                },
                layout: {
                  ...gridLayout,
                  fillColor: (rowIndex: number, _node: any, columnIndex: number) => {
                    if (rowIndex === 0) return "#f8fafc";
                    return columnIndex === 2 ? "#ecfdf5" : null;
                  },
                },
              },

              // Words + adulteration
              {
                text: [
                  { text: "Amount in words: ", style: "fieldLabel" },
                  { text: amountInWords(data.totalAmount), style: "wordsValue" },
                ],
                margin: [10, 5, 10, 2],
              },
              {
                text: [
                  { text: "Adulteration: ", style: "fieldLabel" },
                  {
                    text: data.alteration ? "FOUND" : "NOT FOUND",
                    bold: true,
                    fontSize: 8.5,
                    color: data.alteration ? "#b91c1c" : "#047857",
                  },
                ],
                margin: [10, 0, 10, 3],
              },
              adulterationTable,

              // Signatures
              {
                columns: [
                  { text: "Driver's Signature", style: "signature", alignment: "left" },
                  { text: "Incharge Signatory", style: "signature", alignment: "center" },
                  { text: "Authorised Signatory", style: "signature", alignment: "right" },
                ],
                margin: [10, 10, 10, 3],
              },
              {
                text: "This is a computer generated voucher.",
                style: "footNote",
                margin: [10, 0, 10, 6],
              },
            ],
          },
        ],
      ],
    },
    layout: boxLayout,
  };
};

/** Both copies must fit one A4 page, so heights here are deliberately tight.
 *  Exported separately from the download so the page count can be measured. */
export const buildDispatchVoucherDoc = (data: DispatchVoucherData): any => {
  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [26, 18, 26, 18],
    content: [
      buildVoucher(data, "OFFICE COPY"),
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 539,
            y2: 0,
            lineWidth: 0.8,
            lineColor: "#94a3b8",
            dash: { length: 4, space: 3 },
          },
        ],
        margin: [0, 12, 0, 12],
      },
      buildVoucher(data, "DRIVER COPY"),
    ],
    defaultStyle: { fontSize: 9, color: "#1f2937", font: PDF_FONT },
    styles: {
      dairyName: { fontSize: 13, bold: true, color: "#0f172a" },
      vlcLine: { fontSize: 9, color: "#64748b", margin: [0, 2, 0, 0] },
      voucherTitle: { fontSize: 11, bold: true, color: "#1d4ed8", alignment: "right" },
      copyLabel: { fontSize: 8, color: "#64748b", alignment: "right", margin: [0, 3, 0, 0] },
      metaCell: { fontSize: 9, bold: true, color: "#334155" },
      fieldLabel: { fontSize: 8, bold: true, color: "#64748b" },
      fieldValue: { fontSize: 9, bold: true, color: "#0f172a" },
      tableHeader: { fontSize: 8, bold: true, color: "#64748b", alignment: "center", margin: [0, 3, 0, 3] },
      tableValue: { fontSize: 9.5, bold: true, color: "#0f172a", alignment: "center", margin: [0, 3, 0, 3] },
      totalValue: { fontSize: 10.5, bold: true, color: "#047857", alignment: "center", margin: [0, 3, 0, 3] },
      wordsValue: { fontSize: 8, italics: true, color: "#334155" },
      signature: { fontSize: 8, color: "#64748b" },
      footNote: { fontSize: 7, color: "#94a3b8", alignment: "center" },
    },
  };

};

export const generateDispatchVoucherPDF = (data: DispatchVoucherData) => {
  const docDefinition = buildDispatchVoucherDoc(data);

  const fileName = data.fileName || `Dispatch_Voucher_${data.vlc}_${data.date}${
    data.voucherNo ? `_${data.voucherNo}` : ""
  }.pdf`;

  pdfMake.createPdf(docDefinition).download(fileName);
};
