import { useState } from "react";
import { Menu, X, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import { GoogleIcon, type GoogleUser } from "./GoogleSignInModal";

interface HeaderProps {
  logoUrl: string;
  onBookSlotClick: () => void;
  activeView: "client" | "admin";
  onNavigateClient: (sectionId?: string) => void;
  onAdminLoginClick: () => void;
  user: GoogleUser | null;
  onOpenSignIn: () => void;
  onSignOut: () => void;
}

export function Header({
  logoUrl,
  onBookSlotClick,
  activeView,
  onNavigateClient,
  onAdminLoginClick,
  user,
  onOpenSignIn,
  onSignOut,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileOpen(false);
    onNavigateClient(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 bg-[#0B1611]/85 backdrop-blur-xl shadow-lg">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        {/* Zone 1: V2V Logo in Top-Left Corner + Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateClient("top");
          }}
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] rounded-lg"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 p-1 shadow-sm">
            <img
              src="/v2v-logo.png"
              alt="V2V Tech"
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          </span>
          <span>V2V Tech</span>
        </a>

        {/* Zone 2: 4 Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-1 text-sm font-medium text-white/80"
        >
          <a
            href="#our-work"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("our-work");
            }}
            className="whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-white/10 hover:text-white"
          >
            Our Work
          </a>
          <a
            href="#booking-slot"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("booking-slot");
            }}
            className="whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-white/10 hover:text-white"
          >
            Book Slot
          </a>
          <a
            href="#brains-behind-mission"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("brains-behind-mission");
            }}
            className="whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-white/10 hover:text-white"
          >
            Our Team
          </a>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("contact");
            }}
            className="whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 transition-all duration-150 hover:bg-white/10 hover:text-white"
          >
            Contact
          </a>
        </nav>

        {/* Zone 3: Gmail User Auth + Admin Login + Primary CTA */}
        <div className="flex items-center gap-1.5 shrink-0">
          {user ? (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] backdrop-blur-md">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#10B981] font-bold text-white uppercase text-[10px] shadow-sm">
                  {user.name.charAt(0) || "U"}
                </div>
              )}
              <div className="text-left leading-tight">
                <p className="font-semibold text-white max-w-[92px] truncate text-[11px]">{user.name}</p>
                <p className="text-[9px] text-emerald-200/80 max-w-[92px] truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title="Sign out"
                className="ml-0.5 rounded p-0.5 text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <GoogleIcon className="h-3.5 w-3.5 rounded-full bg-white p-0.5" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onAdminLoginClick();
            }}
            className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-100 backdrop-blur-md transition-all duration-150 hover:bg-violet-500/30 hover:border-violet-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-violet-300" />
            Admin Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              if (activeView === "admin") {
                onNavigateClient("booking-slot");
              } else {
                onBookSlotClick();
              }
            }}
            className="inline-flex min-h-[32px] items-center justify-center rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#10B981] px-3 py-1 text-xs font-bold text-white shadow-[0_0_14px_rgba(124,58,237,0.4)] transition-all duration-150 hover:shadow-[0_0_22px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] whitespace-nowrap shrink-0"
          >
            {activeView === "admin" ? "Client View" : "Book a Slot"}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="border-t border-white/15 bg-[#0B1611]/90 px-5 py-4 backdrop-blur-xl md:hidden"
        >
          {user ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-white/20 bg-white/10 p-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#10B981] font-bold text-white uppercase text-xs">
                  {user.name.charAt(0) || "U"}
                </div>
                <div className="text-left leading-tight">
                  <p className="font-semibold text-white">{user.name}</p>
                  <p className="text-[11px] text-emerald-200/80">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  setMobileOpen(false);
                }}
                className="text-xs font-semibold text-red-300 hover:text-red-200 hover:underline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOpenSignIn();
                setMobileOpen(false);
              }}
              className="mb-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md hover:border-violet-400/50 hover:bg-white/20"
            >
              <GoogleIcon className="h-4 w-4 rounded-full bg-white p-0.5" />
              Sign In with Gmail
            </button>
          )}

          <div className="flex flex-col gap-1 text-sm font-medium text-white/85">
            <button
              type="button"
              onClick={() => handleNavClick("our-work")}
              className="min-h-[44px] rounded-md px-3 text-left hover:bg-white/10 hover:text-white"
            >
              Our Work
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("booking-slot")}
              className="min-h-[44px] rounded-md px-3 text-left hover:bg-white/10 hover:text-white"
            >
              Book Slot
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("brains-behind-mission")}
              className="min-h-[44px] rounded-md px-3 text-left hover:bg-white/10 hover:text-white"
            >
              Our Team
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("contact")}
              className="min-h-[44px] rounded-md px-3 text-left hover:bg-white/10 hover:text-white"
            >
              Contact
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
