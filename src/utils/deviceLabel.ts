// "Chrome on Windows" from a browser's user-agent string, for the Logged-in Devices list.
// Only the common browsers and systems; anything else reads as a plain browser.

export type DeviceKind = "phone" | "tablet" | "computer";

export interface DeviceInfo {
  browser: string;
  os: string;
  kind: DeviceKind;
}

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/Linux/, "Linux"],
];

export const describeDevice = (userAgent: string | null | undefined): DeviceInfo => {
  const ua = userAgent || "";
  const browser = BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] || "";
  const os = SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] || "";
  const kind: DeviceKind =
    /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))
      ? "tablet"
      : /Mobi|iPhone|iPod/.test(ua)
        ? "phone"
        : "computer";
  return { browser, os, kind };
};
