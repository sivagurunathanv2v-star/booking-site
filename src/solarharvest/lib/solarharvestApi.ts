export interface BookingSlot {
  id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  time_label: string;
  slot_type: string;
  status: "open" | "booked" | "blocked";
  booking_id?: number | null;
  reference_code?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  booking_status?: string | null;
}

export type BookingStatus =
  | "pending_approval"
  | "approved_awaiting_payment"
  | "confirmed"
  | "completed"
  | "rejected"
  | "cancelled";

export interface BookingRecord {
  id: number;
  reference_code: string;
  slot_id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  acreage_tier: string;
  farm_location: string;
  notes: string;
  status: BookingStatus;
  booking_fee: number;
  payment_status: string;
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string | null;
  admin_note?: string;
  approved_at?: string | null;
  payment_verified?: number;
  meeting_link?: string;
  joining_details?: string;
  meeting_sent_at?: string | null;
  created_at: string;
  updated_at?: string;
  slot_date: string;
  start_time?: string;
  end_time?: string;
  time_label: string;
  slot_type: string;
}

export interface BookingConfirmation {
  id: number;
  referenceCode: string;
  status: BookingStatus;
  paymentStatus: string;
  bookingFee: number;
  slotDate: string;
  timeLabel: string;
  slotType: string;
  clientName: string;
  clientEmail: string;
  acreageTier: string;
}

const getOriginBase = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Unexpected response from server (${res.status}).`);
  }
  if (!res.ok) {
    throw new Error(parsed?.error || `Request failed (${res.status}).`);
  }
  return parsed as T;
}

export const solarHarvestApi = {
  async getAuthConfig(): Promise<{ googleClientId: string }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/auth-config`);
    const json = await parseJson<{ data: { googleClientId: string } }>(res);
    return json.data;
  },

  async verifyGoogleCredential(credential: string): Promise<{ email: string; name: string; phone?: string; avatar?: string }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/google-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const json = await parseJson<{ data: { email: string; name: string; phone?: string; avatar?: string } }>(res);
    return json.data;
  },

  async saveClientLogin(payload: { email: string; name: string; phone?: string; avatar?: string }): Promise<any> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/client/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await parseJson<{ data: any }>(res);
    return json.data;
  },

  async getSettings(): Promise<{ logoUrl: string }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/settings`);
    const json = await parseJson<{ data: { logoUrl: string } }>(res);
    return json.data;
  },

  async getPublicSlots(date?: string): Promise<BookingSlot[]> {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const res = await fetch(`${getOriginBase()}/api/solarharvest/slots${query}`);
    const json = await parseJson<{ data: BookingSlot[] }>(res);
    return json.data || [];
  },

  async createBooking(payload: {
    slotId: number;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    acreageTier: string;
    farmLocation: string;
    notes: string;
  }): Promise<BookingConfirmation> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await parseJson<{ data: BookingConfirmation }>(res);
    return json.data;
  },

  async lookupBooking(reference: string, email: string): Promise<BookingRecord> {
    const params = new URLSearchParams({ reference, email });
    const res = await fetch(`${getOriginBase()}/api/solarharvest/bookings/lookup?${params.toString()}`);
    const json = await parseJson<{ data: BookingRecord }>(res);
    return json.data;
  },

  async getUserBookings(email: string): Promise<BookingRecord[]> {
    const params = new URLSearchParams({ email });
    const res = await fetch(`${getOriginBase()}/api/solarharvest/user/bookings?${params.toString()}`);
    const json = await parseJson<{ data: BookingRecord[] }>(res);
    return json.data || [];
  },

  async payForApprovedBooking(payload: {
    referenceCode: string;
    email: string;
    paymentMethod: "UPI" | "Card" | "Net Banking";
    payerDetail: string;
  }): Promise<BookingRecord> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/bookings/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await parseJson<{ data: BookingRecord }>(res);
    return json.data;
  },

  async getAdminStatus(): Promise<{ configured: boolean; source: "env" | "changed" | "unconfigured" }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/status`);
    const json = await parseJson<{ data: { configured: boolean; source: "env" | "changed" | "unconfigured" } }>(res);
    return json.data;
  },

  async loginAdmin(username: string, password: string): Promise<{ token: string }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const json = await parseJson<{ data: { token: string } }>(res);
    return json.data;
  },

  async changeAdminPassword(
    username: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, currentPassword, newPassword }),
    });
    await parseJson<{ message: string }>(res);
  },

  async getAdminSlots(token: string): Promise<BookingSlot[]> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/slots`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await parseJson<{ data: BookingSlot[] }>(res);
    return json.data || [];
  },

  async createAdminSlot(
    token: string,
    payload: { slotDate: string; startTime?: string; endTime?: string; slotType?: string; bulkDefault?: boolean }
  ): Promise<{ message: string }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/slots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return parseJson<{ message: string }>(res);
  },

  async updateAdminSlotStatus(token: string, slotId: number, status: "open" | "blocked"): Promise<void> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/slots/${slotId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    await parseJson(res);
  },

  async deleteAdminSlot(token: string, slotId: number): Promise<void> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/slots/${slotId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await parseJson(res);
  },

  async getAdminBookings(token: string): Promise<BookingRecord[]> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await parseJson<{ data: BookingRecord[] }>(res);
    return json.data || [];
  },

  async reviewAdminBooking(
    token: string,
    bookingId: number,
    payload: { decision: "approve" | "reject"; adminNote?: string; bookingFee?: number }
  ): Promise<{ message: string }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/bookings/${bookingId}/review`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return parseJson<{ message: string }>(res);
  },

  async updateAdminBookingStatus(
    token: string,
    bookingId: number,
    status: BookingStatus
  ): Promise<void> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    await parseJson(res);
  },

  async sendAdminMeetingDetails(
    token: string,
    bookingId: number,
    payload: { meetingLink: string; joiningDetails: string }
  ): Promise<{ message: string; data: { id: number; payment_verified: number; meeting_link: string; joining_details: string } }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/bookings/${bookingId}/meeting`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return parseJson(res);
  },

  async updateWebsiteLogo(token: string, logoUrl: string): Promise<{ logoUrl: string }> {
    const res = await fetch(`${getOriginBase()}/api/solarharvest/admin/logo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ logoUrl }),
    });
    const json = await parseJson<{ data: { logoUrl: string } }>(res);
    return json.data;
  },

  async submitContactMessage(payload: { name: string; email: string; message: string }): Promise<void> {
    const res = await fetch(`${getOriginBase()}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await parseJson(res);
  },
};
