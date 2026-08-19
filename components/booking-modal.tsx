"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { X, Clock, User, Check } from "lucide-react";
import { supabase, type Service, type Stylist, type TimeSlot } from "@/lib/supabase";
import { normalizeServices } from "@/lib/normalize-service";
import {
  BOOKING_TIMEZONE,
  addCalendarDaysToYmd,
  computeEndTimeFromStartAndDuration,
  formatBookingDateLong,
  formatBookingTimeHm,
  formatBookingWeekdayShort,
  getTodayYmdInBookingTz,
} from "@/lib/booking-time";
import { randomBookingId } from "@/lib/random-booking-id";
import { normalizeSkMobilePhone } from "@/lib/booking-phone";

type BookingStep = "service" | "stylist" | "datetime" | "phone" | "info";

type BookingConfirmation = {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  stylistName: string;
  dateYmd: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  notes: string | null;
};

const STEPS: BookingStep[] = ["service", "stylist", "datetime", "phone", "info"];

const CHIP_BASE =
  "min-h-[44px] rounded-lg border text-left transition-colors duration-200 touch-manipulation";
const CHIP_IDLE =
  "border-[#2a2a2a] bg-[#1a1a1a] text-[#f5f0e8] hover:border-[#b88a3a]/50 active:border-[#b88a3a]";
const CHIP_ACTIVE = "border-[#b88a3a] bg-[#b88a3a]/15 text-[#f0e68c] ring-1 ring-[#b88a3a]/40";

const TEXTS = {
  en: {
    title: "Book appointment",
    selectService: "Choose service",
    selectStylist: "Your artist",
    selectDateTime: "Date & time",
    selectPhone: "Your mobile (Slovakia)",
    phoneHint: "Slovak mobile only: 09XX XXX XXX or +421 9XX XXX XXX.",
    phoneContinue: "Continue",
    yourInfo: "Your details",
    back: "Back",
    bookNow: "Confirm booking",
    name: "Full name",
    notesLabel: "Notes",
    notesPlaceholder: "Any requests?",
    success: "You're booked",
    successMsg: "We'll confirm with you shortly.",
    successHint: "Screenshot this summary and show it at the salon.",
    successRef: "Booking reference",
    successYourName: "Name",
    successPhone: "Phone",
    successService: "Service",
    successStylist: "Artist",
    successWhen: "Date & time",
    successDuration: "Duration",
    successTotal: "Total",
    successNotes: "Notes",
    successTimezone: `Times: Slovakia (${BOOKING_TIMEZONE})`,
    successClose: "Close",
    timesNote: "Times are in Slovakia (Košice).",
    noStylists: "No team member is assigned to this service yet.",
    availableTimes: "Available times",
    loadingSlots: "Loading…",
    noSlots: "No slots this day",
    noServices: "No services in this category.",
    bookingSaveFailed: "Could not save your booking",
    serviceLabel: "Service",
    stylistLabel: "Artist",
    whenLabel: "When",
    phoneLabel: "Phone",
    totalLabel: "Total",
    mobileLabel: "Mobile number",
  },
  sk: {
    title: "Objednať sa",
    selectService: "Výber služby",
    selectStylist: "Váš špecialista",
    selectDateTime: "Dátum a čas",
    selectPhone: "Váš mobil (Slovensko)",
    phoneHint: "Iba slovenské mobilné číslo: 09XX XXX XXX alebo +421 9XX XXX XXX.",
    phoneContinue: "Pokračovať",
    yourInfo: "Údaje",
    back: "Späť",
    bookNow: "Potvrdiť",
    name: "Meno",
    notesLabel: "Poznámka",
    notesPlaceholder: "Požiadavky?",
    success: "Objednané",
    successMsg: "Čoskoro vás budeme kontaktovať.",
    successHint: "Urobte snímku obrazovky a ukážte ju v salóne.",
    successRef: "Číslo objednávky",
    successYourName: "Meno",
    successPhone: "Telefón",
    successService: "Služba",
    successStylist: "Špecialista",
    successWhen: "Dátum a čas",
    successDuration: "Trvanie",
    successTotal: "Spolu",
    successNotes: "Poznámka",
    successTimezone: `Čas: Slovensko (${BOOKING_TIMEZONE})`,
    successClose: "Zavrieť",
    timesNote: "Časy sú podľa času na Slovensku (Košice).",
    noStylists: "Pre túto službu nie je priradený člen tímu.",
    availableTimes: "Voľné časy",
    loadingSlots: "Načítavam…",
    noSlots: "Žiadne termíny",
    noServices: "Žiadne dostupné služby.",
    bookingSaveFailed: "Objednávku sa nepodarilo uložiť",
    serviceLabel: "Služba",
    stylistLabel: "Špecialista",
    whenLabel: "Termín",
    phoneLabel: "Telefón",
    totalLabel: "Spolu",
    mobileLabel: "Mobilné číslo",
  },
} as const;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "en" | "sk";
}

export function BookingModal({ isOpen, onClose, lang = "en" }: BookingModalProps) {
  const [step, setStep] = useState<BookingStep>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [submitError, setSubmitError] = useState("");
  const submitInFlight = useRef(false);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) {
        console.error("[BookingModal]", error.message);
        setServices([]);
        return;
      }
      setServices(normalizeServices(data ?? []));
    } catch (e) {
      console.error("[BookingModal] fetchServices", e);
      setServices([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setStep("service");
    setSelectedService(null);
    setSelectedStylist(null);
    setSelectedDate("");
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setPhoneError("");
    setBookingSuccess(false);
    setConfirmation(null);
    setSubmitError("");
    setStylists([]);
    setAvailableSlots([]);
    setLoading(false);
    submitInFlight.current = false;
    void fetchServices();
  }, [isOpen, fetchServices]);

  const servicesInCategory = useMemo(
    () => services,
    [services]
  );

  const fetchStylistsForService = async (serviceId: string) => {
    setLoading(true);
    try {
      const { data: links } = await supabase
        .from("stylist_services")
        .select("stylist_id")
        .eq("service_id", serviceId);

      if (!links?.length) {
        setStylists([]);
        return;
      }

      const ids = [...new Set(links.map((l) => l.stylist_id))];
      const { data: stylistRows } = await supabase
        .from("stylists")
        .select("*")
        .in("id", ids)
        .eq("is_active", true)
        .order("name");

      setStylists((stylistRows ?? []) as Stylist[]);
    } catch (e) {
      console.error("[BookingModal] fetchStylistsForService", e);
      setStylists([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (stylistId: string, date: string) => {
    if (!selectedService) return;

    setLoading(true);
    try {
      const { data } = await supabase.rpc("get_available_slots", {
        p_stylist_id: stylistId,
        p_date: date,
        p_duration_minutes: Number(selectedService.duration_minutes) || 0,
      });

      if (data) setAvailableSlots(data);
    } catch (e) {
      console.error("[BookingModal] fetchAvailableSlots", e);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep("stylist");
    fetchStylistsForService(service.id);
  };

  const handleStylistSelect = (stylist: Stylist) => {
    setSelectedStylist(stylist);
    setStep("datetime");
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (selectedStylist) {
      fetchAvailableSlots(selectedStylist.id, date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("phone");
  };

  const handlePhoneContinue = () => {
    setPhoneError("");
    const normalized = normalizeSkMobilePhone(customerPhone);
    if (!normalized) {
      setPhoneError(
        lang === "sk"
          ? "Zadajte slovenské mobilné číslo (napr. 0912 345 678 alebo +421 912 345 678)."
          : "Enter a Slovak mobile number (e.g. 0912 345 678 or +421 912 345 678)."
      );
      return;
    }
    setCustomerPhone(normalized);
    setStep("info");
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedStylist || !selectedDate || !selectedTime) {
      setSubmitError(
        lang === "sk" ? "Chýba výber služby, špecialistu alebo času." : "Missing service, stylist, or time selection."
      );
      return;
    }
    if (!customerName.trim()) {
      setSubmitError(lang === "sk" ? "Zadajte svoje meno." : "Please enter your name.");
      return;
    }
    const normalizedPhone = normalizeSkMobilePhone(customerPhone);
    if (!normalizedPhone) {
      setPhoneError(
        lang === "sk"
          ? "Zadajte slovenské mobilné číslo (napr. 0912 345 678 alebo +421 912 345 678)."
          : "Enter a Slovak mobile number (e.g. 0912 345 678 or +421 912 345 678)."
      );
      setSubmitError(
        lang === "sk" ? "Neplatné telefónne číslo." : "Invalid phone number."
      );
      return;
    }
    if (submitInFlight.current) return;
    submitInFlight.current = true;

    setLoading(true);
    setSubmitError("");

    const normalizeTime = (t: string) =>
      t.length >= 8 ? t.substring(0, 8) : `${t.substring(0, 5)}:00`;

    try {
      const dur = Number(selectedService.duration_minutes) || 0;
      const endTimeRaw = computeEndTimeFromStartAndDuration(selectedTime, dur);
      const bookingId = randomBookingId();

      let res: Response;
      let rawError = "";
      let payload: { error?: string; id?: string } = {};
      try {
        res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: bookingId,
            customer_name: customerName.trim(),
            customer_phone: customerPhone,
            service_id: selectedService.id,
            stylist_id: selectedStylist.id,
            booking_date: selectedDate,
            start_time: normalizeTime(selectedTime),
            end_time: normalizeTime(endTimeRaw),
            notes: notes.trim() || null,
            lang,
          }),
        });
        payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          id?: string;
        };
        rawError = JSON.stringify(payload);
        console.log("[Booking] Response:", res.status, payload);
      } catch {
        setSubmitError(
          lang === "sk"
            ? "Sieťová chyba. Skúste znova alebo zavolajte do salónu."
            : "Network error. Try again or call the salon."
        );
        submitInFlight.current = false;
        return;
      }

      if (!res.ok || !payload.id) {
        setSubmitError(
          payload.error ||
            `Error ${res.status}: ${rawError}` ||
            (lang === "sk"
              ? "Objednávku sa nepodarilo uložiť."
              : "Could not complete your booking.")
        );
        submitInFlight.current = false;
        return;
      }

      fetch("/api/notify-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: payload.id,
          customerName: customerName.trim(),
          customerPhone,
          serviceName: selectedService.name,
          stylistName: selectedStylist.name,
          bookingDate: selectedDate,
          startTime: selectedTime,
          endTime: endTimeRaw,
          durationMinutes: dur,
          price: selectedService.price,
          notes: notes.trim() || null,
          lang,
        }),
      }).catch(() => {});

      setConfirmation({
        id: payload.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone,
        serviceName: selectedService.name,
        stylistName: selectedStylist.name,
        dateYmd: selectedDate,
        startTime: selectedTime,
        endTime: endTimeRaw,
        durationMinutes: dur,
        price: selectedService.price,
        notes: notes.trim() || null,
      });
      setBookingSuccess(true);
    } catch (err) {
      console.error("[BookingModal] submit", err);
      setSubmitError(
        lang === "sk"
          ? "Neočakávaná chyba. Obnovte stránku alebo zavolajte do salónu."
          : "Something went wrong. Refresh the page or call the salon."
      );
    } finally {
      setLoading(false);
      submitInFlight.current = false;
    }
  };

  const resetAndClose = () => {
    setStep("service");
    setSelectedService(null);
    setSelectedStylist(null);
    setSelectedDate("");
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setPhoneError("");
    setBookingSuccess(false);
    setConfirmation(null);
    setSubmitError("");
    setStylists([]);
    setAvailableSlots([]);
    onClose();
  };

  const availableDates = useMemo(() => {
    const today = getTodayYmdInBookingTz();
    return Array.from({ length: 14 }, (_, i) => addCalendarDaysToYmd(today, i));
  }, []);

  const formatDateChip = useCallback(
    (dateStr: string) => formatBookingWeekdayShort(dateStr, lang),
    [lang]
  );

  if (!isOpen) return null;

  const t = TEXTS[lang];
  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/90 backdrop-blur-[3px]"
        aria-label="Close"
        onClick={resetAndClose}
      />

      <div
        className="relative z-10 flex h-[100dvh] w-full max-h-[100dvh] flex-col overflow-hidden border-2 border-[#b88a3a] bg-gradient-to-b from-[#1a1a1a] via-[#b88a3a]/15 to-[#1a1a1a] shadow-2xl shadow-[#b88a3a]/40 sm:h-auto sm:max-h-[min(88dvh,760px)] sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-[#b88a3a]/60 bg-gradient-to-b from-[#2a2a2a] via-[#252525] to-[#1a1a1a] px-4 py-4 sm:px-6">
          <div>
            <p className="font-be text-[10px] uppercase tracking-[0.35em] text-[#f0e68c]">
              Be. Hair &amp; Barber
            </p>
            <h2
              id="booking-modal-title"
              className="font-be text-lg font-semibold tracking-wide text-[#f5f0e8] sm:text-xl"
            >
              {bookingSuccess ? t.success : t.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-[#b88a3a] bg-[#222] text-[#f0e68c] transition-all hover:border-[#f0e68c] hover:text-[#f0e68c] hover:bg-[#b88a3a]/25 hover:shadow-[0_0_30px_rgba(184,138,58,0.6)]"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>

        {!bookingSuccess && (
          <div className="shrink-0 border-b-2 border-[#b88a3a]/60 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a]/80 px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-1">
              {STEPS.map((s, i) => {
                const done = stepIndex > i;
                const active = step === s;
                return (
                  <div key={s} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5 w-full min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                          active
                            ? "be-gold-gradient text-[#0a0a0a] shadow-lg shadow-[#b88a3a]/60 ring-2 ring-[#f0e68c]"
                            : done
                              ? "border-2 border-[#b88a3a]/80 bg-[#b88a3a]/25 text-[#f0e68c]"
                              : "border border-[#2a2a2a] bg-[#1a1a1a] text-[#6b6b6b]"
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
                      </div>
                      <span
                        className={`hidden text-[9px] uppercase tracking-wider sm:block truncate w-full text-center ${
                          active ? "text-[#f0e68c] font-semibold" : "text-[#6b6b6b]"
                        }`}
                      >
                        {s === "service" && (lang === "sk" ? "Služba" : "Service")}
                        {s === "stylist" && (lang === "sk" ? "Človek" : "Artist")}
                        {s === "datetime" && (lang === "sk" ? "Čas" : "Time")}
                        {s === "phone" && (lang === "sk" ? "Mobil" : "Phone")}
                        {s === "info" && (lang === "sk" ? "Údaje" : "Info")}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`mx-0.5 h-px w-full min-w-[8px] max-w-[24px] shrink ${
                          stepIndex > i ? "bg-[#b88a3a]/80" : "bg-[#2a2a2a]"
                        }`}
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-5 sm:px-6 sm:py-6">
              {bookingSuccess && confirmation ? (
                <div className="space-y-6 pb-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full be-gold-gradient shadow-lg shadow-[#b88a3a]/40 ring-2 ring-[#b88a3a]/60">
                      <Check className="h-8 w-8 text-[#0a0a0a]" strokeWidth={2.5} />
                    </div>
                    <p className="font-be text-xl text-[#f5f0e8]">{t.success}</p>
                    <p className="mt-1 max-w-sm text-sm leading-relaxed text-[#c8c0b0]">{t.successMsg}</p>
                    <p className="mt-3 max-w-sm text-xs font-medium leading-relaxed text-[#f0e68c]/90">
                      {t.successHint}
                    </p>
                  </div>

                  <div className="rounded-xl border-2 border-[#b88a3a]/60 bg-gradient-to-b from-[#1a1a1a] to-[#141414] p-4 text-left text-sm shadow-xl shadow-[#b88a3a]/20">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#f0e68c]">
                      {t.successRef}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-[#f0e68c]">{confirmation.id}</p>

                    <div className="mt-4 space-y-2.5 border-t-2 border-[#3a3a2a] pt-4">
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-[#8a8068]">{t.successYourName}</span>
                        <span className="text-right text-[#f5f0e8]">{confirmation.customerName}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-[#8a8068]">{t.successPhone}</span>
                        <span className="text-right text-[#f5f0e8]">{confirmation.customerPhone}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-[#8a8068]">{t.successService}</span>
                        <span className="max-w-[60%] text-right font-medium text-[#f0e68c]">
                          {confirmation.serviceName}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-[#8a8068]">{t.successStylist}</span>
                        <span className="text-right text-[#f5f0e8]">{confirmation.stylistName}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-[#8a8068]">{t.successWhen}</span>
                        <span className="text-right text-[#f5f0e8]">
                          {formatBookingDateLong(confirmation.dateYmd, lang)}
                          <br />
                          <span className="font-be text-base font-semibold text-[#f0e68c]">
                            {formatBookingTimeHm(confirmation.startTime)} – {formatBookingTimeHm(confirmation.endTime)}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-[#8a8068]">{t.successDuration}</span>
                        <span className="text-[#f5f0e8]">{confirmation.durationMinutes} min</span>
                      </div>
                      {confirmation.notes ? (
                        <div className="border-t-2 border-[#3a3a2a] pt-3">
                          <span className="text-[#8a8068]">{t.successNotes}</span>
                          <p className="mt-1 text-[#c8c0b0]">{confirmation.notes}</p>
                        </div>
                      ) : null}
                      <div className="flex justify-between border-t-2 border-[#3a3a2a] pt-3 font-be text-lg font-semibold text-[#f0e68c]">
                        <span>{t.successTotal}</span>
                        <span>{confirmation.price}€</span>
                      </div>
                    </div>

                    <p className="mt-4 text-center text-[10px] uppercase tracking-[0.15em] text-[#6b655c]">
                      {t.successTimezone}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="h-12 w-full rounded-lg be-gold-gradient text-xs font-semibold uppercase tracking-[0.2em] text-[#0a0a0a] shadow-xl shadow-[#b88a3a]/50 hover:shadow-[#b88a3a]/70 transition-shadow"
                  >
                    {t.successClose}
                  </button>
                </div>
              ) : (
            <>
              {step === "service" && (
                <div className="space-y-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f0e68c]">
                    {t.selectService}
                  </p>

                  <div className="space-y-2.5">
                    {servicesInCategory.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[#8a8068]">{t.noServices}</p>
                    ) : (
                      <>
                        {/* Special Offers - Featured Cards */}
                        {servicesInCategory
                          .filter((s) => s.category === "specials")
                          .map((service) => (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => handleServiceSelect(service)}
                              className={`${CHIP_BASE} ${CHIP_IDLE} group relative flex w-full items-start justify-between gap-3 rounded-xl border-[#b88a3a]/40 bg-gradient-to-br from-[#b88a3a]/20 via-[#1a1a1a] to-[#1a1a1a] p-4 text-left transition-all hover:border-[#b88a3a] hover:shadow-xl hover:shadow-[#b88a3a]/20`}
                            >
                              <div className="absolute -left-px -top-px h-3 w-3 rounded-br-full bg-[#b88a3a]" />
                              <div className="absolute -right-px -bottom-px h-3 w-3 rounded-tl-full bg-[#b88a3a]" />
                              <div className="min-w-0 flex-1">
                                <span className="mb-1 inline-block rounded bg-[#b88a3a]/30 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f0e68c]">
                                  ★ Special
                                </span>
                                <span className="mt-2 block font-be text-base font-bold text-[#f5f0e8]">
                                  {service.name}
                                </span>
                                {service.description ? (
                                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#b88a3a]/90">
                                    {service.description}
                                  </p>
                                ) : null}
                                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#8a8068]">
                                  <Clock className="h-3 w-3" />
                                  {service.duration_minutes} min
                                </span>
                              </div>
                              <span className="shrink-0 font-be text-xl font-bold text-[#f0e68c]">
                                {service.price}€
                              </span>
                            </button>
                          ))}

                        {/* Divider */}
                        {servicesInCategory.some((s) => s.category === "specials") &&
                          servicesInCategory.some((s) => s.category !== "specials") && (
                            <div className="relative py-2">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#2a2a2a]" />
                              </div>
                            </div>
                          )}

                        {/* Regular Services */}
                        {servicesInCategory
                          .filter((s) => s.category !== "specials")
                          .map((service) => (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => handleServiceSelect(service)}
                              className={`${CHIP_BASE} ${CHIP_IDLE} flex w-full items-start justify-between gap-3 rounded-lg p-4 text-left transition-all hover:bg-[#1a1a1a] hover:border-[#b88a3a]/70 hover:shadow-lg hover:shadow-[#b88a3a]/15`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-be text-sm font-semibold text-[#f5f0e8]">
                                  {service.name}
                                </span>
                                {service.description ? (
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#b88a3a]">
                                    {service.description}
                                  </p>
                                ) : null}
                                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#8a8068]">
                                  <Clock className="h-3 w-3" />
                                  {service.duration_minutes} min
                                </span>
                              </div>
                              <span className="shrink-0 font-be text-base font-semibold text-[#f0e68c]">
                                {service.price}€
                              </span>
                            </button>
                          ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === "stylist" && (
                <div className="space-y-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f0e68c]">
                    {t.selectStylist}
                  </p>
                  {loading ? (
                    <div className="py-16 text-center text-sm text-[#8a8068]">{t.loadingSlots}</div>
                  ) : stylists.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[#b88a3a]">{t.noStylists}</p>
                  ) : (
                    <div className="space-y-2.5">
                      {stylists.map((stylist) => (
                        <button
                          key={stylist.id}
                          type="button"
                          onClick={() => handleStylistSelect(stylist)}
                          className={`${CHIP_BASE} ${CHIP_IDLE} flex w-full items-center gap-4 p-4 transition-all hover:bg-[#1a1a1a] hover:border-[#b88a3a]/70 hover:shadow-lg hover:shadow-[#b88a3a]/15`}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#b88a3a]/50 bg-[#1a1a1a]">
                            <User className="h-6 w-6 text-[#f0e68c]" strokeWidth={1.25} />
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="font-be text-sm font-semibold text-[#f5f0e8]">
                              {stylist.name}
                            </span>
                            {stylist.specialties && stylist.specialties.length > 0 ? (
                              <p className="mt-0.5 text-xs text-[#b88a3a]">
                                {stylist.specialties.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep("service")}
                    className="w-full py-3 text-center text-xs uppercase tracking-[0.2em] text-[#f0e68c] hover:text-[#f0e68c] transition-colors"
                  >
                    {t.back}
                  </button>
                </div>
              )}

              {step === "datetime" && (
                <div className="space-y-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f0e68c]">
                    {t.selectDateTime}
                  </p>
                  <p className="text-[11px] leading-relaxed text-[#b88a3a]">{t.timesNote}</p>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {availableDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => handleDateSelect(date)}
                        className={`${CHIP_BASE} px-2 py-3 text-center text-xs font-medium transition-all hover:shadow-lg hover:shadow-[#b88a3a]/20 ${
                          selectedDate === date ? CHIP_ACTIVE : CHIP_IDLE
                        }`}
                      >
                        {formatDateChip(date)}
                      </button>
                    ))}
                  </div>

                  {selectedDate && (
                    <div>
                      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#f0e68c]">
                        {t.availableTimes}
                      </p>
                      {loading ? (
                        <div className="py-10 text-center text-sm text-[#b88a3a]">
                          {t.loadingSlots}
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot.slot_time}
                              type="button"
                              onClick={() => handleTimeSelect(slot.slot_time)}
                              className={`${CHIP_BASE} py-3 text-center text-sm font-medium transition-all hover:bg-[#1a1a1a] hover:shadow-lg hover:shadow-[#b88a3a]/15 ${CHIP_IDLE}`}
                            >
                              {slot.slot_time.substring(0, 5)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center text-sm text-[#b88a3a]">
                          {t.noSlots}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setStep("stylist")}
                    className="w-full py-3 text-center text-xs uppercase tracking-[0.2em] text-[#f0e68c] hover:text-[#f0e68c] transition-colors"
                  >
                    {t.back}
                  </button>
                </div>
              )}

              {step === "phone" && (
                <form
                  className="space-y-5 pb-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePhoneContinue();
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f0e68c]">{t.selectPhone}</p>
                  <p className="text-[11px] leading-relaxed text-[#b88a3a]">{t.phoneHint}</p>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#8a8068]">
                      {t.mobileLabel} *
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setPhoneError("");
                      }}
                      placeholder={lang === "sk" ? "napr. 0912 345 678" : "e.g. 0912 345 678"}
                      className="h-12 w-full rounded-lg border-2 border-[#2a2a2a] bg-[#1a1a1a] px-4 text-[#f5f0e8] outline-none transition-all hover:border-[#b88a3a]/60 focus:border-[#b88a3a] focus:ring-2 focus:ring-[#f0e68c]/50"
                    />
                  </label>
                  {phoneError ? (
                    <div
                      role="alert"
                      className="rounded-lg border-2 border-red-500/50 bg-red-500/15 px-3 py-2.5 text-sm text-red-200"
                    >
                      {phoneError}
                    </div>
                  ) : null}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneError("");
                        setStep("datetime");
                      }}
                      className="h-12 flex-1 rounded-lg border-2 border-[#2a2a2a] bg-[#1a1a1a] text-xs font-semibold uppercase tracking-wider text-[#c8c0b0] transition-all hover:border-[#b88a3a] hover:text-[#f0e68c] hover:shadow-lg hover:shadow-[#b88a3a]/20"
                    >
                      {t.back}
                    </button>
                    <button
                      type="submit"
                      disabled={!customerPhone.trim()}
                      className="h-12 flex-[1.35] rounded-lg be-gold-gradient text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] transition-all disabled:opacity-40 shadow-lg shadow-[#b88a3a]/40 hover:shadow-[#b88a3a]/60"
                    >
                      {t.phoneContinue}
                    </button>
                  </div>
                </form>
              )}

              {step === "info" && (
                <form
                  className="space-y-4 pb-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmit();
                  }}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-[#f0e68c]">{t.yourInfo}</p>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#8a8068]">
                      {t.name} *
                    </span>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-12 w-full rounded-lg border-2 border-[#2a2a2a] bg-[#1a1a1a] px-4 text-[#f5f0e8] outline-none transition-all hover:border-[#b88a3a]/60 focus:border-[#b88a3a] focus:ring-2 focus:ring-[#f0e68c]/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#8a8068]">
                      {t.notesLabel}
                    </span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.notesPlaceholder}
                      rows={3}
                      className="w-full resize-none rounded-lg border-2 border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-[#f5f0e8] outline-none transition-all hover:border-[#b88a3a]/60 focus:border-[#b88a3a] focus:ring-2 focus:ring-[#f0e68c]/50"
                    />
                  </label>

                  <div className="rounded-xl border-2 border-[#b88a3a]/60 bg-gradient-to-b from-[#1a1a1a] to-[#141414] p-4 text-sm shadow-xl shadow-[#b88a3a]/20">
                    <div className="flex justify-between gap-2 text-[#f0e68c]">
                      <span>{t.serviceLabel}</span>
                      <span className="max-w-[55%] text-right text-[#f5f0e8]">
                        {selectedService?.name}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between gap-2 text-[#f0e68c]">
                      <span>{t.stylistLabel}</span>
                      <span className="text-[#f5f0e8]">{selectedStylist?.name}</span>
                    </div>
                    <div className="mt-2 flex justify-between gap-2 text-[#f0e68c]">
                      <span>{t.whenLabel}</span>
                      <span className="text-right text-[#f5f0e8]">
                        {formatDateChip(selectedDate)} · {selectedTime}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between gap-2 text-[#f0e68c]">
                      <span>{t.phoneLabel}</span>
                      <span className="text-right font-mono text-sm text-[#f5f0e8]">{customerPhone}</span>
                    </div>
                    <div className="mt-3 flex justify-between border-t-2 border-[#3a3a2a] pt-3 font-be text-lg font-semibold text-[#f0e68c]">
                      <span>{t.totalLabel}</span>
                      <span>{selectedService?.price}€</span>
                    </div>
                  </div>

                  {submitError ? (
                    <div
                      role="alert"
                      className="rounded-lg border-2 border-red-500/50 bg-red-500/15 px-3 py-2.5 text-sm text-red-200"
                    >
                      <p className="font-medium">{t.bookingSaveFailed}</p>
                      <p className="mt-1 break-words text-xs opacity-90">{submitError}</p>
                    </div>
                  ) : null}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitError("");
                        setStep("phone");
                      }}
                      className="h-12 flex-1 rounded-lg border-2 border-[#2a2a2a] bg-[#1a1a1a] text-xs font-semibold uppercase tracking-wider text-[#c8c0b0] transition-all hover:border-[#b88a3a] hover:text-[#f0e68c] hover:shadow-lg hover:shadow-[#b88a3a]/20"
                    >
                      {t.back}
                    </button>
                    <button
                      type="submit"
                      disabled={!customerName.trim() || loading}
                      className="h-12 flex-[1.35] rounded-lg be-gold-gradient text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] transition-all disabled:opacity-40 shadow-xl shadow-[#b88a3a]/50 hover:shadow-[#b88a3a]/70"
                    >
                      {loading ? "…" : t.bookNow}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
