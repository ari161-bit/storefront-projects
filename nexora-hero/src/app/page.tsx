import NexoraHero from "@/components/nexora/NexoraHero";

const FEATURES = [
  {
    index: "01",
    title: "UNIFIED INBOX",
    description: "Instagram + WhatsApp conversations in one place.",
  },
  {
    index: "02",
    title: "AI CRM",
    description: "Conversations become organized customers and leads.",
  },
  {
    index: "03",
    title: "FOLLOW-UPS",
    description: "Never let a promising conversation disappear.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[var(--nexora-deep-teal)]">
      <section className="relative min-h-screen w-full overflow-hidden">
        <NexoraHero />

        {/* Left-side copy — deliberately quiet so the network reads clearly on the right,
            and the 3D scene must never overlap this column. The wrapper spans the full
            width so the copy can be centered vertically, but it must not intercept clicks/
            hover meant for the canvas on the right — only the actual copy column does. */}
        <div className="pointer-events-none relative z-10 flex min-h-screen w-full items-center">
          <div className="pointer-events-auto w-full max-w-xl px-8 py-24 sm:px-14 lg:px-20">
            <div className="mb-14 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--nexora-coral)] text-xs font-bold text-[var(--nexora-deep-teal)]">
                N
              </span>
              <span className="text-sm font-semibold tracking-[0.15em] text-[var(--nexora-ivory)]">
                NEXORA
              </span>
            </div>

            <div className="mb-6 flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--nexora-mint)]" />
              <span className="text-xs font-medium tracking-[0.2em] text-[var(--nexora-mint)] uppercase">
                Your conversations, finally connected
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-[2.6rem] leading-[1.08] font-medium tracking-tight text-[var(--nexora-ivory)] sm:text-6xl">
              Every conversation.
              <br />
              One intelligent workspace.
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--nexora-muted)] sm:text-lg">
              NEXORA brings Instagram, WhatsApp, AI, CRM and follow-ups into one intelligent
              workspace so businesses can turn conversations into customers.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button className="rounded-full bg-[var(--nexora-coral)] px-7 py-3 text-sm font-semibold text-[var(--nexora-deep-teal)] transition-transform hover:scale-[1.03]">
                Start free ↗
              </button>
              <button className="rounded-full border border-[var(--nexora-ivory)]/25 px-7 py-3 text-sm font-medium text-[var(--nexora-ivory)] transition-colors hover:border-[var(--nexora-ivory)]/60">
                See how it works
              </button>
            </div>

            <p className="mt-14 text-xs tracking-wide text-[var(--nexora-muted)]">
              Built for businesses that live in the DMs.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-[var(--nexora-ivory)]/10 bg-[var(--nexora-dark-surface)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-8 py-16 sm:grid-cols-3 sm:px-14 lg:px-20">
          {FEATURES.map((f) => (
            <div key={f.index} className="flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-[0.2em] text-[var(--nexora-coral)]">
                {f.index}
              </span>
              <h3 className="text-sm font-semibold tracking-[0.12em] text-[var(--nexora-ivory)]">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--nexora-muted)]">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
