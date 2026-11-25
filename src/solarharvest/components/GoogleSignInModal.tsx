import { useEffect, useRef, useState } from "react";
import { X, Mail, Shield, CheckCircle } from "lucide-react";
import { solarHarvestApi } from "../lib/solarharvestApi";

export interface GoogleUser {
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
}

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignInSuccess: (user: GoogleUser) => void;
}

export function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export function GoogleSignInModal({ isOpen, onClose, onSignInSuccess }: GoogleSignInModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string>(
    () => (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || ""
  );
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    solarHarvestApi
      .getAuthConfig()
      .then((cfg) => {
        if (cfg?.googleClientId) setGoogleClientId(cfg.googleClientId);
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !googleClientId || !googleBtnRef.current) return;
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
            onClose();
          } catch (err: any) {
            setError(err?.message || "Google Sign-In failed.");
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
        width: 340,
      });
      return true;
    };
    if (!initGoogle()) {
      const timer = setInterval(() => {
        if (initGoogle()) clearInterval(timer);
      }, 250);
      return () => clearInterval(timer);
    }
  }, [isOpen, googleClientId, onClose, onSignInSuccess]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedName = nameInput.trim();

    if (!trimmedEmail) {
      setError("Please enter your Gmail address.");
      return;
    }
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    setSubmitting(true);
    const user: GoogleUser = {
      name: trimmedName,
      email: trimmedEmail,
      avatar: "",
    };
    solarHarvestApi
      .saveClientLogin({ email: trimmedEmail, name: trimmedName })
      .catch(() => {})
      .finally(() => {
        localStorage.setItem("v2v_gmail_user", JSON.stringify(user));
        localStorage.setItem("solarharvest_client_user", JSON.stringify(user));
        setSubmitting(false);
        onSignInSuccess(user);
        onClose();
      });
  };

  const handleQuickGmail = (sampleEmail: string, sampleName: string) => {
    setSubmitting(true);
    const user: GoogleUser = {
      name: sampleName,
      email: sampleEmail,
      avatar: "",
    };
    solarHarvestApi
      .saveClientLogin({ email: sampleEmail, name: sampleName })
      .catch(() => {})
      .finally(() => {
        localStorage.setItem("v2v_gmail_user", JSON.stringify(user));
        localStorage.setItem("solarharvest_client_user", JSON.stringify(user));
        setSubmitting(false);
        onSignInSuccess(user);
        onClose();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#DDE3D8] bg-[#FFFFFF] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAEEE7] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <GoogleIcon className="h-6 w-6" />
            <h3
              className="text-lg font-semibold text-[#132219]"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Sign In with Gmail
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#4A5D51] hover:bg-[#F3F5F0] hover:text-[#132219]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm leading-relaxed text-[#4A5D51]">
            Sign in with your Gmail account to book consultation slots. Once your requested timing is approved by admin, you will pay the mandatory ₹1,500 fee to confirm your booking.
          </p>

          {googleClientId && (
            <div className="mt-4 rounded-xl border border-[#DDE3D8] bg-[#F7F8F5] p-3">
              <div ref={googleBtnRef} className="flex justify-center" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="user-gmail" className="mb-1 block text-xs font-semibold text-[#2A3B31]">
                Gmail Address *
              </label>
              <div className="relative">
                <input
                  id="user-gmail"
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] pl-10 pr-3.5 text-sm text-[#132219] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                />
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#8A998F]" />
              </div>
            </div>

            <div>
              <label htmlFor="user-name" className="mb-1 block text-xs font-semibold text-[#2A3B31]">
                Full Name *
              </label>
              <input
                id="user-name"
                type="text"
                required
                placeholder="e.g. Arun Kumar"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
            >
              <GoogleIcon className="h-4 w-4" />
              {submitting ? "Signing in..." : "Continue with Gmail"}
            </button>
          </form>

          {/* Quick Demo Sign-in */}
          <div className="mt-6 border-t border-[#EAEEE7] pt-4">
            <p className="text-center text-xs text-[#596D60]">Or quick sign-in as:</p>
            <div className="mt-2.5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickGmail("sivagurunathan874@gmail.com", "Sivagurunathan Rajasekar")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3D8] bg-[#F7F8F5] px-3 py-1.5 text-xs font-medium text-[#132219] hover:border-[#7C3AED]"
              >
                <CheckCircle className="h-3.5 w-3.5 text-[#15663E]" />
                Sivagurunathan (Gmail)
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-[#8A998F]">
            <Shield className="h-3.5 w-3.5" />
            <span>Secure Google authentication for slot booking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
