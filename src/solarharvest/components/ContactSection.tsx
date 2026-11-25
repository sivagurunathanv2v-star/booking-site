import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import { EXTRACTED_CONTACT_DATA } from "../data/extractedV2VData";
import { solarHarvestApi } from "../lib/solarharvestApi";

export function ContactSection() {
  const [contactInfo, setContactInfo] = useState(EXTRACTED_CONTACT_DATA);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync only contact details from the previous application's API if updated
  useEffect(() => {
    fetch("/api/homepage-content")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.footer_contact) {
          setContactInfo({
            address: json.data.footer_contact.address || EXTRACTED_CONTACT_DATA.address,
            email: json.data.footer_contact.email || EXTRACTED_CONTACT_DATA.email,
            phone: json.data.footer_contact.phone || EXTRACTED_CONTACT_DATA.phone,
          });
        }
      })
      .catch(() => {
        // Keep extracted default contact info
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      await solarHarvestApi.submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Failed to send message. Please try again.");
    }
  };

  return (
    <section id="contact" className="bg-transparent py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-12 rounded-2xl border border-white/25 bg-white/95 p-8 shadow-2xl backdrop-blur-xl lg:grid-cols-12 lg:items-start sm:p-10">
          {/* Contact Details (Extracted from previous application) */}
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wide text-[#15663E]">Contact</p>
            <h2
              className="mt-2 text-3xl font-semibold tracking-tight text-[#132219] sm:text-4xl"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                textWrap: "balance",
              }}
            >
              Get In Touch
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#4A5D51]">
              Ready to transform your vision into value? Contact us today to discuss your project or
              guava orchard deployment.
            </p>

            <div className="mt-8 space-y-6 border-t border-[#DDE3D8] pt-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DDE3D8] bg-[#FFFFFF] text-[#15663E]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#596D60]">Email</p>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="mt-0.5 block text-base font-medium text-[#132219] transition-colors hover:text-[#15663E]"
                  >
                    {contactInfo.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DDE3D8] bg-[#FFFFFF] text-[#15663E]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#596D60]">Phone</p>
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="mt-0.5 block text-base font-medium text-[#132219] transition-colors hover:text-[#15663E] tabular-nums"
                  >
                    {contactInfo.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#DDE3D8] bg-[#FFFFFF] text-[#15663E]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#596D60]">Location</p>
                  <p className="mt-0.5 text-base font-medium text-[#132219]">
                    {contactInfo.address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-2xl border border-[#DDE3D8] bg-[#FFFFFF] p-7 sm:p-9 lg:col-span-7">
            <h3
              className="text-xl font-semibold text-[#132219]"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Send us a message
            </h3>
            <p className="mt-1 text-sm text-[#4A5D51]">
              Fill out the form below and our team will respond shortly.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="sh-contact-name"
                    className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                  >
                    Your Name *
                  </label>
                  <input
                    id="sh-contact-name"
                    name="name"
                    autoComplete="name"
                    type="text"
                    required
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sh-contact-email"
                    className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                  >
                    Your Email *
                  </label>
                  <input
                    id="sh-contact-email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    required
                    placeholder="Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="sh-contact-message"
                  className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                >
                  Your Message *
                </label>
                <textarea
                  id="sh-contact-message"
                  name="message"
                  rows={5}
                  required
                  placeholder="Tell us about your orchard, land size, or project questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                />
              </div>

              {status === "success" && (
                <div className="flex items-center gap-2 rounded-lg border border-[#B7DFC9] bg-[#F2FBF6] p-3.5 text-sm font-medium text-[#134E30]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Message sent successfully! We will get back to you soon.</span>
                </div>
              )}

              {status === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#6D28D9] disabled:opacity-50"
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
