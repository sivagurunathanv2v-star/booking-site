import { useState } from "react";
import { ArrowRight, Sprout } from "lucide-react";
import { SOLARHARVEST_WORKS, type WorkDeployment } from "../data/extractedV2VData";

interface OurWorkSectionProps {
  onSelectAcreageAndBook: (acreageTier: string) => void;
}

function WorkCard({
  work,
  onSelect,
}: {
  work: WorkDeployment;
  onSelect: (tier: string) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/95 shadow-2xl backdrop-blur-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E7ECE3]">
        {!imgFailed ? (
          <img
            src={work.image}
            alt={work.imageAlt}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#E7EFE9] to-[#F3F5EF] p-6 text-center text-[#15663E]">
            <Sprout className="h-10 w-10" />
            <span className="text-sm font-semibold text-[#132219]">{work.title}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 flex items-baseline justify-between gap-4 text-white">
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {work.acreageLabel} · {work.cropLabel}
          </span>
          <span
            className="text-xs text-white/85 tabular-nums"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Deployment {work.indexLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#596D60]">
          <span>{work.acreageLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{work.cropLabel}</span>
          <span aria-hidden="true">·</span>
          <span>Energy Saving Trust M&amp;E</span>
        </div>

        <h3
          className="mt-3 text-2xl font-semibold tracking-tight text-[#132219]"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {work.indexLabel}. {work.title}
        </h3>

        <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[#3E5045]">
          {work.description}
        </p>

        <div className="mt-6 border-t border-[#EAEEE7] pt-5">
          <p className="text-xs leading-relaxed text-[#596D60]">
            {work.highlights.join("  ·  ")}
          </p>

          <button
            type="button"
            onClick={() => onSelect(work.bookingTier)}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#15663E] to-[#10B981] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15663E] whitespace-nowrap shrink-0"
          >
            Book Field Consultation Slot (₹1,500)
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function OurWorkSection({ onSelectAcreageAndBook }: OurWorkSectionProps) {
  return (
    <section id="our-work" className="bg-transparent py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mb-10 flex flex-col justify-between gap-6 rounded-2xl border border-white/20 bg-[#0B1611]/75 p-6 shadow-xl backdrop-blur-xl md:flex-row md:items-end sm:p-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-emerald-300">
              Our Work · Guava Field Deployments
            </p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                textWrap: "balance",
              }}
            >
              Field-Tested V2V Tech Solar Systems Across 1 Acre &amp; 3 Acre Guava Orchards
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-slate-200">
            Both deployments operate in live guava fields with solar-powered drip fertigation,
            embedded sensors, AI pest detection, and M&amp;E reporting with the Energy Saving Trust.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch">
          {SOLARHARVEST_WORKS.map((work) => (
            <WorkCard key={work.id} work={work} onSelect={onSelectAcreageAndBook} />
          ))}
        </div>
      </div>
    </section>
  );
}
