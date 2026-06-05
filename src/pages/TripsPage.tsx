import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCat,
  faChevronLeft,
  faCircleCheck,
  faCopy,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { type TripData, useApp } from "../context/AppContext";
import { TemplateSelector } from "../components/TemplateSelector";
import { generateId } from "../utils/id";
import { formatDate } from "../utils/date";
import type { Trip, TripType, ChecklistItem, Template } from "../types";
import { useTranslation } from "react-i18next";

interface Props {
  onSelectTrip: (tripId: string) => void;
  defaultSkipPreparation?: boolean;
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
type TripInfoForm = {
  name: string;
  startDate: string;
  endDate: string;
  country: string;
  tripType: TripType;
  tags: string;
};
type TripInfoFormErrors = Partial<Record<"name" | "startDate", string>>;

const emptyTripInfoForm: TripInfoForm = {
  name: "",
  startDate: "",
  endDate: "",
  country: "",
  tripType: "",
  tags: "",
};

function formatTripDateRange(startDate: string, endDate: string) {
  if (!endDate || startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function TripsPage({ onSelectTrip, defaultSkipPreparation }: Props) {
  const { t } = useTranslation();
  const {
    state,
    addTrip,
    setTemplate,
    setSharedTripData,
    setUserTripData,
    getTripData,
    getUserColor,
    isTripAdmin,
    updateTrip,
    showToast,
  } = useApp();
  const [step, setStep] = useState<Step>("list");
  const [cloneSourceTripId, setCloneSourceTripId] = useState<string | null>(
    null,
  );
  const [openTripMenuId, setOpenTripMenuId] = useState<string | null>(null);
  const [createSkipsPreparation, setCreateSkipsPreparation] = useState(false);

  // Stored from template selection step
  const [pendingChecklist, setPendingChecklist] = useState<ChecklistItem[]>([]);
  const [pendingNotes, setPendingNotes] = useState("");

  // Trip info form
  const [form, setForm] = useState<TripInfoForm>(emptyTripInfoForm);
  const [formErrors, setFormErrors] = useState<TripInfoFormErrors>({});

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
    setCreateSkipsPreparation(false);
    setStep("info");
  }

  function handleSkipPreparation() {
    setCloneSourceTripId(null);
    setCreateSkipsPreparation(true);
    setPendingChecklist([]);
    setPendingNotes("");
    setFormErrors({});
    setStep("info");
  }

  function startCreateTrip() {
    setCloneSourceTripId(null);
    setCreateSkipsPreparation(!!defaultSkipPreparation);
    setForm(emptyTripInfoForm);
    setFormErrors({});
    setPendingChecklist([]);
    setPendingNotes("");
    setStep(defaultSkipPreparation ? "info" : "template");
  }

  function startCloneTrip(trip: Trip) {
    setOpenTripMenuId(null);
    setCloneSourceTripId(trip.id);
    setCreateSkipsPreparation(false);
    setPendingChecklist([]);
    setPendingNotes("");
    setFormErrors({});
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      country: trip.country,
      tripType: trip.tripType,
      tags: trip.tags.join(", "),
    });
    setStep("info");
  }

  function clearFormError(field: keyof TripInfoFormErrors) {
    setFormErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
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
    const name = form.name.trim();
    const startDate = form.startDate;
    const errors: TripInfoFormErrors = {};
    if (!name) errors.name = t("trips.errors.nameRequired");
    if (!startDate) errors.startDate = t("trips.errors.startDateRequired");
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!state.auth.currentUser) {
      showToast({
        type: "error",
        message: t("trips.createFailed"),
      });
      return;
    }

    const tripId = generateId();
    const userId = state.auth.currentUser.id;
    const cloneSourceTrip = cloneSourceTripId
      ? state.trips.find((trip) => trip.id === cloneSourceTripId)
      : null;
    const cloneSourceData = cloneSourceTrip
      ? getTripData(cloneSourceTrip.id)
      : null;
    const trip: Trip = {
      id: tripId,
      name,
      startDate,
      endDate: form.endDate || startDate,
      country: form.country,
      tripType: form.tripType,
      members: ensureMemberIncluded([], userId),
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
      ...(cloneSourceTrip?.memoriesVisibleToViewers !== undefined
        ? { memoriesVisibleToViewers: cloneSourceTrip.memoriesVisibleToViewers }
        : {}),
    };

    try {
      await addTrip(trip);
      if (cloneSourceData) {
        await setSharedTripData(tripId, cloneTripSharedData(cloneSourceData));
        await setUserTripData(tripId, cloneTripUserData(cloneSourceData));
      } else {
        await setSharedTripData(tripId, {
          schedule: [],
          scheduleNotes: [],
          flights: [],
          hotels: [],
          transport: [],
        });
        await setUserTripData(tripId, {
          checklist: createSkipsPreparation ? [] : pendingChecklist,
          shopping: [],
          preparationNotes: createSkipsPreparation ? "" : pendingNotes,
          setupComplete: true,
          skipPreparation: createSkipsPreparation,
          gotReady: false,
        });
      }
    } catch {
      showToast({
        type: "error",
        message: t("trips.createFailed"),
      });
      return;
    }

    // Reset
    setForm(emptyTripInfoForm);
    setFormErrors({});
    setPendingChecklist([]);
    setPendingNotes("");
    setCloneSourceTripId(null);
    setCreateSkipsPreparation(false);
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
            <h1 className="text-lg font-bold">
              {t("trips.choosePreparation")}
            </h1>
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
            <button
              className="text-sky-600"
              onClick={() => {
                if (cloneSourceTripId) {
                  setCloneSourceTripId(null);
                  setStep("list");
                } else if (createSkipsPreparation) {
                  setCreateSkipsPreparation(false);
                  setStep("list");
                } else {
                  setStep("template");
                }
              }}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h1 className="text-lg font-bold">{t("trips.info")}</h1>
          </div>
          <div className="w-12" />
        </div>

        <div className="form-group">
          <label className="form-label">{t("trips.nameRequired")}</label>
          <input
            className={`form-input ${formErrors.name ? "has-error" : ""}`}
            value={form.name}
            aria-invalid={!!formErrors.name}
            aria-describedby={formErrors.name ? "trip-name-error" : undefined}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (formErrors.name) clearFormError("name");
            }}
          />
          {formErrors.name && (
            <p id="trip-name-error" className="form-error">
              {formErrors.name}
            </p>
          )}
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
              className={`form-input ${formErrors.startDate ? "has-error" : ""}`}
              type="date"
              value={form.startDate}
              aria-invalid={!!formErrors.startDate}
              aria-describedby={
                formErrors.startDate ? "trip-start-date-error" : undefined
              }
              onChange={(e) => {
                setForm({ ...form, startDate: e.target.value });
                if (formErrors.startDate) clearFormError("startDate");
              }}
            />
            {formErrors.startDate && (
              <p id="trip-start-date-error" className="form-error">
                {formErrors.startDate}
              </p>
            )}
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
        <button className="btn-round-add" onClick={startCreateTrip}>
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
            <div className="flex justify-between mt-1.5 gap-2">
              <div className="flex items-center gap-1">
                {trip.members.length > 1 &&
                  trip.members.map((userId) => (
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
              <div className="trip-list-actions">
                {isTripAdmin(trip) && (
                  <button
                    className={`trip-list-action-btn ${trip.isCompleted ? "active" : "inactive"}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCompleted(trip);
                    }}
                    title={
                      trip.isCompleted
                        ? t("trips.markIncomplete")
                        : t("trips.markComplete")
                    }
                    aria-label={
                      trip.isCompleted
                        ? t("trips.markIncomplete")
                        : t("trips.markComplete")
                    }
                  >
                    <FontAwesomeIcon icon={faCircleCheck} />
                  </button>
                )}
                <div className="trip-list-menu">
                  <button
                    className="trip-list-action-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenTripMenuId((current) =>
                        current === trip.id ? null : trip.id,
                      );
                    }}
                    title={t("trips.cloneMenu")}
                    aria-label={t("trips.cloneMenu")}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                  {openTripMenuId === trip.id && (
                    <>
                      <div
                        className="trip-list-menu-backdrop"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenTripMenuId(null);
                        }}
                      />
                      <div
                        className="trip-list-menu-popover"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          className="trip-list-menu-item"
                          onClick={() => startCloneTrip(trip)}
                        >
                          {t("trips.cloneFromTemplate")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureMemberIncluded(members: string[], userId: string) {
  return members.includes(userId) ? members : [...members, userId];
}

function cloneTripSharedData(tripData: TripData) {
  return cloneValue({
    schedule: tripData.schedule,
    scheduleNotes: tripData.scheduleNotes,
    flights: tripData.flights,
    hotels: tripData.hotels,
    transport: tripData.transport,
    memories: tripData.memories,
  });
}

function cloneTripUserData(tripData: TripData) {
  return cloneValue({
    checklist: tripData.checklist,
    shopping: tripData.shopping,
    preparationNotes: tripData.preparationNotes,
    setupComplete: tripData.setupComplete,
    skipPreparation: tripData.skipPreparation,
    gotReady: tripData.gotReady,
  });
}
