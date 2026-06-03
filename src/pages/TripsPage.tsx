import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCat,
  faChevronLeft,
  faCircleCheck,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../context/AppContext";
import { TemplateSelector } from "../components/TemplateSelector";
import { generateId } from "../utils/id";
import { formatDate } from "../utils/date";
import type { Trip, TripType, ChecklistItem, Template } from "../types";
import { useTranslation } from "react-i18next";

interface Props {
  onSelectTrip: (tripId: string) => void;
}

type FilledTripType = Exclude<TripType, "">;

const tripTypes: FilledTripType[] = ["情侶", "朋友", "家人", "獨旅"];
const tripTypeLabelKeys: Record<FilledTripType, string> = {
  情侶: "trips.types.couple",
  朋友: "trips.types.friends",
  家人: "trips.types.family",
  獨旅: "trips.types.solo",
};

type Step = "list" | "template" | "info";

function formatTripDateRange(startDate: string, endDate: string) {
  if (!endDate || startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function TripsPage({ onSelectTrip }: Props) {
  const { t } = useTranslation();
  const {
    state,
    addTrip,
    setTemplate,
    setSharedTripData,
    setUserTripData,
    getUserColor,
    isTripAdmin,
    updateTrip,
    showToast,
  } = useApp();
  const [step, setStep] = useState<Step>("list");

  // Stored from template selection step
  const [pendingChecklist, setPendingChecklist] = useState<ChecklistItem[]>([]);
  const [pendingNotes, setPendingNotes] = useState("");

  // Trip info form
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    country: "",
    tripType: "" as TripType,
    tags: "",
  });

  const sortedTrips = [...state.trips].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );
  const currentUserId = state.auth.currentUser?.id;
  const visibleTrips = currentUserId
    ? sortedTrips.filter((trip) => trip.members.includes(currentUserId))
    : [];

  async function handleTemplateConfirm(
    checklist: ChecklistItem[],
    notes: string,
    updatedTemplate: Template | null,
  ) {
    if (updatedTemplate) {
      try {
        await setTemplate(updatedTemplate);
      } catch {
        showToast({
          type: "error",
          message: t("settings.template.syncFailed"),
        });
        return;
      }
    }

    setPendingChecklist(checklist);
    setPendingNotes(notes);
    setStep("info");
  }

  function handleSkipPreparation() {
    setPendingChecklist([]);
    setPendingNotes("");
    setStep("info");
  }

  function toggleCompleted(trip: Trip) {
    if (!isTripAdmin(trip)) return;
    if (trip.isCompleted) {
      void updateTrip(trip, {
        isCompleted: false,
        completedAt: "",
        completedBy: "",
      });
      return;
    }

    if (!state.auth.currentUser) return;
    void updateTrip(trip, {
      isCompleted: true,
      completedAt: new Date().toISOString(),
      completedBy: state.auth.currentUser.id,
    });
  }

  async function handleCreate() {
    if (!form.name || !form.startDate || !state.auth.currentUser) return;

    const tripId = generateId();
    const userId = state.auth.currentUser.id;
    const trip: Trip = {
      id: tripId,
      name: form.name,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      country: form.country,
      tripType: form.tripType,
      members: [userId],
      creatorId: userId,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      createdAt: new Date().toISOString(),
      gotReady: false,
      isCompleted: false,
    };

    try {
      await addTrip(trip);
      await setSharedTripData(tripId, {
        schedule: [],
        scheduleNotes: [],
        flights: [],
        hotels: [],
        transport: [],
      });
      await setUserTripData(tripId, {
        checklist: pendingChecklist,
        shopping: [],
        preparationNotes: pendingNotes,
        setupComplete: true,
      });
    } catch {
      showToast({
        type: "error",
        message: t("trips.createFailed"),
      });
      return;
    }

    // Reset
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      country: "",
      tripType: "",
      tags: "",
    });
    setPendingChecklist([]);
    setPendingNotes("");
    setStep("list");
    onSelectTrip(tripId);
  }

  // === TEMPLATE SELECTION STEP ===
  if (step === "template") {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <div className="page-title-group">
            <button className="text-sky-600" onClick={() => setStep("list")}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h1 className="text-lg font-bold">{t("trips.choosePreparation")}</h1>
          </div>
          <div className="w-8" />
        </div>
        <button
          className="btn btn-secondary w-full mb-4"
          onClick={handleSkipPreparation}
        >
          {t("trips.skipPreparation")}
        </button>
        <TemplateSelector
          template={state.template}
          onConfirm={handleTemplateConfirm}
          confirmWithUpdateLabel={t("trips.updateTemplateAndNext")}
          confirmLabel={t("trips.nextArrow")}
        />
      </div>
    );
  }

  // === TRIP INFO STEP ===
  if (step === "info") {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <div className="page-title-group">
            <button className="text-sky-600" onClick={() => setStep("template")}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h1 className="text-lg font-bold">{t("trips.info")}</h1>
          </div>
          <div className="w-12" />
        </div>

        <div className="form-group">
          <label className="form-label">{t("trips.nameRequired")}</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{t("trips.country")}</label>
          <input
            className="form-input"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="form-label">{t("trips.startDateRequired")}</label>
            <input
              className="form-input"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t("trips.endDate")}</label>
            <input
              className="form-input"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">{t("trips.type")}</label>
          <div className="flex gap-2 flex-wrap">
            {tripTypes.map((tripType) => (
              <button
                key={tripType}
                className={`btn btn-sm ${form.tripType === tripType ? "btn-primary" : "btn-secondary"}`}
                onClick={() =>
                  setForm({
                    ...form,
                    tripType: form.tripType === tripType ? "" : tripType,
                  })
                }
              >
                {t(tripTypeLabelKeys[tripType])}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">{t("trips.tagsCommaSeparated")}</label>
          <input
            className="form-input"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>
        <button className="btn btn-primary w-full mt-2" onClick={handleCreate}>
          {t("trips.create")}
        </button>
      </div>
    );
  }

  // === TRIP LIST ===
  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t("nav.trips")}</h1>
        <button className="btn-round-add" onClick={() => setStep("template")}>
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>

      {visibleTrips.length === 0 ? (
        <div className="empty-state">
          <p className="text-4xl mb-2">
            <FontAwesomeIcon icon={faCat} />
          </p>
          <p>{t("trips.empty")}</p>
        </div>
      ) : (
        visibleTrips.map((trip) => (
          <div
            key={trip.id}
            className="card trip-list-card !p-3 cursor-pointer"
            onClick={() => onSelectTrip(trip.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-base">{trip.name}</h3>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {formatTripDateRange(trip.startDate, trip.endDate)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {trip.country && (
                <span className="tag tag-country">{trip.country}</span>
              )}
              {trip.tripType && (
                <span className="tag tag-type">
                  {t(tripTypeLabelKeys[trip.tripType])}
                </span>
              )}
              {trip.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            {trip.members.length > 1 && (
              <div className="flex items-center gap-1 mt-1.5">
                {trip.members.map((userId) => (
                  <span
                    key={userId}
                    className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center"
                    style={{ backgroundColor: getUserColor(userId) }}
                  >
                    {(
                      state.users.find((u) => u.id === userId)?.displayName ||
                      "?"
                    ).charAt(0)}
                  </span>
                ))}
              </div>
            )}
            {isTripAdmin(trip) && (
              <button
                className={`trip-complete-btn ${trip.isCompleted ? "active" : "inactive"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleCompleted(trip);
                }}
                title={trip.isCompleted ? t("trips.markIncomplete") : t("trips.markComplete")}
                aria-label={trip.isCompleted ? t("trips.markIncomplete") : t("trips.markComplete")}
              >
                <FontAwesomeIcon icon={faCircleCheck} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
