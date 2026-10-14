import Image from "next/image";
import Link from "next/link";

export default function Header({
  subtitle,
  right,
}: {
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <Image
            src="/apl-logo.png"
            alt="Autonex Premier League"
            width={120}
            height={80}
            priority
            className="h-10 w-auto rounded-md"
          />
          <span className="hidden sm:inline-block h-5 w-px bg-border" />
          <span className="hidden sm:block text-sm font-semibold text-navy truncate">
            {subtitle ?? "Premier League Auction"}
          </span>
        </Link>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}
