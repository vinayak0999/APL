import Link from "next/link";
import Image from "next/image";
import { CricketBall, CricketBat, Stumps, Trophy, Sticker, FieldPattern } from "@/components/CricketArt";

function EntryCard({
  href,
  title,
  desc,
  cta,
  accent,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  cta: string;
  accent: "navy" | "blue" | "ghost";
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="card p-7 flex flex-col gap-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-bold text-navy">{title}</h3>
        <span className="h-11 w-11 shrink-0">{icon}</span>
      </div>
      <p className="text-sm text-muted leading-relaxed flex-1">{desc}</p>
      <span
        className={
          "btn " +
          (accent === "navy" ? "btn-navy" : accent === "blue" ? "btn-primary" : "btn-ghost")
        }
      >
        {cta} →
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* hero */}
      <div className="relative overflow-hidden bg-navy text-white">
        <FieldPattern className="absolute inset-0 text-white/5" />
        {/* floating cricket stickers */}
        <Sticker className="hidden md:grid absolute top-10 right-16 h-20 w-20 rotate-6 p-3">
          <CricketBall className="h-full w-full" />
        </Sticker>
        <Sticker className="hidden md:grid absolute top-40 right-52 h-16 w-16 -rotate-12 p-2.5">
          <Trophy className="h-full w-full" />
        </Sticker>
        <Sticker className="hidden lg:grid absolute bottom-10 right-36 h-16 w-16 rotate-3 p-2.5">
          <Stumps className="h-full w-full" />
        </Sticker>

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <div className="inline-flex overflow-hidden rounded-2xl ring-1 ring-white/20 shadow-2xl">
            <Image src="/apl-logo.png" alt="Autonex Premier League" width={420} height={280} priority className="h-28 w-auto" />
          </div>
          <div className="mt-8 flex items-center gap-3">
            <span className="pill bg-white/15 text-white">🏏 LIVE AUCTION</span>
          </div>
          <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight">
            Premier League Auction
          </h1>
          <p className="mt-3 text-white/70 max-w-xl text-lg">
            Live player bidding, team budgets, and fair squad building — all in one place.
          </p>
        </div>
      </div>

      {/* entries */}
      <div className="relative z-10 mx-auto max-w-6xl px-5 -mt-12 pb-16 w-full">
        <div className="grid gap-5 sm:grid-cols-3">
          <EntryCard
            href="/admin"
            title="Admin Console"
            desc="Set up budgets, upload players, create teams, and run the live auction."
            cta="Open console"
            accent="navy"
            icon={<Stumps className="h-full w-full" />}
          />
          <EntryCard
            href="/team"
            title="Team Captain"
            desc="Enter your team PIN to join the live auction and place your bids."
            cta="Enter with PIN"
            accent="blue"
            icon={<CricketBat className="h-full w-full" />}
          />
          <EntryCard
            href="/live"
            title="Live Board"
            desc="The big-screen view — current lot, bids, and team standings in real time."
            cta="Open board"
            accent="ghost"
            icon={<Trophy className="h-full w-full" />}
          />
        </div>
      </div>

      <footer className="mt-auto border-t py-6 text-center text-xs text-muted">
        Autonex Premier League · Internal auction platform
      </footer>
    </main>
  );
}
