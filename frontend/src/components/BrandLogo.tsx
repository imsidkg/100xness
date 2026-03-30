import { cn } from "../lib/utils";

/** Public asset: `frontend/public/logo.svg` */
const LOGO_SRC = "/logo.svg";

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export function BrandLogo({
  className,
  alt = "100xness",
}: BrandLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={cn("h-8 w-auto shrink-0 object-contain object-left", className)}
      width={40}
      height={41}
      decoding="async"
    />
  );
}
