import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle, Mail, ShieldCheck, User } from "lucide-react";
import { GoogleIcon, type GoogleUser } from "./GoogleSignInModal";
import { V2VWatermarkBadge } from "./V2VWatermarkBadge";
import { solarHarvestApi } from "../lib/solarharvestApi";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with";
              width?: number | string;
              shape?: "rectangular" | "pill";
            }
          ) => void;
        };
      };
    };
  }
}

interface ClientLoginPageProps {
  onSignInSuccess: (user: GoogleUser) => void;
  onAdminLoginClick: () => void;
}

export function ClientLoginPage({ onSignInSuccess, onAdminLoginClick }: ClientLoginPageProps) {
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>(
    () => (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || ""
  );
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    solarHarvestApi
      .getAuthConfig()
      .then((cfg) => {
        if (cfg?.googleClientId) {
          setGoogleClientId(cfg.googleClientId);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return false;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) return;
          setSubmitting(true);
          setError("");
          try {
            const verified = await solarHarvestApi.verifyGoogleCredential(response.credential);
            const user: GoogleUser = {
              name: verified.name,
              email: verified.email,
              phone: verified.phone || "",
              avatar: verified.avatar || "",
            };
            localStorage.setItem("v2v_gmail_user", JSON.stringify(user));
            localStorage.setItem("solarharvest_client_user", JSON.stringify(user));
            onSignInSuccess(user);
          } catch (err: any) {
            setError(err?.message || "Google Sign-In failed. Please try again.");
          } finally {
            setSubmitting(false);
          }
        },
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 360,
      });
      return true;
    };

    if (!initGoogle()) {
      const timer = setInterval(() => {
        if (initGoogle()) clearInterval(timer);
      }, 250);
      return () => clearInterval(timer);
    }
  }, [googleClientId, onSignInSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = nameInput.trim();
    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPhone = phoneInput.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid Gmail / email address.");
      return;
    }

    setSubmitting(true);
    const user: GoogleUser = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      avatar: "",
    };

    solarHarvestApi
      .saveClientLogin({
        email: trimmedEmail,
        name: trimmedName,
        phone: trimmedPhone,
      })
      .catch(() => {})
      .finally(() => {
        localStorage.setItem("v2v_gmail_user", JSON.stringify(user));
        localStorage.setItem("solarharvest_client_user", JSON.stringify(user));
        setSubmitting(false);
        onSignInSuccess(user);
      });
  };

  return (
    <div
      className="relative flex min-h-screen flex-col justify-between overflow-x-hidden"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Full-screen looping background video */}
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
      {/* Subtle dark gradient overlay so text and card pop cleanly over the video */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#07110C]/55 via-[#07110C]/35 to-[#07110C]/70" />
      <V2VWatermarkBadge />

      {/* Top Bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <div className="inline-flex items-center gap-3 rounded-xl border border-white/20 bg-[#0B1611]/80 px-4 py-2 text-white shadow-lg backdrop-blur-xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 p-1 shadow-xs">
            <img
              src="/v2v-logo.png"
              alt="V2V Tech"
              className="h-full w-full object-contain"
            />
          </span>
          <div>
            <span
              className="block text-base font-bold tracking-tight text-white"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              V2V Tech
            </span>
            <span className="block text-[10px] font-medium text-emerald-300/90">
              Vision To Value Technologies
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdminLoginClick}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-violet-400/40 bg-[#0B1611]/80 px-4 py-2 text-sm font-semibold text-violet-100 shadow-lg backdrop-blur-xl transition-all hover:border-violet-300 hover:bg-violet-600/30 hover:shadow-[0_0_20px_rgba(124,58,237,0.45)]"
        >
          <ShieldCheck className="h-4 w-4 text-violet-300" />
          Admin Login
        </button>
      </header>

      {/* Center Login Card */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-white/25 bg-white/95 shadow-2xl backdrop-blur-xl lg:grid-cols-12">
          {/* Left Info Panel */}
          <div className="flex flex-col justify-between bg-gradient-to-br from-[#132219] via-[#173324] to-[#15663E] p-8 text-white lg:col-span-5 sm:p-10">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[#86EFAC]">
                Solar-Powered Smart Irrigation
              </span>
              <h1
                className="mt-5 text-3xl font-bold leading-tight tracking-tight"
                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              >
                V2V Tech Client Portal
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                Sign in with your Gmail account to access the V2V Tech portal, request your field consultation slot, track live admin approval, and complete your ₹1,500 booking.
              </p>
            </div>

            <div className="mt-8 space-y-3 border-t border-white/15 pt-6 text-xs text-white/85">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#86EFAC]" />
                <span>Unique Gmail login saved automatically</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#86EFAC]" />
                <span>Real-time admin approval &amp; ₹1,500 payment tracking</span>
              </div>
            </div>
          </div>

          {/* Right Sign-In Form */}
          <div className="p-8 lg:col-span-7 sm:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#DDE3D8] bg-[#F7F8F5] shadow-xs">
                <GoogleIcon className="h-6 w-6" />
              </div>
              <div>
                <h2
                  className="text-2xl font-bold text-[#132219]"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Client Sign In
                </h2>
                <p className="text-xs text-[#596D60]">
                  Sign in to open the V2V Tech client page
                </p>
              </div>
            </div>

            {googleClientId && (
              <div className="mt-5 rounded-xl border border-[#DDE3D8] bg-[#F7F8F5] p-3.5">
                <p className="mb-2.5 text-center text-xs font-semibold text-[#2A3B31]">
                  One-Click Real Google Sign-In
                </p>
                <div ref={googleBtnRef} className="flex justify-center" />
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[#596D60]">
                  <span className="h-px flex-1 bg-[#DDE3D8]" />
                  <span>or enter Gmail manually below</span>
                  <span className="h-px flex-1 bg-[#DDE3D8]" />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="login-name"
                  className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                >
                  Full Name *
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A998F]" />
                  <input
                    id="login-name"
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#C9D3C3] bg-white pl-10 pr-4 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                >
                  Gmail Address *
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A998F]" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#C9D3C3] bg-white pl-10 pr-4 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-phone"
                  className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                >
                  Phone Number (Optional)
                </label>
                <input
                  id="login-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#C9D3C3] bg-white px-4 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#10B981] px-6 py-3 text-base font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.45)] transition-all hover:shadow-[0_0_32px_rgba(16,185,129,0.55)] disabled:opacity-50"
              >
                <GoogleIcon className="h-5 w-5 rounded-full bg-white p-0.5" />
                {submitting ? "Signing In..." : "Sign In with Gmail & Enter Portal"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-[1200px] px-5 py-4 text-center text-xs text-white/80 sm:px-8">
        © {new Date().getFullYear()} V2V Tech · Vision To Value Technologies
      </footer>
    </div>
  );
}
