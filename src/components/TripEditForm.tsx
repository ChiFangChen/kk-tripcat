import { useState } from "react";
import type { Trip } from "../types";

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
