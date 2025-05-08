import { useEffect, useState } from "react";
import { Bounce, ToastOptions } from "react-toastify";

export const TOASTER_CONFIG: ToastOptions = {
  position: "top-right",
  hideProgressBar: false,
  pauseOnHover: true,
  theme: "colored",
  transition: Bounce,
  closeOnClick: true,
  draggable: true,
};

export const BREAKPOINTS = {
  SM: "640px",
  MD: "768px",
  LG: "1024px",
  XL: "1280px",
  "2XL": "1536px",
};

type BreakpointKey = keyof typeof BREAKPOINTS;

export const useBreakpoint = (breakpoint: BreakpointKey): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    // Initialize with the correct value on mount
    return window.matchMedia(`(min-width: ${BREAKPOINTS[breakpoint]})`).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(min-width: ${BREAKPOINTS[breakpoint]})`
    );

    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    // Listen for changes to the media query
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup the listener on unmount
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [breakpoint]);

  return matches;
};
