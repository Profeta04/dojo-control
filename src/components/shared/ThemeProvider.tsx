import { ReactNode } from "react";
import { useDojoTheme } from "@/hooks/useDojoTheme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // This hook applies the dojo theme to CSS variables
  useDojoTheme();

  return <>{children}</>;
}
