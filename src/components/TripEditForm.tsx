import { useState } from "react";
import type { Trip, TripType } from "../types";
import { useTranslation } from "react-i18next";

const tripTypes: TripType[] = ["情侶", "朋友", "家人", "獨旅"];
const tripTypeLabelKeys: Record<TripType, string> = {
  情侶: "trips.types.couple",
  朋友: "trips.types.friends",
  家人: "trips.types.family",
  獨旅: "trips.types.solo",
};

interface Props {
  trip: Trip;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}

export function TripEditForm({ trip, onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    country: trip.country,
    tripTypes: trip.tripTypes,
    tags: trip.tags.join(", "),
  });

  return (
    <div>
      <div className="form-group">
        <label className="form-label">{t("trips.tripName")}</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">{t("trips.startDate")}</label>
          <input
            className="form-input"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </div>
        <div className="form-group flex-1">
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
        <label className="form-label">{t("trips.country")}</label>
        <input
          className="form-input"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("trips.type")}</label>
        <div className="flex gap-2 flex-wrap">
          {tripTypes.map((type) => (
            <button
              key={type}
              className={`btn btn-sm ${form.tripTypes.includes(type) ? "btn-primary" : "btn-secondary"}`}
              onClick={() =>
                setForm({
                  ...form,
                  tripTypes: toggleTripType(form.tripTypes, type),
                })
              }
              type="button"
            >
              {t(tripTypeLabelKeys[type])}
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
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} type="button">
          {t("common.cancel")}
        </button>
        <button
          className="btn btn-primary"
          onClick={() =>
            onSave({
              ...trip,
              name: form.name,
              startDate: form.startDate,
              endDate: form.endDate || form.startDate,
              country: form.country,
              tripTypes: form.tripTypes,
              tags: form.tags
                ? form.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                : [],
            })
          }
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}

function toggleTripType(selected: TripType[], tripType: TripType) {
  return selected.includes(tripType)
    ? selected.filter((item) => item !== tripType)
    : [...selected, tripType];
}
