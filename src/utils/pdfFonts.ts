import type jsPDF from "jspdf";

/**
 * jsPDF's built-in Helvetica is Latin-1 only, so Devanagari text (Marathi stock
 * and farmer names) comes out as mojibake. Embedding Noto Sans Devanagari fixes
 * it; if the file cannot be loaded we fall back to Helvetica rather than failing
 * the export outright.
 */

const FONT_URL = "/fonts/NotoSansDevanagari-Regular.ttf";
const FONT_FILE = "NotoSansDevanagari-Regular.ttf";
const FONT_NAME = "NotoSansDevanagari";
const FALLBACK_FONT = "helvetica";

// The encoded font is ~300KB once base64'd, so decode it once per session.
let cachedBase64: string | null = null;

const fetchFontBase64 = async (): Promise<string | null> => {
  if (cachedBase64) return cachedBase64;

  const response = await fetch(FONT_URL);
  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  cachedBase64 = btoa(
    new Uint8Array(buffer).reduce((acc, byte) => acc + String.fromCharCode(byte), "")
  );
  return cachedBase64;
};

/**
 * Embeds the Devanagari font into `doc` and returns the font name to use.
 * Returns "helvetica" when the font is unavailable.
 */
export const registerDevanagariFont = async (doc: jsPDF): Promise<string> => {
  try {
    const base64 = await fetchFontBase64();
    if (!base64) return FALLBACK_FONT;

    doc.addFileToVFS(FONT_FILE, base64);
    doc.addFont(FONT_FILE, FONT_NAME, "normal");
    // Only a regular weight ships. Registering it as "bold" too keeps bold cells
    // (subtotal rows carry the stock name) on a Devanagari-capable font instead
    // of silently falling back to Latin-only Helvetica.
    doc.addFont(FONT_FILE, FONT_NAME, "bold");

    return FONT_NAME;
  } catch {
    return FALLBACK_FONT;
  }
};
