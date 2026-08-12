"use client";

import { useEffect, useState } from "react";

export interface PlatformInfo {
  /** True on iPhone/iPod, and on iPad (whose Safari UA reports as desktop Mac, hence the touch-points check). */
  isIOS: boolean;
  /** True when running as an installed home-screen app rather than a browser tab. */
  isStandalone: boolean;
  /** False until the client-side check has run — avoids an SSR/hydration mismatch. */
  ready: boolean;
}

const INITIAL: PlatformInfo = { isIOS: false, isStandalone: false, ready: false };

export function usePlatformInfo(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(INITIAL);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInfo({ isIOS, isStandalone, ready: true });
  }, []);

  return info;
}
