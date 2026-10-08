import { useEffect } from "react";
import { watchSystemTheme } from "@/lib/theme";

export function SystemTheme() {
  useEffect(() => watchSystemTheme(), []);
  return null;
}
