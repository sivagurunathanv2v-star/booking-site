import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
  UserCheck,
  Video,
} from "lucide-react";
import { GoogleIcon, type GoogleUser } from "./GoogleSignInModal";
import {
  solarHarvestApi,
  type BookingConfirmation,
  type BookingRecord,
  type BookingSlot,
} from "../lib/solarharvestApi";

interface BookingSlotSectionProps {
  selectedAcreageTier: string;
  onAcreageTierChange: (tier: string) => void;
  bookingPanelOpen: boolean;
  onToggleBookingPanel: (open: boolean) => void;
  refreshSignal: number;
  onBookingCreated?: () => void;
  user: GoogleUser | null;
  onOpenSignIn: () => void;
}

const FLAT_CONSULTATION_FEE = 1500;

const ACREAGE_OPTIONS = [
  { label: "Field Consultation Slot", fee: 1500 },
];

const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function QRCodePaymentSection({
  payerDetail,
  onPayerDetailChange,
  inputId = "payer-detail",
}: {
  payerDetail: string;
  onPayerDetailChange: (val: string) => void;
  inputId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#B7DFC9] bg-[#F7F8F5] p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="inline-block rounded-full bg-[#EEF7F2] px-3 py-1 text-xs font-bold text-[#15663E]">
            Scan QR to Pay · Indian Overseas Bank (₹1,500)
          </span>

          <div className="overflow-hidden rounded-2xl border-2 border-[#B7DFC9] bg-white p-3 shadow-md">
            <img
              src="/upi-qr.jpg"
              alt="Indian Overseas Bank UPI QR Code - 7598814577@iob"
              className="h-64 w-64 sm:h-72 sm:w-72 rounded-xl object-contain"
            />
          </div>

          <div className="w-full max-w-md space-y-2">
            <p className="text-xs text-[#4A5D51]">
              Scan with GPay, PhonePe, Paytm, or any UPI app to pay <strong>₹1,500</strong>. After payment, enter your UTR / UPI reference below. Our admin will verify your payment and send your meeting link &amp; joining details.
            </p>
            <dl className="grid grid-cols-1 gap-1.5 rounded-xl border border-[#DDE3D8] bg-white p-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[10px] text-[#596D60]">UPI ID</dt>
                <dd className="font-mono font-bold text-[#132219]">7598814577@iob</dd>
              </div>
              <div>
                <dt className="text-[10px] text-[#596D60]">Account Name</dt>
                <dd className="font-semibold text-[#132219]">R SIVAGURUNATHAN</dd>
              </div>
              <div>
                <dt className="text-[10px] text-[#596D60]">Amount</dt>
                <dd className="font-mono font-bold text-[#15663E]">₹1,500</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
        >
          UPI ID or Transaction Reference (UTR) *
        </label>
        <input
          id={inputId}
          type="text"
          required
          value={payerDetail}
          onChange={(e) => onPayerDetailChange(e.target.value)}
          placeholder="e.g. 7598814577@iob or UPI Ref 4029184"
          className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
        />
      </div>
    </div>
  );
}

function normalizeMeetingUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "#";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function MeetingDetailsCard({ booking }: { booking: BookingRecord }) {
  const [copied, setCopied] = useState(false);

  if (!booking.meeting_link) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-bold">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-700" />
          <span>Payment Submitted — Waiting for Admin Verification &amp; Meeting Link</span>
        </div>
        <p className="mt-1 text-amber-800">
          Our admin is verifying your QR payment. Once verified, your meeting link and joining details will appear right here automatically.
        </p>
      </div>
    );
  }

  const safeMeetingUrl = normalizeMeetingUrl(booking.meeting_link);

  return (
    <div className="mt-4 rounded-xl border-2 border-[#7C3AED]/40 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7C3AED]/10 px-2.5 py-1 text-xs font-bold text-[#6D28D9]">
          <Video className="h-3.5 w-3.5" />
          Payment Verified · Meeting Link &amp; Joining Details
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <a
          href={safeMeetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#10B981] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:opacity-95"
        >
          <Video className="h-3.5 w-3.5" />
          Join Meeting Now
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(booking.meeting_link || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#DDE3D8] bg-[#F7F8F5] px-3 py-2 text-xs font-semibold text-[#132219] hover:border-[#7C3AED]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      <p className="mt-2.5 break-all font-mono text-xs text-[#4A5D51]">{booking.meeting_link}</p>

      {booking.joining_details && (
        <div className="mt-3 rounded-lg border border-[#EAEEE7] bg-[#F7F8F5] p-3 text-xs text-[#132219]">
          <p className="font-bold text-[#15663E]">Joining Details:</p>
          <p className="mt-1 whitespace-pre-line text-[#3E5045]">{booking.joining_details}</p>
        </div>
      )}
    </div>
  );
}

const formatReadableDate = (isoDate: string): { weekday: string; dayMonth: string; full: string } => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);
  return {
    weekday: dateObj.toLocaleDateString("en-IN", { weekday: "short" }),
    dayMonth: dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    full: dateObj.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
};

const getStatusSummary = (status: BookingRecord["status"]) => {
  switch (status) {
    case "pending_approval":
      return {
        label: "Waiting for Admin Timing Approval",
        tone: "text-[#B45309]",
      };
    case "approved_awaiting_payment":
      return {
        label: "Timing Approved — Payment Required to Book Slot",
        tone: "text-[#15663E]",
      };
    case "confirmed":
      return {
        label: "Paid & Slot Officially Booked",
        tone: "text-[#15663E]",
      };
    case "completed":
      return {
        label: "Session Completed",
        tone: "text-[#1D4ED8]",
      };
    case "rejected":
      return {
        label: "Timing Declined — Please Pick Another Slot",
        tone: "text-[#B91C1C]",
      };
    default:
      return {
        label: "Cancelled",
        tone: "text-[#64748B]",
      };
  }
};

export function BookingSlotSection({
  selectedAcreageTier,
  onAcreageTierChange,
  bookingPanelOpen,
  onToggleBookingPanel,
  refreshSignal,
  onBookingCreated,
  user,
  onOpenSignIn,
}: BookingSlotSectionProps) {
  const [activeTab, setActiveTab] = useState<"book" | "lookup">("book");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const [clientName, setClientName] = useState(user?.name || "");
  const [clientEmail, setClientEmail] = useState(user?.email || "");
  const [clientPhone, setClientPhone] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // User Bookings state for signed-in Gmail user
  const [userBookings, setUserBookings] = useState<BookingRecord[]>([]);
  const [loadingUserBookings, setLoadingUserBookings] = useState(false);

  // Lookup & Payment state
  const [lookupRef, setLookupRef] = useState("");
  const [lookupEmail, setLookupEmail] = useState(user?.email || "");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<BookingRecord | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "Card" | "Net Banking">("UPI");
  const [payerDetail, setPayerDetail] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState("");

  const loadUserBookings = async (email: string) => {
    if (!email) return;
    setLoadingUserBookings(true);
    try {
      const records = await solarHarvestApi.getUserBookings(email);
      setUserBookings(records);
    } catch {
      // ignore
    } finally {
      setLoadingUserBookings(false);
    }
  };

  useEffect(() => {
    if (user) {
      setClientName(user.name);
      setClientEmail(user.email);
      setLookupEmail(user.email);
      loadUserBookings(user.email);
    } else {
      setClientName("");
      setClientEmail("");
      setUserBookings([]);
    }
  }, [user, refreshSignal]);

  // Real-time polling: Every 2.5 seconds, check for admin approvals on the client's bookings
  useEffect(() => {
    const currentEmail = user?.email;
    if (!currentEmail) return;

    loadUserBookings(currentEmail);
    const interval = setInterval(() => {
      loadUserBookings(currentEmail);
    }, 2500);

    return () => clearInterval(interval);
  }, [user?.email, refreshSignal]);

  const approvedBooking = useMemo(
    () => userBookings.find((b) => b.status === "approved_awaiting_payment"),
    [userBookings]
  );

  const pendingBooking = useMemo(
    () => userBookings.find((b) => b.status === "pending_approval"),
    [userBookings]
  );

  const confirmedBookings = useMemo(
    () => userBookings.filter((b) => b.status === "confirmed"),
    [userBookings]
  );

  const loadSlots = async () => {
    setLoadingSlots(true);
    setSlotsError("");
    try {
      const data = await solarHarvestApi.getPublicSlots();
      setSlots(data);
      const uniqueDates = Array.from(new Set(data.map((s) => s.slot_date)));
      if (uniqueDates.length > 0) {
        setSelectedDate((prev) => (prev && uniqueDates.includes(prev) ? prev : uniqueDates[0]));
      }
    } catch (err: any) {
      setSlotsError(err?.message || "Unable to load available booking slots.");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [refreshSignal]);

  // If user is currently viewing a booking in lookup tab and admin approves it in the same page, refresh it automatically
  useEffect(() => {
    if (lookupResult && lookupRef && lookupEmail) {
      solarHarvestApi
        .lookupBooking(lookupRef, lookupEmail)
        .then((fresh) => setLookupResult(fresh))
        .catch(() => {});
    }
  }, [refreshSignal]);

  const datesSummary = useMemo(() => {
    const map = new Map<string, { total: number; open: number }>();
    for (const s of slots) {
      const entry = map.get(s.slot_date) || { total: 0, open: 0 };
      entry.total += 1;
      if (s.status === "open") entry.open += 1;
      map.set(s.slot_date, entry);
    }
    return Array.from(map.entries()).map(([date, counts]) => ({
      date,
      ...counts,
      formatted: formatReadableDate(date),
    }));
  }, [slots]);

  const slotsForSelectedDate = useMemo(
    () => slots.filter((s) => s.slot_date === selectedDate),
    [slots, selectedDate]
  );

  const selectedSlotObj = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) || null,
    [slots, selectedSlotId]
  );

  const totalOpenSlots = useMemo(
    () => slots.filter((s) => s.status === "open").length,
    [slots]
  );

  const selectedTierInfo = useMemo(
    () => ACREAGE_OPTIONS.find((o) => o.label === selectedAcreageTier) || ACREAGE_OPTIONS[0],
    [selectedAcreageTier]
  );

  const fetchLookup = async (ref: string, email: string) => {
    setLookupLoading(true);
    setLookupError("");
    setPaymentError("");
    setPaymentSuccessMsg("");
    try {
      const record = await solarHarvestApi.lookupBooking(ref, email);
      setLookupResult(record);
    } catch (err: any) {
      setLookupResult(null);
      setLookupError(err?.message || "Booking not found.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setSubmitError("Please choose an available date and time slot first.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await solarHarvestApi.createBooking({
        slotId: selectedSlotId,
        clientName,
        clientEmail,
        clientPhone,
        acreageTier: selectedAcreageTier,
        farmLocation,
        notes,
      });
      setConfirmation(result);
      setLookupRef(result.referenceCode);
      setLookupEmail(result.clientEmail);
      setSelectedSlotId(null);
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setFarmLocation("");
      setNotes("");
      await loadSlots();
      onBookingCreated?.();
    } catch (err: any) {
      setSubmitError(err?.message || "Could not submit your slot request. Please try again.");
      await loadSlots();
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchLookup(lookupRef, lookupEmail);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupResult) return;

    setPaying(true);
    setPaymentError("");
    setPaymentSuccessMsg("");
    try {
      const paidRecord = await solarHarvestApi.payForApprovedBooking({
        referenceCode: lookupResult.reference_code,
        email: lookupResult.client_email,
        paymentMethod,
        payerDetail,
      });
      setLookupResult(paidRecord);
      setPayerDetail("");
      setPaymentSuccessMsg("Payment received! Your slot is now officially booked.");
      if (user?.email) {
        await loadUserBookings(user.email);
      }
      onBookingCreated?.();
    } catch (err: any) {
      setPaymentError(err?.message || "Payment failed. Please verify details and try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <section id="booking-slot" className="bg-transparent py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="rounded-2xl border border-white/25 bg-white/95 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Header CTA Banner (Client-focused — Admin Login is at the bottom of the page) */}
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-[#15663E]">
                Client Slot Booking · 3-Step Approval &amp; Payment Flow
              </p>
              <h2
                className="mt-2 text-3xl font-semibold tracking-tight text-[#132219] sm:text-4xl"
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  textWrap: "balance",
                }}
              >
                Book Your V2V Tech Field Consultation Slot
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#4A5D51]">
                Select your preferred date and time slot first. Once our admin approves that your
                requested timing is available, you will be prompted to complete payment to finalize
                your slot booking. Flat fee of ₹1,500 applies for all field consultations.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#596D60] tabular-nums">
                <span>1. Request Slot Timing</span>
                <span aria-hidden="true">·</span>
                <span>2. Admin Approves Timing</span>
                <span aria-hidden="true">·</span>
                <span>3. Pay &amp; Confirm Booking</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#15663E]">{totalOpenSlots} open slots available</span>
              </div>
            </div>

            <div className="flex shrink-0">
              <button
                type="button"
                onClick={() => onToggleBookingPanel(!bookingPanelOpen)}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#10B981] px-7 py-3 text-base font-bold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] whitespace-nowrap shrink-0"
              >
                <CalendarDays className="h-4 w-4" />
                {bookingPanelOpen ? "Hide Booking Panel" : "Book a Slot"}
              </button>
            </div>
          </div>

          {/* Interactive Client Booking & Payment Panel */}
          {bookingPanelOpen && (
            <div className="mt-10 border-t border-[#EAEEE7] pt-8">
              {/* 1. If signed-in client has an Approved Booking waiting for payment, show it prominently! */}
              {user && approvedBooking && (
                <div className="mb-8 overflow-hidden rounded-2xl border-2 border-[#15663E] bg-[#F2FBF6] shadow-md">
                  <div className="bg-[#15663E] px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-[#86EFAC]" />
                      <span className="text-sm font-bold uppercase tracking-wider">
                        Admin Approved · Pay ₹1,500 to Confirm Slot
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white/20 px-3 py-1 rounded">
                      Ref: {approvedBooking.reference_code}
                    </span>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                      <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#B7DFC9] pb-6 lg:pb-0 lg:pr-8">
                        <span className="inline-block rounded-md bg-[#D1EADC] px-2.5 py-1 text-xs font-bold text-[#15663E]">
                          Timing Approved by Admin
                        </span>
                        <h4
                          className="mt-2.5 text-2xl font-bold text-[#132219]"
                          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                        >
                          Complete Payment (₹1,500)
                        </h4>
                        <p className="mt-2 text-sm text-[#4A5D51] leading-relaxed">
                          Your requested timing has been approved by admin! Please complete your consultation fee payment below to secure this slot.
                        </p>

                        <dl className="mt-6 space-y-2.5 rounded-xl bg-white border border-[#B7DFC9] p-4 text-xs">
                          <div className="flex justify-between py-1 border-b border-[#EAEEE7]">
                            <dt className="text-[#596D60]">Client Name:</dt>
                            <dd className="font-semibold text-[#132219]">{approvedBooking.client_name}</dd>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#EAEEE7]">
                            <dt className="text-[#596D60]">Verified Gmail:</dt>
                            <dd className="font-semibold text-[#132219]">{approvedBooking.client_email}</dd>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#EAEEE7]">
                            <dt className="text-[#596D60]">Approved Date:</dt>
                            <dd className="font-semibold text-[#132219]">{approvedBooking.slot_date}</dd>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#EAEEE7]">
                            <dt className="text-[#596D60]">Approved Timing:</dt>
                            <dd className="font-semibold font-mono text-[#132219]">{approvedBooking.time_label}</dd>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <dt className="font-bold text-[#132219] text-sm">Consultation Fee:</dt>
                            <dd className="font-bold font-mono text-[#15663E] text-lg">₹1,500</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="lg:col-span-7">
                        <h5 className="text-base font-bold text-[#132219] flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-[#7C3AED]" />
                          Step 3: Choose Payment Method &amp; Pay Now
                        </h5>

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setPaying(true);
                            setPaymentError("");
                            setPaymentSuccessMsg("");
                            try {
                              await solarHarvestApi.payForApprovedBooking({
                                referenceCode: approvedBooking.reference_code,
                                email: approvedBooking.client_email,
                                paymentMethod,
                                payerDetail: payerDetail || "Verified Client Payment",
                              });
                              await loadUserBookings(approvedBooking.client_email);
                              setPayerDetail("");
                              setPaymentSuccessMsg("🎉 Payment of ₹1,500 received! Your field consultation slot is officially booked and confirmed.");
                              onBookingCreated?.();
                            } catch (err: any) {
                              setPaymentError(err?.message || "Payment failed. Please verify and try again.");
                            } finally {
                              setPaying(false);
                            }
                          }}
                          className="mt-4 space-y-4"
                        >
                          <QRCodePaymentSection
                            payerDetail={payerDetail}
                            onPayerDetailChange={setPayerDetail}
                            inputId="approved-payer-detail"
                          />

                          {paymentError && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                              {paymentError}
                            </div>
                          )}
                          {paymentSuccessMsg && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
                              {paymentSuccessMsg}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={paying}
                            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-6 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
                          >
                            <CreditCard className="h-5 w-5" />
                            {paying ? "Processing Payment..." : "Pay Now (1500) & Confirm Slot"}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. If signed-in client has a Pending Approval booking and no approved booking */}
              {user && !approvedBooking && pendingBooking && (
                <div className="mb-8 rounded-2xl border-2 border-[#B45309] bg-[#FFFBEB] p-6 shadow-xs">
                  <div className="flex items-start gap-4">
                    <Clock className="mt-1 h-6 w-6 shrink-0 text-[#B45309] animate-pulse" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-[#B45309] px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                          Waiting for Admin Timing Approval
                        </span>
                        <span className="text-xs font-mono font-semibold text-[#596D60]">
                          Ref: {pendingBooking.reference_code}
                        </span>
                      </div>
                      <h4 className="mt-2 text-lg font-bold text-[#132219]">
                        Slot Request Submitted for {pendingBooking.slot_date} ({pendingBooking.time_label})
                      </h4>
                      <p className="mt-1 text-sm text-[#4A5D51] leading-relaxed">
                        Your slot timing request is currently with the admin for review. Once the admin approves your requested timing in the admin portal, the payment checkout (₹1,500) will appear right here automatically.
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#B45309]">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Live approval monitor active — will update automatically once approved.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. If signed-in client has Confirmed Bookings and no active pending/approved */}
              {user && !approvedBooking && !pendingBooking && confirmedBookings.length > 0 && (
                <div className="mb-8 rounded-2xl border-2 border-[#15663E] bg-[#EEF7F2] p-6 shadow-xs">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[#15663E]" />
                    <div className="flex-1">
                      <span className="rounded-full bg-[#15663E] px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                        Slot Officially Booked &amp; Confirmed
                      </span>
                      <h4 className="mt-2 text-lg font-bold text-[#132219]">
                        Field Consultation Confirmed: Ref {confirmedBookings[0].reference_code}
                      </h4>
                      <p className="mt-1 text-sm text-[#4A5D51]">
                        Date: <strong>{confirmedBookings[0].slot_date}</strong> ({confirmedBookings[0].time_label}) · Paid: <strong>₹1,500</strong> ({confirmedBookings[0].payment_method || "Online"}).
                      </p>
                      <MeetingDetailsCard booking={confirmedBookings[0]} />
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div className="inline-flex items-center gap-1 rounded-lg bg-[#EEF1EB] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("book");
                      setConfirmation(null);
                    }}
                    className={`min-h-[38px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === "book"
                        ? "bg-[#FFFFFF] text-[#132219] shadow-xs"
                        : "text-[#4A5D51] hover:text-[#132219]"
                    }`}
                  >
                    Request a Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("lookup")}
                    className={`min-h-[38px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === "lookup"
                        ? "bg-[#FFFFFF] text-[#132219] shadow-xs"
                        : "text-[#4A5D51] hover:text-[#132219]"
                    }`}
                  >
                    Check Approval &amp; Pay
                    {approvedBooking && (
                      <span className="ml-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                        Approved
                      </span>
                    )}
                  </button>
                </div>

                {activeTab === "book" && (
                  <button
                    type="button"
                    onClick={loadSlots}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#DDE3D8] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-medium text-[#4A5D51] transition-colors hover:border-[#7C3AED] hover:text-[#6D28D9] whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingSlots ? "animate-spin" : ""}`} />
                    Refresh Slots
                  </button>
                )}
              </div>

              {activeTab === "book" ? (
                confirmation ? (
                  <div className="rounded-xl border border-[#E5D3B3] bg-[#FFFBEB] p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <Clock className="mt-0.5 h-6 w-6 shrink-0 text-[#B45309]" />
                      <div className="flex-1">
                        <h3
                          className="text-xl font-semibold text-[#132219]"
                          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                        >
                          Step 1 Complete — Waiting for Admin Approval on Slot Timing
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#4A5D51]">
                          Thank you, <strong className="text-[#132219]">{confirmation.clientName}</strong>. Your
                          slot request has been sent to the Admin to verify whether this timing is OK.
                          Once approved, return to <strong className="text-[#132219]">Check Approval &amp; Pay</strong> using
                          your reference code below to complete payment and finalize your booking.
                        </p>

                        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-[#F0DFC1] pt-5 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="text-xs text-[#596D60]">Reference Code</dt>
                            <dd
                              className="mt-1 text-base font-semibold text-[#132219] tabular-nums"
                              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              {confirmation.referenceCode}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#596D60]">Requested Date</dt>
                            <dd className="mt-1 text-sm font-semibold text-[#132219]">
                              {formatReadableDate(confirmation.slotDate).full}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#596D60]">Requested Timing</dt>
                            <dd
                              className="mt-1 text-sm font-semibold text-[#132219] tabular-nums"
                              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              {confirmation.timeLabel}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#596D60]">Consultation Fee</dt>
                            <dd
                              className="mt-1 text-sm font-semibold text-[#132219] tabular-nums"
                              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              ₹1,500
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              setConfirmation(null);
                              setActiveTab("lookup");
                              await fetchLookup(confirmation.referenceCode, confirmation.clientEmail);
                            }}
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9] whitespace-nowrap shrink-0"
                          >
                            <CreditCard className="h-4 w-4" />
                            Pay Now (1500)
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmation(null)}
                            className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-5 py-2 text-sm font-medium text-[#132219] transition-colors hover:border-[#7C3AED] whitespace-nowrap shrink-0"
                          >
                            Request Another Slot
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                    {/* Left Column: Date & Time Slot Selector */}
                    <div className="lg:col-span-6">
                      <h3
                        className="text-lg font-semibold text-[#132219]"
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                      >
                        1. Choose Preferred Date &amp; Time Slot
                      </h3>

                      {slotsError && (
                        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{slotsError}</span>
                        </div>
                      )}

                      {loadingSlots ? (
                        <div className="mt-4 rounded-xl border border-[#EAEEE7] bg-[#F7F8F5] p-8 text-center text-sm text-[#596D60]">
                          Loading live booking slots...
                        </div>
                      ) : datesSummary.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-[#EAEEE7] bg-[#F7F8F5] p-8 text-center text-sm text-[#596D60]">
                          No upcoming slots are open right now. Please check back shortly.
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            {datesSummary.map((item) => {
                              const isSelected = item.date === selectedDate;
                              const soldOut = item.open === 0;
                              return (
                                <button
                                  key={item.date}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(item.date);
                                    setSelectedSlotId(null);
                                  }}
                                  className={`flex min-h-[72px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                                    isSelected
                                      ? "border-[#15663E] bg-[#EEF7F2] text-[#132219]"
                                      : "border-[#DDE3D8] bg-[#FFFFFF] text-[#2A3B31] hover:border-[#9EB5A5]"
                                  }`}
                                >
                                  <span className="text-xs font-medium text-[#596D60]">
                                    {item.formatted.weekday}
                                  </span>
                                  <span className="text-sm font-semibold text-[#132219] tabular-nums">
                                    {item.formatted.dayMonth}
                                  </span>
                                  <span
                                    className={`text-[11px] font-medium tabular-nums ${
                                      soldOut ? "text-[#9A3412]" : "text-[#15663E]"
                                    }`}
                                  >
                                    {soldOut ? "Full" : `${item.open} open`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-6">
                            <p className="mb-3 text-xs font-medium text-[#596D60]">
                              Slots for{" "}
                              <span className="font-semibold text-[#132219]">
                                {selectedDate ? formatReadableDate(selectedDate).full : ""}
                              </span>
                            </p>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {slotsForSelectedDate.map((slot) => {
                                const isOpen = slot.status === "open";
                                const isSelected = selectedSlotId === slot.id;
                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    disabled={!isOpen}
                                    onClick={() => setSelectedSlotId(slot.id)}
                                    className={`flex min-h-[62px] flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors ${
                                      !isOpen
                                        ? "cursor-not-allowed border-[#E5E9E2] bg-[#F4F6F2] text-[#8A998F]"
                                        : isSelected
                                        ? "border-[#7C3AED] bg-[#7C3AED] text-white"
                                        : "border-[#DDE3D8] bg-[#FFFFFF] text-[#132219] hover:border-[#7C3AED]"
                                    }`}
                                  >
                                    <div className="flex w-full items-center justify-between gap-2">
                                      <span
                                        className="flex items-center gap-1.5 text-sm font-semibold tabular-nums whitespace-nowrap"
                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                      >
                                        {isOpen ? (
                                          <Clock className="h-3.5 w-3.5 shrink-0" />
                                        ) : (
                                          <Lock className="h-3.5 w-3.5 shrink-0" />
                                        )}
                                        {slot.time_label}
                                      </span>
                                      <span
                                        className={`text-xs font-medium whitespace-nowrap ${
                                          !isOpen
                                            ? "text-[#8A998F]"
                                            : isSelected
                                            ? "text-white/90"
                                            : "text-[#15663E]"
                                        }`}
                                      >
                                        {slot.status === "open"
                                          ? isSelected
                                            ? "Selected"
                                            : "Open"
                                          : slot.status === "booked"
                                          ? "Booked"
                                          : "Blocked"}
                                      </span>
                                    </div>
                                    <span
                                      className={`mt-1 text-xs ${
                                        isSelected ? "text-white/80" : "text-[#596D60]"
                                      }`}
                                    >
                                      {slot.slot_type}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Column: Client Details Form */}
                    <div className="lg:col-span-6 lg:border-l lg:border-[#EAEEE7] lg:pl-10">
                      <h3
                        className="text-lg font-semibold text-[#132219]"
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                      >
                        2. Enter Client &amp; Orchard Details
                      </h3>

                      <div className="mt-3 rounded-lg bg-[#F7F8F5] px-4 py-3 text-xs text-[#4A5D51]">
                        {selectedSlotObj ? (
                          <span>
                            Selected Slot:{" "}
                            <strong className="text-[#132219]">
                              {formatReadableDate(selectedSlotObj.slot_date).dayMonth} ·{" "}
                              <span
                                className="tabular-nums"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                              >
                                {selectedSlotObj.time_label}
                              </span>
                            </strong>{" "}
                            · Consultation Fee:{" "}
                            <strong className="text-[#15663E] tabular-nums">
                              ₹1,500
                            </strong>
                          </span>
                        ) : (
                          <span>
                            Select an open time slot on the left to proceed. Flat consultation fee of ₹1,500.
                          </span>
                        )}
                      </div>

                      {!user ? (
                        <div className="mt-5 rounded-2xl border border-[#DDE3D8] bg-[#FFFFFF] p-6 text-center shadow-xs">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F5F0]">
                            <GoogleIcon className="h-6 w-6" />
                          </div>
                          <h4
                            className="mt-3 text-base font-semibold text-[#132219]"
                            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                          >
                            Sign In with Gmail to Book Your Slot
                          </h4>
                          <p className="mt-1.5 text-xs leading-relaxed text-[#4A5D51] max-w-sm mx-auto">
                            Please sign in with your Gmail account first. Once signed in, you can request your slot timing. Once approved by admin, you will pay the mandatory ₹1,500 fee to confirm your booking.
                          </p>
                          <button
                            type="button"
                            onClick={onOpenSignIn}
                            className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#6D28D9]"
                          >
                            <GoogleIcon className="h-4 w-4" />
                            Sign In with Gmail
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleBookingSubmit} className="mt-5 space-y-4">
                          {/* Gmail Verified Account Card */}
                          <div className="flex items-center justify-between rounded-xl border border-[#B7DFC9] bg-[#F2FBF6] p-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#15663E] text-white font-bold uppercase">
                                {user.name.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="font-semibold text-[#132219]">{user.name}</p>
                                <p className="text-[#596D60]">{user.email}</p>
                              </div>
                            </div>
                            <span className="rounded-md bg-[#D1EADC] px-2.5 py-1 text-[11px] font-semibold text-[#15663E]">
                              Gmail Verified
                            </span>
                          </div>

                          <div className="flex items-center justify-between rounded-lg border border-[#DDE3D8] bg-[#F7F8F5] px-4 py-3">
                            <div>
                              <p className="text-xs font-semibold text-[#132219]">Field Consultation &amp; Booking Fee</p>
                              <p className="text-xs text-[#596D60]">Flat fee for all fields &amp; land sizes</p>
                            </div>
                            <p className="text-lg font-bold text-[#15663E] tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              ₹1,500
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor="sh-client-name"
                                className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                              >
                                Full Name *
                              </label>
                              <input
                                id="sh-client-name"
                                type="text"
                                required
                                placeholder="Your Name"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="sh-client-phone"
                                className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                              >
                                Phone Number *
                              </label>
                              <input
                                id="sh-client-phone"
                                type="tel"
                                required
                                placeholder="+91 98765 43210"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor="sh-client-email"
                                className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                              >
                                Gmail Address (Verified)
                              </label>
                              <input
                                id="sh-client-email"
                                type="email"
                                readOnly
                                disabled
                                value={clientEmail}
                                className="h-11 w-full rounded-lg border border-[#DDE3D8] bg-[#F7F8F5] px-3.5 text-sm font-medium text-[#4A5D51] cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="sh-farm-location"
                                className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                              >
                                Orchard Location
                              </label>
                              <input
                                id="sh-farm-location"
                                type="text"
                                placeholder="District / Town, Tamil Nadu"
                                value={farmLocation}
                                onChange={(e) => setFarmLocation(e.target.value)}
                                className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="sh-notes"
                              className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                            >
                              Requirements / Notes
                            </label>
                            <textarea
                              id="sh-notes"
                              rows={3}
                              placeholder="Share existing borewell/drip setup, solar requirements, or pest monitoring goals..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                            />
                          </div>

                          {submitError && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{submitError}</span>
                            </div>
                          )}

                          <div className="rounded-lg bg-[#FFFBEB] border border-[#F0DFC1] p-3 text-xs text-[#B45309]">
                            <strong>Booking Flow:</strong> 1. Request your slot timing below &rarr; 2. Admin reviews &amp; approves timing &rarr; 3. You pay ₹1,500 to finalize and confirm your slot.
                          </div>

                          <button
                            type="submit"
                            disabled={submitting || !selectedSlotId}
                            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-6 py-3 text-base font-semibold text-white transition-colors duration-150 hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Clock className="h-4 w-4" />
                            {submitting ? "Submitting Slot Request..." : "Request Slot Timing (₹1,500 on Approval)"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              ) : (
                /* Lookup Approval Status & Complete Payment Tab */
                <div className="max-w-3xl">
                  {/* Signed-in User's Direct Bookings List */}
                  {user && (
                    <div className="mb-8 rounded-2xl border border-[#DDE3D8] bg-[#FFFFFF] p-6 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEEE7] pb-3">
                        <div className="flex items-center gap-2">
                          <GoogleIcon className="h-5 w-5" />
                          <h4
                            className="text-base font-semibold text-[#132219]"
                            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                          >
                            My Gmail Slot Bookings
                          </h4>
                          <span className="rounded-full bg-[#EEF7F2] px-2 py-0.5 text-[11px] font-semibold text-[#15663E]">
                            {user.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => loadUserBookings(user.email)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#DDE3D8] bg-[#F7F8F5] px-3 py-1 text-xs font-medium text-[#4A5D51] hover:text-[#132219]"
                        >
                          <RefreshCw className={`h-3 w-3 ${loadingUserBookings ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                      </div>

                      {loadingUserBookings ? (
                        <p className="py-6 text-center text-xs text-[#596D60]">Checking your bookings...</p>
                      ) : userBookings.length === 0 ? (
                        <div className="py-6 text-center">
                          <p className="text-xs text-[#596D60]">You haven't requested any consultation slots yet.</p>
                          <button
                            type="button"
                            onClick={() => setActiveTab("book")}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:underline"
                          >
                            Request your slot now &rarr;
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {userBookings.map((b) => (
                            <div
                              key={b.id}
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-[#EAEEE7] bg-[#F7F8F5] p-4 transition-colors hover:border-[#C9D3C3]"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="text-xs font-bold text-[#132219] tabular-nums"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                  >
                                    {b.reference_code}
                                  </span>
                                  <span className={`text-xs font-semibold ${getStatusSummary(b.status).tone}`}>
                                    · {getStatusSummary(b.status).label}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[#596D60]">
                                  Slot: <strong>{b.slot_date}</strong> ({b.time_label}) · Fee: <strong>₹1,500</strong>
                                </p>
                              </div>

                              <div className="shrink-0">
                                {b.status === "approved_awaiting_payment" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLookupResult(b);
                                      setLookupRef(b.reference_code);
                                      setLookupEmail(b.client_email);
                                    }}
                                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D28D9]"
                                  >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Pay Now (1500) &amp; Confirm
                                  </button>
                                ) : b.status === "confirmed" ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF7F2] px-2.5 py-1 text-xs font-semibold text-[#15663E]">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Paid &amp; Confirmed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#FFFBEB] px-2.5 py-1 text-xs font-medium text-[#B45309]">
                                    <Clock className="h-3.5 w-3.5" />
                                    Awaiting Admin Timing Approval
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <h3
                    className="text-lg font-semibold text-[#132219]"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    Check Slot Approval &amp; Pay
                  </h3>
                  <p className="mt-1 text-sm text-[#4A5D51]">
                    Enter your booking reference code and email below to view approval status or complete your mandatory payment.
                  </p>

                  <form
                    onSubmit={handleLookupSubmit}
                    className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end"
                  >
                    <div className="sm:col-span-4">
                      <label
                        htmlFor="lookup-ref"
                        className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                      >
                        Reference Code *
                      </label>
                      <input
                        id="lookup-ref"
                        type="text"
                        required
                        placeholder="SH-2026-XXXXXX"
                        value={lookupRef}
                        onChange={(e) => setLookupRef(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <label
                        htmlFor="lookup-email"
                        className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                      >
                        Email Address *
                      </label>
                      <input
                        id="lookup-email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={lookupEmail}
                        onChange={(e) => setLookupEmail(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#15663E] focus:outline-none focus:ring-2 focus:ring-[#15663E]/20"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="submit"
                        disabled={lookupLoading}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9] disabled:opacity-50 whitespace-nowrap"
                      >
                        <Search className="h-4 w-4" />
                        {lookupLoading ? "Checking..." : "Check Status"}
                      </button>
                    </div>
                  </form>

                  {lookupError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{lookupError}</span>
                    </div>
                  )}

                  {lookupResult && (
                    <div className="mt-6 rounded-xl border border-[#DDE3D8] bg-[#F7F8F5] p-6">
                      {/* Header status line */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE3D8] pb-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-base font-semibold text-[#132219] tabular-nums"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {lookupResult.reference_code}
                          </span>
                          <span aria-hidden="true" className="text-[#9EB5A5]">·</span>
                          <span className={`text-sm font-semibold ${getStatusSummary(lookupResult.status).tone}`}>
                            {getStatusSummary(lookupResult.status).label}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchLookup(lookupResult.reference_code, lookupResult.client_email)}
                          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-[#C9D3C3] bg-[#FFFFFF] px-3 py-1 text-xs font-medium text-[#2A3B31] hover:border-[#15663E]"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${lookupLoading ? "animate-spin" : ""}`} />
                          Refresh
                        </button>
                      </div>

                      {/* Details Grid */}
                      <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-xs text-[#596D60]">Client</dt>
                          <dd className="mt-0.5 font-medium text-[#132219]">{lookupResult.client_name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#596D60]">Guava Field Scope</dt>
                          <dd className="mt-0.5 font-medium text-[#132219]">{lookupResult.acreage_tier}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#596D60]">Slot Date</dt>
                          <dd className="mt-0.5 font-medium text-[#132219]">
                            {formatReadableDate(lookupResult.slot_date).full}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-[#596D60]">Time Window</dt>
                          <dd
                            className="mt-0.5 font-medium text-[#132219] tabular-nums"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {lookupResult.time_label}
                          </dd>
                        </div>
                      </dl>

                      {lookupResult.admin_note && (
                        <div className="mt-4 rounded-lg border border-[#DDE3D8] bg-[#FFFFFF] px-4 py-3 text-xs text-[#3E5045]">
                          <span className="font-semibold text-[#132219]">Admin Note: </span>
                          {lookupResult.admin_note}
                        </div>
                      )}

                      {/* Stage-specific Next Action */}
                      {lookupResult.status === "pending_approval" && (
                        <div className="mt-5 rounded-xl border border-[#E5D3B3] bg-[#FFFBEB] p-4 text-sm text-[#78350F]">
                          <p className="font-semibold">Awaiting Admin Timing Review</p>
                          <p className="mt-1 text-xs leading-relaxed">
                            Our admin team is checking whether your requested slot timing is available.
                            Payment is locked until the admin approves. Check back here or click Refresh
                            after admin approval.
                          </p>
                        </div>
                      )}

                      {lookupResult.status === "rejected" && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                          <p className="font-semibold">Slot Timing Unavailable</p>
                          <p className="mt-1 text-xs">
                            Please choose another open date or time slot under the Request a Slot tab.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab("book")}
                            className="mt-3 inline-flex min-h-[38px] items-center rounded-lg bg-[#7C3AED] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                          >
                            Pick Another Open Slot
                          </button>
                        </div>
                      )}

                      {/* STEP 3: PAYMENT CHECKOUT — UNLOCKED ONLY AFTER ADMIN APPROVAL */}
                      {lookupResult.status === "approved_awaiting_payment" && (
                        <div className="mt-6 rounded-2xl border-2 border-[#7C3AED] bg-[#FFFFFF] p-6 shadow-md">
                          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EAEEE7] pb-4">
                            <div>
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF7F2] px-2.5 py-0.5 text-xs font-bold text-[#15663E]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Admin Timing Approved
                              </div>
                              <h4
                                className="mt-1.5 text-xl font-bold text-[#132219]"
                                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                              >
                                Mandatory Payment Required to Confirm Slot
                              </h4>
                              <p className="mt-1 text-xs text-[#596D60] max-w-md">
                                Admin has approved your timing. <strong>Payment of ₹1,500 is mandatory to confirm this booking.</strong> The slot will not be finalized or confirmed until payment is completed.
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-[#596D60]">Mandatory Consultation Fee</p>
                              <p
                                className="text-3xl font-extrabold text-[#7C3AED] tabular-nums"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                              >
                                ₹1,500
                              </p>
                            </div>
                          </div>

                          <form onSubmit={handlePaymentSubmit} className="mt-5 space-y-4">
                            <QRCodePaymentSection
                              payerDetail={payerDetail}
                              onPayerDetailChange={setPayerDetail}
                              inputId="payer-detail"
                            />

                            {paymentError && (
                              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{paymentError}</span>
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={paying}
                              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-6 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
                            >
                              <CreditCard className="h-5 w-5" />
                              {paying
                                ? "Verifying Payment & Confirming Slot..."
                                : "Pay Now (₹1,500) & Confirm Slot Booking"}
                            </button>
                          </form>
                        </div>
                      )}

                      {/* PAID & CONFIRMED RECEIPT */}
                      {(lookupResult.status === "confirmed" || lookupResult.status === "completed") && (
                        <div className="mt-5 rounded-xl border border-[#B7DFC9] bg-[#F2FBF6] p-5">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#15663E]" />
                            <div className="flex-1 text-sm text-[#134E30]">
                              <p className="font-semibold">
                                {paymentSuccessMsg || "Payment Confirmed — Your Slot Is Officially Booked"}
                              </p>
                              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                                <div>
                                  <span className="text-[#4A5D51]">Amount Paid: </span>
                                  <strong
                                    className="tabular-nums text-[#132219]"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                  >
                                    {formatInr(lookupResult.booking_fee)}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-[#4A5D51]">Method: </span>
                                  <strong className="text-[#132219]">
                                    {lookupResult.payment_method || "Verified"}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-[#4A5D51]">Receipt: </span>
                                  <strong
                                    className="text-[#132219]"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                  >
                                    {lookupResult.payment_reference || "Confirmed"}
                                  </strong>
                                </div>
                              </div>
                              <MeetingDetailsCard booking={lookupResult} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
