import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { NotoSansDevanagariRegular } from "@/assets/fonts/notoSansDevanagari";

/**
 * pdfMake's `vfs` and `fonts` are module-level singletons shared by every template
 * in the bundle. Registering them from each template independently means whichever
 * module happened to be imported last wins, so this does it once, here, and every
 * pdfMake template imports PDF_FONT from this module.
 *
 * pdfMake's stock Roboto has no Devanagari glyphs, so Marathi and Hindi text came
 * out blank. Noto Sans Devanagari covers Latin, Devanagari and the rupee sign, so
 * it is safe as the document-wide default for mixed English/Marathi vouchers and
 * reports.
 *
 * It does NOT cover Kannada — Kannada text still will not render. Roboto did not
 * render it either, so this is no regression, but a Kannada-capable face has to be
 * added here before `kn` reports can print non-Latin text.
 */

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

pdfMake.vfs["NotoSansDevanagari-Regular.ttf"] = NotoSansDevanagariRegular;

pdfMake.fonts = {
  // Kept so a document can still opt back into Roboto explicitly.
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
  // Only a regular weight ships. Mapping it to all four slots keeps bold and
  // italic runs on a Devanagari-capable face instead of silently falling back
  // to Latin-only Roboto and dropping the glyphs.
  NotoSansDevanagari: {
    normal: "NotoSansDevanagari-Regular.ttf",
    bold: "NotoSansDevanagari-Regular.ttf",
    italics: "NotoSansDevanagari-Regular.ttf",
    bolditalics: "NotoSansDevanagari-Regular.ttf",
  },
};

/** Document-wide default font for pdfMake documents. Latin + Devanagari + ₹. */
export const PDF_FONT = "NotoSansDevanagari";
