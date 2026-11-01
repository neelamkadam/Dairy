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

const MM_PER_PT = 0.3528;
const PX_PER_PT = 4; // about 288 DPI: crisp in print without bloating the PDF

export const hasDevanagari = (text: string) => /[ऀ-ॿ]/.test(text);

let canvasFontReady: Promise<void> | null = null;

const loadCanvasFont = () => {
  if (!canvasFontReady) {
    canvasFontReady = new FontFace(FONT_NAME, `url(${FONT_URL})`)
      .load()
      .then((face) => {
        document.fonts.add(face);
      })
      .catch(() => {
        // The browser's own Devanagari font is used instead
      });
  }
  return canvasFontReady;
};

export interface ShapedTextImage {
  dataUrl: string;
  width: number; // mm
  height: number; // mm
}

/**
 * The embedded font gives jsPDF the right glyphs, but jsPDF writes them in stored
 * order with no Indic shaping, so the vowel sign in "किरण" lands after the next
 * letter ("करिण"). The browser shapes canvas text correctly, so Devanagari that has
 * to be spelled right can be drawn from this image instead.
 */
export const shapedTextImage = async (text: string, fontSizePt: number, color = "#1f2937"): Promise<ShapedTextImage> => {
  await loadCanvasFont();

  const fontPx = fontSizePt * PX_PER_PT;
  const font = `${fontPx}px "${FONT_NAME}", sans-serif`;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width);
  canvas.height = Math.ceil(fontPx * 1.6); // room for vowel signs above and below the line

  // Resizing the canvas resets its drawing state
  context.font = font;
  context.fillStyle = color;
  context.fillText(text, 0, fontPx * 1.15);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: (canvas.width / PX_PER_PT) * MM_PER_PT,
    height: (canvas.height / PX_PER_PT) * MM_PER_PT,
  };
};
