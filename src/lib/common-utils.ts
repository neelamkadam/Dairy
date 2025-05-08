import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Set User detail in Local Storage
export const setUserDetailsInLocalStorage = (data: {}) => {
  const mapData = new Map<string, string>(Object.entries(data));
  mapData.forEach((value, key) => {
    if (value) {
      localStorage.setItem(key, value);
    }
  });
};

// Get Token from Local Storage
export const getTokenFromLocalStorage = () => {
  return localStorage.getItem("token");
};

// Get All User Details From Local Storage
export const getUserDetailFromLocalStorage = (key: string) => {
  return localStorage.getItem(key);
};

// Clear Local Storage
export const clearLocalStorage = () => {
  localStorage.clear();
};

export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return "";
  return str
    .split("-") // Split the string by hyphens
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(" ");
};

export function removeTrailingSlash(url: string) {
  // Check if the last character is a slash
  if (url.endsWith("/")) {
    // Remove the trailing slash
    return url.slice(0, -1);
  }
  // If no trailing slash, return the original URL
  return url;
}
