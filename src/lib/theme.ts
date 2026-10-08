let lockedDay = false;

function systemIsLight() {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function paint(light: boolean) {
  document.documentElement.classList.toggle("theme-day", light);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#ffffff" : "#000000");
}

export function applySystemTheme() {
  if (lockedDay) return;
  paint(systemIsLight());
}

export function lockDayTheme() {
  lockedDay = true;
  paint(true);
}

export function unlockDayTheme() {
  lockedDay = false;
  applySystemTheme();
}

export function watchSystemTheme() {
  applySystemTheme();
  const query = window.matchMedia("(prefers-color-scheme: light)");
  const onChange = () => applySystemTheme();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
