import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 900;

export function useIsMobileViewport(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => window.innerWidth <= breakpoint
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= breakpoint);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobileViewport;
}
