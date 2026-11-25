import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { HeroLogoSection } from "./components/HeroLogoSection";
import { OurWorkSection } from "./components/OurWorkSection";
import { BookingSlotSection } from "./components/BookingSlotSection";
import { AdminBookingPanel } from "./components/AdminBookingPanel";
import { BrainsBehindMission } from "./components/BrainsBehindMission";
import { ContactSection } from "./components/ContactSection";
import { GoogleSignInModal, type GoogleUser } from "./components/GoogleSignInModal";
import { ClientLoginPage } from "./components/ClientLoginPage";
import { V2VWatermarkBadge } from "./components/V2VWatermarkBadge";
import { solarHarvestApi } from "./lib/solarharvestApi";

interface SolarHarvestAppProps {
  initialView?: "client" | "admin";
}

export default function SolarHarvestApp({ initialView = "client" }: SolarHarvestAppProps) {
  const [activeView, setActiveView] = useState<"client" | "admin">(initialView);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [bookingPanelOpen, setBookingPanelOpen] = useState<boolean>(true);
  const [selectedAcreageTier, setSelectedAcreageTier] = useState<string>("Field Consultation Slot");
  // Admin Bearer token is kept strictly in React memory (never persisted in localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState<number>(0);

  // Gmail User session
  const [user, setUser] = useState<GoogleUser | null>(() => {
    try {
      const stored = localStorage.getItem("v2v_gmail_user") || localStorage.getItem("solarharvest_client_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [signInModalOpen, setSignInModalOpen] = useState<boolean>(false);

  const handleSignOut = () => {
    localStorage.removeItem("v2v_gmail_user");
    localStorage.removeItem("solarharvest_client_user");
    setUser(null);
  };

  useEffect(() => {
    solarHarvestApi
      .getSettings()
      .then((settings) => {
        if (settings?.logoUrl) {
          setLogoUrl(settings.logoUrl);
        }
      })
      .catch(() => {
        // Fallback to default logo cleanly
      });
  }, []);

  const scrollToSection = (sectionId?: string) => {
    if (!sectionId || sectionId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const target = document.getElementById(sectionId);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const handleNavigateClient = (sectionId?: string) => {
    if (activeView !== "client") {
      setActiveView("client");
      setTimeout(() => scrollToSection(sectionId), 60);
    } else {
      scrollToSection(sectionId);
    }
  };

  const handleBookSlotClick = () => {
    setBookingPanelOpen(true);
    handleNavigateClient("booking-slot");
  };

  const handleSelectAcreageAndBook = (acreageTier: string) => {
    setSelectedAcreageTier(acreageTier);
    setBookingPanelOpen(true);
    handleNavigateClient("booking-slot");
  };

  // Gate the Client Page behind the Front Login Page until the user signs in
  if (!user && activeView !== "admin") {
    return (
      <ClientLoginPage
        onSignInSuccess={(newUser) => {
          setUser(newUser);
          setActiveView("client");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onAdminLoginClick={() => {
          setActiveView("admin");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <div
      className="relative min-h-screen text-[#132219] antialiased selection:bg-[#15663E]/15 selection:text-[#132219]"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Shared full-page video background across Client & Admin pages */}
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/v2v-bg.jpg"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover"
      >
        <source src="/v2v-bg.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#07110C]/45" />
      <V2VWatermarkBadge />

      <div className="relative z-10 flex min-h-screen flex-col">
      <Header
        logoUrl={logoUrl}
        onBookSlotClick={handleBookSlotClick}
        activeView={activeView}
        onNavigateClient={handleNavigateClient}
        onAdminLoginClick={() => setActiveView("admin")}
        user={user}
        onOpenSignIn={() => setSignInModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {activeView === "admin" ? (
        <main>
          <AdminBookingPanel
            standalone
            adminToken={adminToken}
            onAuthChange={setAdminToken}
            logoUrl={logoUrl}
            onLogoChange={setLogoUrl}
            onBackToClient={() => handleNavigateClient("top")}
            onSlotsMutated={() => setRefreshSignal((prev) => prev + 1)}
            refreshSignal={refreshSignal}
          />
        </main>
      ) : (
        <main>
          {/* 1. Website Logo & Hero */}
          <HeroLogoSection
            onBookSlotClick={handleBookSlotClick}
            onExploreWorkClick={() => scrollToSection("our-work")}
          />

          {/* 2. OUR WORK (1 Acre & 3 Acre Guava Field Deployments) */}
          <OurWorkSection onSelectAcreageAndBook={handleSelectAcreageAndBook} />

          {/* 3. Book a Slot Button + Client Slot Request & Post-Approval Payment */}
          <BookingSlotSection
            selectedAcreageTier={selectedAcreageTier}
            onAcreageTierChange={setSelectedAcreageTier}
            bookingPanelOpen={bookingPanelOpen}
            onToggleBookingPanel={setBookingPanelOpen}
            refreshSignal={refreshSignal}
            onBookingCreated={() => setRefreshSignal((prev) => prev + 1)}
            user={user}
            onOpenSignIn={() => setSignInModalOpen(true)}
          />

          {/* 4. Brains Behind the Mission (Extracted from previous application) */}
          <BrainsBehindMission />

          {/* 5. Contact (Extracted from previous application) */}
          <ContactSection />
        </main>
      )}

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-white/15 bg-[#0B1610]/75 py-8 text-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 text-xs sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} V2V Tech · Vision To Value Technologies</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNavigateClient("our-work")}
              className="hover:text-white transition-colors"
            >
              Our Work
            </button>
            <button
              type="button"
              onClick={() => handleNavigateClient("booking-slot")}
              className="hover:text-white transition-colors"
            >
              Book Slot
            </button>
            <button
              type="button"
              onClick={() => handleNavigateClient("contact")}
              className="hover:text-white transition-colors"
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView("admin");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-white transition-colors"
            >
              Admin Login
            </button>
          </div>
        </div>
      </footer>

      <GoogleSignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
        onSignInSuccess={(newUser) => setUser(newUser)}
      />
      </div>
    </div>
  );
}
