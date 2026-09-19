import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerDevanagariFont } from "@/utils/pdfFonts";

export interface EquipmentPdfDairy {
  username?: string | number | null;
  name?: string | null;
  branchName?: string | null;
}

export interface EquipmentPdfItem {
  equipment_name: string;
  quantity: number | string;
  serial_number?: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Delivery sheet for the equipment handed over to a dairy: dairy details, one
 * row per equipment type and signature lines, so it can be printed and signed
 * at handover. Labels stay in English like the other report PDFs — the
 * embedded font covers Latin and Devanagari only.
 */
export const exportDeliveredEquipmentPdf = async (dairy: EquipmentPdfDairy, items: EquipmentPdfItem[]) => {
  const doc = new jsPDF();
  // Equipment and dairy names are often Marathi, which the default font cannot render.
  const font = await registerDevanagariFont(doc);

  const now = new Date();
  const displayDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  const fileDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dairyLine = [dairy.username, dairy.name].filter(Boolean).join(" - ");

  doc.setFont(font, "normal");
  doc.setFontSize(16);
  doc.text("Delivered Equipment", 14, 15);
  doc.setFontSize(10);
  let y = 22;
  if (dairyLine) {
    doc.text(`Dairy: ${dairyLine}`, 14, y);
    y += 6;
  }
  if (dairy.branchName) {
    doc.text(`Branch: ${dairy.branchName}`, 14, y);
    y += 6;
  }
  doc.text(`Date: ${displayDate}`, 14, y);

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const body = items.map((item, index) => [
    String(index + 1),
    item.equipment_name,
    String(item.quantity),
    item.serial_number || "-",
  ]);
  body.push(["", "Total", String(totalQuantity), ""]);

  autoTable(doc, {
    startY: y + 6,
    head: [["Sr. No.", "Equipment", "Qty", "Serial No."]],
    body,
    theme: "grid",
    styles: { font },
    headStyles: { font, fillColor: [66, 139, 202] },
    columnStyles: {
      0: { halign: "center", cellWidth: 18 },
      2: { halign: "right", cellWidth: 22 },
    },
    // The embedded font has no real bold weight, so shade the total row as well.
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });

  // Signature lines under the table — on a fresh page if they would not fit.
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  let signY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 30;
  if (signY > pageHeight - 20) {
    doc.addPage();
    signY = 40;
  }
  doc.setFontSize(10);
  doc.line(14, signY, 84, signY);
  doc.line(pageWidth - 84, signY, pageWidth - 14, signY);
  doc.text("Delivered by", 14, signY + 6);
  doc.text("Received by (Dairy)", pageWidth - 84, signY + 6);

  const fileLabel = String(dairy.username || dairy.name || "dairy").replace(/[^\w-]+/g, "_");
  doc.save(`Delivered_Equipment_${fileLabel}_${fileDate}.pdf`);
};
