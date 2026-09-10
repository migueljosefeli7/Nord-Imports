import Image from "next/image";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-logo ${className}`}>
      <Image src="/logo-nord.png" alt="Nord Imports" width={887} height={558} priority />
    </span>
  );
}
