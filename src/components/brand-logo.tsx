const SIZE = {
  hero: "brand-logo brand-hero",
  header: "brand-logo brand-header",
  splash: "brand-logo brand-splash",
} as const;

export function BrandLogo({
  size = "header",
}: {
  tone?: "night" | "day";
  size?: keyof typeof SIZE;
}) {
  return <img src="/hitman-logo.png" alt="Hitman Entertainment" className={SIZE[size]} />;
}