export function V2VWatermarkBadge() {
  return (
    <div
      aria-label="V2V Tech Smart AgriTech"
      className="pointer-events-none fixed bottom-2.5 right-2.5 z-30 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-[#07110C]/95 px-3.5 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.65)] backdrop-blur-xl"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 p-1 shadow-xs">
        <img
          src="/v2v-logo.png"
          alt="V2V Tech"
          className="h-full w-full object-contain"
        />
      </span>
      <div className="leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span
            className="text-xs font-bold tracking-tight text-white"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            V2V Tech
          </span>
        </div>
        <span className="block text-[9px] font-medium text-emerald-300/85">
          Solar Smart AgriTech
        </span>
      </div>
    </div>
  );
}
