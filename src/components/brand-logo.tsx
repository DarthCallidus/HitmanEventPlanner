const SIZE = {
  hero: "brand-logo brand-hero",
  header: "brand-logo brand-header",
  splash: "brand-logo brand-splash",
} as const;

export function BrandLogo({
  tone,
  size = "header",
}: {
  tone?: "night" | "day";
  size?: keyof typeof SIZE;
}) {
  const cls = SIZE[size];
  if (tone === "day") {
    return <img src="/hitman-logo-ink.png" alt="Hitman Entertainment" className={cls} />;
  }
  if (tone === "night") {
    return <img src="/hitman-logo.png" alt="Hitman Entertainment" className={cls} />;
  }
  return (
    <span className={`brand-lockup ${cls}`}>
      <img src="/hitman-logo.png" alt="Hitman Entertainment" className="brand-on-night" />
      <img src="/hitman-logo-ink.png" alt="" className="brand-on-day" />
    </span>
  );
}
