import { useState } from "react";
import type { Trip, TripType } from "../types";

const tripTypes: TripType[] = ["情侶", "朋友", "家人", "獨旅"];

interface Props {
  trip: Trip;
  onSave: (trip: Trip) => void;
  onCancel: () => void;
}

export function TripEditForm({ trip, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
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
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">結束日期</label>
          <input
            className="form-input"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
              startDate: form.startDate,
              endDate: form.endDate || form.startDate,
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
