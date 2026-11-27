import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarPlus,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  solarHarvestApi,
  type BookingRecord,
  type BookingSlot,
} from "../lib/solarharvestApi";

interface AdminBookingPanelProps {
  adminToken: string | null;
  onAuthChange: (token: string | null) => void;
  logoUrl: string;
  onLogoChange: (newLogoUrl: string) => void;
  onSlotsMutated: () => void;
  refreshSignal: number;
  standalone?: boolean;
  onBackToClient?: () => void;
}

const getTomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const STATUS_LABELS: Record<BookingRecord["status"], { label: string; color: string }> = {
  pending_approval: { label: "Needs Timing Approval", color: "text-[#B45309]" },
  approved_awaiting_payment: { label: "Approved · Awaiting Payment", color: "text-[#0369A1]" },
  confirmed: { label: "Paid & Slot Booked", color: "text-[#15663E]" },
  completed: { label: "Completed", color: "text-[#1D4ED8]" },
  rejected: { label: "Timing Declined", color: "text-[#B91C1C]" },
  cancelled: { label: "Cancelled", color: "text-[#64748B]" },
};

export function AdminBookingPanel({
  adminToken,
  onAuthChange,
  logoUrl,
  onLogoChange,
  onSlotsMutated,
  refreshSignal,
  standalone = false,
  onBackToClient,
}: AdminBookingPanelProps) {
  const [authStatus, setAuthStatus] = useState<"loading" | "unconfigured" | "configured">("loading");
  const [authSource, setAuthSource] = useState<"env" | "changed" | "unconfigured">("unconfigured");
  const [authMode, setAuthMode] = useState<"login" | "change-password">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"bookings" | "slots" | "logo" | "change-password">("bookings");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Per-booking review inputs (custom fee & timing note before approving/declining)
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [reviewFees, setReviewFees] = useState<Record<number, string>>({});
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  // Per-booking meeting link & joining details after payment
  const [meetingLinkDrafts, setMeetingLinkDrafts] = useState<Record<number, string>>({});
  const [joiningDetailsDrafts, setJoiningDetailsDrafts] = useState<Record<number, string>>({});
  const [sendingMeetingId, setSendingMeetingId] = useState<number | null>(null);

  // Add slot form state
  const [newSlotDate, setNewSlotDate] = useState(getTomorrowIso());
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:00");
  const [newSlotType, setNewSlotType] = useState("V2V Tech Site & Tech Briefing");
  const [creatingSlot, setCreatingSlot] = useState(false);

  // Logo upload state
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    solarHarvestApi
      .getAdminStatus()
      .then((res) => {
        setAuthSource(res.source);
        setAuthStatus(res.configured ? "configured" : "unconfigured");
      })
      .catch((err) => {
        setAuthStatus("unconfigured");
        setAuthError(err?.message || "Could not verify the admin server configuration.");
      });
  }, []);

  const loadAdminData = async (token: string) => {
    setLoadingData(true);
    try {
      const [bData, sData] = await Promise.all([
        solarHarvestApi.getAdminBookings(token),
        solarHarvestApi.getAdminSlots(token),
      ]);
      setBookings(bData);
      setSlots(sData);
    } catch (err: any) {
      if (
        String(err?.message || "").toLowerCase().includes("session") ||
        String(err?.message || "").includes("401")
      ) {
        onAuthChange(null);
      }
      setFeedback({ type: "error", text: err?.message || "Failed to load admin schedule." });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadAdminData(adminToken);
    }
  }, [adminToken, refreshSignal]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const adminEmail = usernameInput.trim();
    if (!adminEmail) {
      setAuthError("Please enter the admin email.");
      return;
    }

    if (authStatus !== "configured") {
      setAuthError("Admin access is not configured on the server.");
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await solarHarvestApi.loginAdmin(adminEmail, passwordInput);
      onAuthChange(res.token);
      setAuthStatus("configured");
      setUsernameInput("");
      setPasswordInput("");
    } catch (err: any) {
      setAuthError(err?.message || "Authentication failed.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (newPasswordInput.length < 12 || newPasswordInput.length > 128) {
      setAuthError("Choose a password between 12 and 128 characters.");
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setAuthError("New passwords do not match.");
      return;
    }

    setAuthSubmitting(true);
    try {
      await solarHarvestApi.changeAdminPassword(
        usernameInput.trim(),
        passwordInput,
        newPasswordInput
      );
      setPasswordInput("");
      setNewPasswordInput("");
      setConfirmNewPasswordInput("");
      setAuthMode("login");
      setAuthSource("changed");
      setAuthStatus("configured");
      setAuthSuccess("Password updated. Sign in with your new password.");
    } catch (err: any) {
      setAuthError(err?.message || "Could not update the admin password.");
    } finally {
      setAuthSubmitting(false);
    }
  };
  const handleReviewBooking = async (booking: BookingRecord, decision: "approve" | "reject") => {
    if (!adminToken) return;
    setReviewingId(booking.id);
    setFeedback(null);
    try {
      const feeStr = reviewFees[booking.id];
      const parsedFee = feeStr !== undefined && feeStr !== "" ? Number(feeStr) : booking.booking_fee;
      const res = await solarHarvestApi.reviewAdminBooking(adminToken, booking.id, {
        decision,
        adminNote: reviewNotes[booking.id] || "",
        bookingFee: decision === "approve" ? parsedFee : undefined,
      });
      setFeedback({ type: "success", text: res.message });
      await loadAdminData(adminToken);
      onSlotsMutated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Could not review booking timing." });
    } finally {
      setReviewingId(null);
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: number,
    status: BookingRecord["status"]
  ) => {
    if (!adminToken) return;
    setFeedback(null);
    try {
      await solarHarvestApi.updateAdminBookingStatus(adminToken, bookingId, status);
      setFeedback({ type: "success", text: `Booking updated to ${STATUS_LABELS[status].label}.` });
      await loadAdminData(adminToken);
      onSlotsMutated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Could not update booking status." });
    }
  };

  const handleSendMeetingDetails = async (booking: BookingRecord) => {
    if (!adminToken) return;
    const meetingLink = (meetingLinkDrafts[booking.id] ?? booking.meeting_link ?? "").trim();
    const joiningDetails = (joiningDetailsDrafts[booking.id] ?? booking.joining_details ?? "").trim();
    if (!meetingLink) {
      setFeedback({ type: "error", text: "Please enter a meeting link before sending." });
      return;
    }
    setSendingMeetingId(booking.id);
    setFeedback(null);
    try {
      const res = await solarHarvestApi.sendAdminMeetingDetails(adminToken, booking.id, {
        meetingLink,
        joiningDetails,
      });
      setFeedback({ type: "success", text: res.message });
      await loadAdminData(adminToken);
      onSlotsMutated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Could not send meeting details." });
    } finally {
      setSendingMeetingId(null);
    }
  };

  const handleCreateSingleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setCreatingSlot(true);
    setFeedback(null);
    try {
      const res = await solarHarvestApi.createAdminSlot(adminToken, {
        slotDate: newSlotDate,
        startTime: newStartTime,
        endTime: newEndTime,
        slotType: newSlotType,
      });
      setFeedback({ type: "success", text: res.message || "Slot added." });
      await loadAdminData(adminToken);
      onSlotsMutated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Failed to add slot." });
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleGenerateDefaultDay = async () => {
    if (!adminToken) return;
    setCreatingSlot(true);
    setFeedback(null);
    try {
      const res = await solarHarvestApi.createAdminSlot(adminToken, {
        slotDate: newSlotDate,
        slotType: newSlotType,
        bulkDefault: true,
      });
      setFeedback({ type: "success", text: res.message || "Added default day slots." });
      await loadAdminData(adminToken);
      onSlotsMutated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Failed to generate slots." });
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleToggleSlotBlock = async (slot: BookingSlot) => {
    if (!adminToken) return;
    const nextStatus = slot.status === "blocked" ? "open" : "blocked";
    setFeedback(null);
    try {
      await solarHarvestApi.updateAdminSlotStatus(adminToken, slot.id, nextStatus);
      setFeedback({
        type: "success",
        text: `Slot ${slot.slot_date} (${slot.time_label}) marked as ${nextStatus}.`,
      });
      await loadAdminData(adminToken);
      onSlotsMutated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Could not update slot." });
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!adminToken) return;
    setFeedback(null);
    try {
      await solarHarvestApi.deleteAdminSlot(adminToken, slotId);
      setFeedback({ type: "success", text: "Slot removed from schedule." });
      await loadAdminData(adminToken);
      onSlotsMutated();
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Could not delete slot." });
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFeedback({ type: "error", text: "Please upload a PNG, JPG, or WebP logo image." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: "error", text: "Logo file must be under 2 MB." });
      return;
    }
    setLogoUploading(true);
    setFeedback(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        const res = await solarHarvestApi.updateWebsiteLogo(adminToken, dataUrl);
        onLogoChange(res.logoUrl);
        setFeedback({ type: "success", text: "Website logo updated across the application." });
      } catch (err: any) {
        setFeedback({ type: "error", text: err?.message || "Failed to save logo." });
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = async () => {
    if (!adminToken) return;
    setLogoUploading(true);
    setFeedback(null);
    try {
      await solarHarvestApi.updateWebsiteLogo(adminToken, "");
      onLogoChange("");
      setFeedback({ type: "success", text: "Website logo reset to default." });
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Failed to reset logo." });
    } finally {
      setLogoUploading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") return bookings;
    if (statusFilter === "rejected") {
      return bookings.filter((b) => b.status === "rejected" || b.status === "cancelled");
    }
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
      all: bookings.length,
      pending_approval: bookings.filter((b) => b.status === "pending_approval").length,
      approved_awaiting_payment: bookings.filter((b) => b.status === "approved_awaiting_payment").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      rejected: bookings.filter((b) => b.status === "rejected" || b.status === "cancelled").length,
    };
  }, [bookings]);

  const metrics = useMemo(() => {
    const awaitingApproval = bookings.filter((b) => b.status === "pending_approval").length;
    const awaitingPayment = bookings.filter((b) => b.status === "approved_awaiting_payment").length;
    const paidBooked = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
    const openSlots = slots.filter((s) => s.status === "open").length;
    return {
      awaitingApproval,
      awaitingPayment,
      paidBooked,
      openSlots,
    };
  }, [slots, bookings]);

  return (
    <section
      id="admin-login"
      className={`border-t border-white/10 bg-transparent ${
        standalone ? "min-h-[calc(100vh-4rem)] py-12 sm:py-16" : "py-20 sm:py-24"
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {adminToken && (
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/20 bg-[#0B1611]/80 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Portal · Slot Timing Approval &amp; Schedule Control
            </p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                textWrap: "balance",
              }}
            >
              Admin Slot Approval Dashboard
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">
              Review every person who requested a slot, approve whether the slot timing is OK to unlock client payment, and manage available schedule windows.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {standalone && onBackToClient && (
              <button
                type="button"
                onClick={onBackToClient}
                className="inline-flex min-h-[40px] items-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md hover:border-white/50 hover:bg-white/20 whitespace-nowrap shrink-0"
              >
                Client Page
              </button>
            )}
            <button
              type="button"
              onClick={() => loadAdminData(adminToken)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => onAuthChange(null)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-400/40 bg-red-500/15 px-3.5 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/30 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
        )}

        {/* Admin Auth Gate */}
        {!adminToken ? (
          <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md flex-col items-center justify-center">
            <div className="w-full overflow-hidden rounded-3xl border border-white/20 bg-[#0B1611]/85 shadow-2xl backdrop-blur-xl">
              {/* Header strip */}
              <div className="border-b border-white/15 bg-gradient-to-r from-[#132219]/90 via-[#173324]/90 to-[#1B1438]/90 px-7 py-6 text-white sm:px-8">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-300">
                    <ShieldCheck className="h-4 w-4" />
                    Admin Login · Slot Timing Approval &amp; Schedule Control
                  </p>
                  {standalone && onBackToClient && (
                    <button
                      type="button"
                      onClick={onBackToClient}
                      className="inline-flex min-h-[34px] items-center rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 whitespace-nowrap shrink-0"
                    >
                      Client Page
                    </button>
                  )}
                </div>
                <h2
                  className="mt-2.5 text-3xl font-bold tracking-tight text-white"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Admin Login
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  {authStatus === "unconfigured"
                    ? "Admin access is disabled. Set SOLARHARVEST_ADMIN_PASSWORD in this service's Render Environment settings, then redeploy."
                    : authSource === "changed"
                    ? "Sign in with your updated administrator password."
                    : "Administrators can sign in here to view all slot booking requests, approve or decline slot timings, and track client payments."}
                </p>
              </div>

              {/* Form body */}
              <div className="p-7 sm:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/20 text-violet-300">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      className="text-base font-semibold text-white"
                      style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                    >
                      Sign In as Admin
                    </h3>
                    <p className="text-xs text-slate-400">
                      Sign in with the updated admin password.
                    </p>
                  </div>
                </div>

                {authStatus === "loading" ? (
                  <p className="py-4 text-sm text-slate-300">Checking admin access...</p>
                ) : authStatus === "unconfigured" ? (
                  <p className={`rounded-lg border p-3 text-sm ${authError
                    ? "border-red-400/40 bg-red-500/15 text-red-200"
                    : "border-amber-400/40 bg-amber-500/15 text-amber-200"}`}>
                    {authError || "Set SOLARHARVEST_ADMIN_PASSWORD in Render's Environment settings and redeploy to enable admin sign-in."}
                  </p>
                ) : (
                  <form
                    onSubmit={handleAuthSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="admin-username"
                        className="mb-1.5 block text-xs font-semibold text-slate-200"
                      >
                        Admin Email
                      </label>
                      <input
                        id="admin-username"
                        type="email"
                        required
                        autoComplete="username"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Enter admin email"
                        className="h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm text-white placeholder:text-slate-400 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="admin-pass"
                        className="mb-1.5 block text-xs font-semibold text-slate-200"
                      >
                        Admin Password
                      </label>
                      <input
                        id="admin-pass"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Enter admin password"
                        className="h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm text-white placeholder:text-slate-400 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
                      />
                    </div>

                    {authError && (
                      <div className="flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/20 p-3 text-xs text-red-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}
                    {authSuccess && (
                      <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 p-3 text-xs text-emerald-200">
                        {authSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#10B981] px-5 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(124,58,237,0.5)] transition-all hover:shadow-[0_0_32px_rgba(16,185,129,0.55)] disabled:opacity-50"
                    >
                      {authSubmitting ? "Verifying..." : "Sign In to Admin Dashboard"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Admin Workspace */
          <div className="space-y-8">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-white/20 bg-[#0B1611]/75 p-5 backdrop-blur-md">
                <p className="text-xs font-medium text-slate-300">Needs Timing Approval</p>
                <p
                  className="mt-2 text-3xl font-semibold text-amber-400 tabular-nums"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {metrics.awaitingApproval}
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-[#0B1611]/75 p-5 backdrop-blur-md">
                <p className="text-xs font-medium text-slate-300">Approved · Awaiting Payment</p>
                <p
                  className="mt-2 text-3xl font-semibold text-sky-400 tabular-nums"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {metrics.awaitingPayment}
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-[#0B1611]/75 p-5 backdrop-blur-md">
                <p className="text-xs font-medium text-slate-300">Paid &amp; Booked Slots</p>
                <p
                  className="mt-2 text-3xl font-semibold text-emerald-400 tabular-nums"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {metrics.paidBooked}
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-[#0B1611]/75 p-5 backdrop-blur-md">
                <p className="text-xs font-medium text-slate-300">Open Slots</p>
                <p
                  className="mt-2 text-3xl font-semibold text-white tabular-nums"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {metrics.openSlots}
                </p>
              </div>
            </div>

            {feedback && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-4 text-sm ${
                  feedback.type === "success"
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                    : "border-red-400/40 bg-red-500/20 text-red-200"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Segmented Navigation */}
            <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-white/10 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab("bookings")}
                className={`min-h-[40px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === "bookings"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Booked Persons &amp; Timing Approval ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("slots")}
                className={`min-h-[40px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === "slots"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Manage Slots ({slots.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("logo")}
                className={`min-h-[40px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === "logo"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Website Logo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("change-password")}
                className={`min-h-[40px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === "change-password"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Change Password
              </button>
            </div>

            {/* TAB 1: BOOKED PERSONS & TIMING APPROVAL */}
            {activeTab === "bookings" && (
              <div className="rounded-2xl border border-[#DDE3D8] bg-[#F7F8F5] p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h3
                    className="text-lg font-semibold text-[#132219]"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    People Who Booked a Slot
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: "all", label: "All", count: statusCounts.all },
                      { id: "pending_approval", label: "Needs Approval", count: statusCounts.pending_approval },
                      { id: "approved_awaiting_payment", label: "Awaiting Payment", count: statusCounts.approved_awaiting_payment },
                      { id: "confirmed", label: "Paid & Booked", count: statusCounts.confirmed },
                      { id: "completed", label: "Completed", count: statusCounts.completed },
                      { id: "rejected", label: "Declined", count: statusCounts.rejected },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatusFilter(st.id)}
                        className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          statusFilter === st.id
                            ? "bg-[#7C3AED] text-white shadow-sm"
                            : "border border-[#D5DDD0] bg-white text-[#132219] hover:border-[#7C3AED] hover:text-[#6D28D9]"
                        }`}
                      >
                        {st.label} ({st.count})
                      </button>
                    ))}
                  </div>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="rounded-xl border border-[#DDE3D8] bg-[#FFFFFF] py-12 text-center text-sm text-[#596D60]">
                    No slot bookings found for this filter.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((b) => {
                      const statusMeta = STATUS_LABELS[b.status] || {
                        label: b.status,
                        color: "text-[#4A5D51]",
                      };
                      return (
                        <div
                          key={b.id}
                          className="rounded-xl border border-[#DDE3D8] bg-[#FFFFFF] p-5 sm:p-6"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EAEEE7] pb-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                <span
                                  className="text-sm font-semibold text-[#132219] tabular-nums"
                                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                >
                                  {b.reference_code}
                                </span>
                                <span aria-hidden="true" className="text-[#9EB5A5]">·</span>
                                <span className={`text-xs font-semibold ${statusMeta.color}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                              <h4
                                className="mt-1.5 text-lg font-semibold text-[#132219]"
                                style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                              >
                                {b.client_name}
                              </h4>
                              <p className="mt-0.5 text-xs text-[#4A5D51]">
                                {b.client_phone} · {b.client_email}
                                {b.farm_location ? ` · ${b.farm_location}` : ""}
                              </p>
                            </div>

                            <div className="text-left sm:text-right">
                              <p className="text-xs font-medium text-[#596D60]">Requested Slot Timing</p>
                              <p className="mt-0.5 text-sm font-semibold text-[#132219] tabular-nums">
                                {b.slot_date}
                              </p>
                              <p
                                className="text-sm font-semibold text-[#15663E] tabular-nums"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                              >
                                {b.time_label}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-[#4A5D51] sm:grid-cols-3">
                            <div>
                              <span className="text-[#596D60]">Orchard Scope: </span>
                              <strong className="text-[#132219]">{b.acreage_tier}</strong>
                            </div>
                            <div>
                              <span className="text-[#596D60]">Booking Fee: </span>
                              <strong
                                className="text-[#132219] tabular-nums"
                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                              >
                                {formatInr(b.booking_fee)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[#596D60]">Payment: </span>
                              <strong className="capitalize text-[#132219]">
                                {b.payment_status === "paid"
                                  ? `Paid (${b.payment_method || "Verified"})`
                                  : b.payment_status === "unpaid"
                                  ? "Awaiting User Payment"
                                  : b.payment_status === "awaiting_approval"
                                  ? "Locked Until Admin Approves"
                                  : b.payment_status}
                              </strong>
                            </div>
                          </div>

                          {b.notes && (
                            <p className="mt-3 text-xs text-[#4A5D51]">
                              <span className="font-semibold text-[#132219]">Client Notes: </span>
                              {b.notes}
                            </p>
                          )}

                          {b.payment_reference && (
                            <p
                              className="mt-2 text-xs text-[#15663E] tabular-nums"
                              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              Payment Receipt: {b.payment_reference}
                            </p>
                          )}

                          {/* EXPLICIT ADMIN TIMING APPROVAL PROMPT */}
                          {b.status === "pending_approval" && (
                            <div className="mt-5 rounded-xl border border-[#E5D3B3] bg-[#FFFBEB] p-4 sm:p-5">
                              <p className="text-sm font-semibold text-[#132219]">
                                Is this slot timing OK ({b.slot_date} · {b.time_label})?
                              </p>
                              <p className="mt-0.5 text-xs text-[#596D60]">
                                Approving notifies the user to pay the fee below and confirm their slot.
                                Declining immediately frees this time slot.
                              </p>

                              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
                                <div className="sm:col-span-4">
                                  <label
                                    htmlFor={`fee-${b.id}`}
                                    className="mb-1 block text-xs font-semibold text-[#2A3B31]"
                                  >
                                    Fee to Collect (INR ₹)
                                  </label>
                                  <input
                                    id={`fee-${b.id}`}
                                    type="number"
                                    min={0}
                                    max={500000}
                                    value={reviewFees[b.id] ?? String(b.booking_fee)}
                                    onChange={(e) =>
                                      setReviewFees((prev) => ({ ...prev, [b.id]: e.target.value }))
                                    }
                                    className="h-10 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3 text-sm text-[#132219] tabular-nums focus:border-[#15663E] focus:outline-none"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                  />
                                </div>
                                <div className="sm:col-span-8">
                                  <label
                                    htmlFor={`note-${b.id}`}
                                    className="mb-1 block text-xs font-semibold text-[#2A3B31]"
                                  >
                                    Note for Client (Optional)
                                  </label>
                                  <input
                                    id={`note-${b.id}`}
                                    type="text"
                                    placeholder="e.g. Slot timing confirmed — please complete payment to book."
                                    value={reviewNotes[b.id] ?? ""}
                                    onChange={(e) =>
                                      setReviewNotes((prev) => ({ ...prev, [b.id]: e.target.value }))
                                    }
                                    className="h-10 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3 text-sm text-[#132219] placeholder:text-[#8A998F] focus:border-[#15663E] focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  disabled={reviewingId === b.id}
                                  onClick={() => handleReviewBooking(b, "approve")}
                                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6D28D9] disabled:opacity-50 whitespace-nowrap"
                                >
                                  <Check className="h-4 w-4" />
                                  Approve Timing &amp; Ask User to Pay
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewingId === b.id}
                                  onClick={() => handleReviewBooking(b, "reject")}
                                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-200 bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
                                >
                                  <X className="h-4 w-4" />
                                  Decline Timing (Re-open Slot)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Secondary actions for approved / paid bookings */}
                          {b.status === "approved_awaiting_payment" && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EAEEE7] pt-4">
                              <p className="text-xs font-medium text-[#0369A1]">
                                Approved — waiting for {b.client_name} to pay {formatInr(b.booking_fee)} via Check Approval &amp; Pay.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleUpdateBookingStatus(b.id, "cancelled")}
                                className="min-h-[34px] rounded-md border border-red-200 bg-[#FFFFFF] px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                Cancel &amp; Free Slot
                              </button>
                            </div>
                          )}

                          {b.status === "confirmed" && (
                            <div className="mt-4 space-y-4 border-t border-[#EAEEE7] pt-4">
                              {/* Verify Payment & Send Meeting Link + Joining Details */}
                              <div className="rounded-xl border border-[#B7DFC9] bg-[#F2FBF6] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#15663E]">
                                    <Video className="h-4 w-4" />
                                    {b.payment_verified
                                      ? "Payment Verified · Meeting Link & Joining Details Sent"
                                      : "Verify Payment & Send Meeting Link to Client"}
                                  </span>
                                  {b.payment_verified ? (
                                    <span className="rounded-full bg-[#15663E] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                                      Verified &amp; Sent
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                                      Pending Verification
                                    </span>
                                  )}
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-[#2A3B31]">
                                      Meeting Link (Google Meet / Zoom) *
                                    </label>
                                    <input
                                      type="url"
                                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                                      value={meetingLinkDrafts[b.id] ?? b.meeting_link ?? ""}
                                      onChange={(e) =>
                                        setMeetingLinkDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                                      }
                                      className="h-10 w-full rounded-lg border border-[#C9D3C3] bg-white px-3 text-xs text-[#132219] placeholder:text-[#8A998F] focus:border-[#7C3AED] focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-[#2A3B31]">
                                      Joining Details (Meeting ID, Passcode, Notes)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Join 5 mins early · Host: Arun Sekar (+91 ...)"
                                      value={joiningDetailsDrafts[b.id] ?? b.joining_details ?? ""}
                                      onChange={(e) =>
                                        setJoiningDetailsDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))
                                      }
                                      className="h-10 w-full rounded-lg border border-[#C9D3C3] bg-white px-3 text-xs text-[#132219] placeholder:text-[#8A998F] focus:border-[#7C3AED] focus:outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[11px] text-[#4A5D51]">
                                    Client UTR/Ref: <span className="font-mono font-semibold text-[#132219]">{b.payment_reference || "Paid"}</span>
                                  </p>
                                  <button
                                    type="button"
                                    disabled={sendingMeetingId === b.id}
                                    onClick={() => handleSendMeetingDetails(b)}
                                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#15663E] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#115232] disabled:opacity-50"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    {sendingMeetingId === b.id
                                      ? "Sending..."
                                      : b.payment_verified
                                      ? "Update Meeting Details"
                                      : "Verify Payment & Send Meeting Link"}
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(b.id, "completed")}
                                  className="min-h-[36px] rounded-md bg-[#7C3AED] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#6D28D9]"
                                >
                                  Mark Session Completed
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBookingStatus(b.id, "cancelled")}
                                  className="min-h-[36px] rounded-md border border-red-200 bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MANAGE SLOTS */}
            {activeTab === "slots" && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <div className="rounded-2xl border border-[#DDE3D8] bg-[#F7F8F5] p-6 lg:col-span-5">
                  <h3
                    className="flex items-center gap-2 text-lg font-semibold text-[#132219]"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    <CalendarPlus className="h-5 w-5 text-[#15663E]" />
                    Create Booking Slots
                  </h3>
                  <p className="mt-1 text-xs text-[#596D60]">
                    Add a custom time slot or generate the 4 standard daily windows in one click.
                  </p>

                  <form onSubmit={handleCreateSingleSlot} className="mt-5 space-y-4">
                    <div>
                      <label htmlFor="slot-date" className="mb-1.5 block text-xs font-semibold text-[#2A3B31]">
                        Date
                      </label>
                      <input
                        id="slot-date"
                        type="date"
                        required
                        value={newSlotDate}
                        onChange={(e) => setNewSlotDate(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#15663E] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="slot-start" className="mb-1.5 block text-xs font-semibold text-[#2A3B31]">
                          Start Time
                        </label>
                        <input
                          id="slot-start"
                          type="time"
                          required
                          value={newStartTime}
                          onChange={(e) => setNewStartTime(e.target.value)}
                          className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#15663E] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="slot-end" className="mb-1.5 block text-xs font-semibold text-[#2A3B31]">
                          End Time
                        </label>
                        <input
                          id="slot-end"
                          type="time"
                          required
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#15663E] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="slot-type" className="mb-1.5 block text-xs font-semibold text-[#2A3B31]">
                        Session Label
                      </label>
                      <input
                        id="slot-type"
                        type="text"
                        required
                        value={newSlotType}
                        onChange={(e) => setNewSlotType(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#15663E] focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-2.5 pt-2">
                      <button
                        type="submit"
                        disabled={creatingSlot}
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add Single Time Slot
                      </button>
                      <button
                        type="button"
                        disabled={creatingSlot}
                        onClick={handleGenerateDefaultDay}
                        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-5 py-2.5 text-sm font-semibold text-[#132219] hover:border-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50"
                      >
                        Generate 4 Standard Slots for Selected Date
                      </button>
                    </div>
                  </form>
                </div>

                <div className="rounded-2xl border border-[#DDE3D8] bg-[#F7F8F5] p-6 lg:col-span-7">
                  <h3
                    className="mb-4 text-lg font-semibold text-[#132219]"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                  >
                    Published Schedule
                  </h3>
                  <div className="max-h-[520px] overflow-y-auto divide-y divide-[#DDE3D8] rounded-xl border border-[#DDE3D8] bg-[#FFFFFF] px-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#132219] tabular-nums">
                            <span>{slot.slot_date}</span>
                            <span aria-hidden="true">·</span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                              {slot.time_label}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-[#596D60]">
                            <span>{slot.slot_type}</span>
                            {slot.client_name && (
                              <span> · Requested by {slot.client_name} ({slot.reference_code})</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-xs font-semibold capitalize ${
                              slot.status === "open"
                                ? "text-[#15663E]"
                                : slot.status === "booked"
                                ? "text-[#B45309]"
                                : "text-[#64748B]"
                            }`}
                          >
                            {slot.status}
                          </span>

                          {slot.status !== "booked" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleSlotBlock(slot)}
                                className="min-h-[34px] rounded-md border border-[#C9D3C3] bg-[#FFFFFF] px-3 py-1 text-xs font-medium text-[#132219] hover:border-[#15663E]"
                              >
                                {slot.status === "blocked" ? "Re-open" : "Block"}
                              </button>
                              <button
                                type="button"
                                aria-label="Delete slot"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WEBSITE LOGO */}
            {activeTab === "logo" && (
              <div className="max-w-2xl rounded-2xl border border-[#DDE3D8] bg-[#F7F8F5] p-6 sm:p-8">
                <h3
                  className="flex items-center gap-2 text-lg font-semibold text-[#132219]"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  <ImageIcon className="h-5 w-5 text-[#15663E]" />
                  Website Logo Image
                </h3>
                <p className="mt-1 text-sm text-[#4A5D51]">
                  Upload a replacement main website logo (PNG, JPG, or WebP, max 2 MB). The V2V logo
                  remains in the top-left corner.
                </p>

                <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                  <div className="flex h-28 w-64 items-center justify-center rounded-xl border border-[#DDE3D8] bg-[#FFFFFF] p-4">
                    <img
                      src={logoUrl || "/assets/aistudio/IMG-20261123-WA0000_a37a8dc6.jpg"}
                      alt="Current Website Logo"
                      referrerPolicy="no-referrer"
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9]">
                      <Upload className="h-4 w-4" />
                      {logoUploading ? "Uploading..." : "Upload New Logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoFileChange}
                        disabled={logoUploading}
                        className="sr-only"
                      />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={handleResetLogo}
                        disabled={logoUploading}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#2A3B31] hover:border-[#7C3AED]"
                      >
                        Reset to Default Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CHANGE PASSWORD */}
            {activeTab === "change-password" && (
              <div className="max-w-md rounded-2xl border border-[#DDE3D8] bg-[#F7F8F5] p-6 sm:p-8">
                <h3
                  className="flex items-center gap-2 text-lg font-semibold text-[#132219]"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Change Admin Password
                </h3>
                <p className="mt-1 text-sm text-[#4A5D51]">
                  Update your admin portal login password below.
                </p>

                <form
                  onSubmit={handleChangePassword}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="cp-email"
                      className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                    >
                      Admin Email
                    </label>
                    <input
                      id="cp-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter admin email"
                      className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cp-current"
                      className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                    >
                      Current Password
                    </label>
                    <input
                      id="cp-current"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter current password"
                      className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cp-new"
                      className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                    >
                      New Password (12–128 characters)
                    </label>
                    <input
                      id="cp-new"
                      type="password"
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password"
                      className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cp-confirm"
                      className="mb-1.5 block text-xs font-semibold text-[#2A3B31]"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="cp-confirm"
                      type="password"
                      required
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-11 w-full rounded-lg border border-[#C9D3C3] bg-[#FFFFFF] px-3.5 text-sm text-[#132219] focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                    />
                  </div>

                  {authError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}
                  {authSuccess && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                      {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9] disabled:opacity-50"
                  >
                    {authSubmitting ? "Updating Password..." : "Update Password"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
