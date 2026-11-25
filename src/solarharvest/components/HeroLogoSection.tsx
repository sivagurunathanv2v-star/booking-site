import { ArrowDown, CalendarDays } from "lucide-react";

interface HeroLogoSectionProps {
  onBookSlotClick: () => void;
  onExploreWorkClick: () => void;
}

export function HeroLogoSection({
  onBookSlotClick,
  onExploreWorkClick,
}: HeroLogoSectionProps) {
  return (
    <section id="top" className="relative bg-transparent py-14 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-[#0B1611]/75 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
          <div className="mb-8 flex flex-col items-center">
            <div className="inline-flex items-center justify-center rounded-2xl bg-white/95 px-6 py-4 shadow-xl">
              <img
                src="/v2v-logo.png"
                alt="V2V Tech — Vision To Value Technologies"
                className="max-h-32 w-auto object-contain sm:max-h-40"
              />
            </div>
            <p className="mt-4 inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
              Solar-Powered Smart Irrigation · Fertigation · AI Pest Detection
            </p>
          </div>

          <h1
            className="mx-auto max-w-3xl text-4xl font-bold leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-[3.25rem]"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              textWrap: "balance",
            }}
          >
            Field-Tested Solar Smart Irrigation &amp; AI Pest Detection for Guava Orchards
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
            Integrating clean solar energy with automated drip irrigation, embedded sensor
            interfacing, AI-based pest detection, and Energy Saving Trust Monitoring &amp;
            Evaluation reporting across 1-acre and 3-acre guava deployments.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onBookSlotClick}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#10B981] px-8 py-3.5 text-base font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(16,185,129,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] sm:w-auto whitespace-nowrap shrink-0"
            >
              <CalendarDays className="h-5 w-5" />
              Book a Slot
            </button>
            <button
              type="button"
              onClick={onExploreWorkClick}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:w-auto whitespace-nowrap shrink-0"
            >
              View Our Work
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
