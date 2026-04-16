import { useState } from "react";
import type { Trip, TripType } from "../types";
import { formatDate } from "../utils/date";

const tripTypes: TripType[] = ["情侶", "朋友", "家人", "獨旅"];

function toIsoDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return value;

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

interface Props {
  trip: Trip;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}

export function TripEditForm({ trip, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    name: trip.name,
    startDate: formatDate(trip.startDate),
    endDate: formatDate(trip.endDate),
    country: trip.country,
    tripType: trip.tripType,
    tags: trip.tags.join(", "),
  });

  return (
    <div>
      <div className="form-group">
        <label className="form-label">旅程名稱</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">開始日期</label>
          <input
            className="form-input"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            placeholder="2026/4/9"
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">結束日期</label>
          <input
            className="form-input"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            placeholder="2026/4/9"
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">國家</label>
        <input
          className="form-input"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">旅行類型</label>
        <div className="flex gap-2 flex-wrap">
          {tripTypes.map((type) => (
            <button
              key={type}
              className={`btn btn-sm ${form.tripType === type ? "btn-primary" : "btn-secondary"}`}
              onClick={() =>
                setForm({
                  ...form,
                  tripType: form.tripType === type ? "" : type,
                })
              }
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">標籤（逗號分隔）</label>
        <input
          className="form-input"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
        />
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} type="button">
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={() =>
            onSave({
              ...trip,
              name: form.name,
              startDate: toIsoDate(form.startDate),
              endDate: toIsoDate(form.endDate) || toIsoDate(form.startDate),
              country: form.country,
              tripType: form.tripType,
              tags: form.tags
                ? form.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                : [],
            })
          }
        >
          儲存
        </button>
      </div>
    </div>
  );
}
