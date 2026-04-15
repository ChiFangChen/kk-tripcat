import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../utils/date";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { FullScreenModal } from "../../components/FullScreenModal";
import { InfoRow } from "../../components/InfoRow";
import { generateId } from "../../utils/id";
import type { FlightInfo, FlightLeg } from "../../types";
import { getAirportDisplay, getFlightNumberLabel } from "./flightDisplay";

interface Props {
  tripId: string;
  viewOnly?: boolean;
}

export function FlightTab({ tripId, viewOnly }: Props) {
  const { setSharedTripData, getTripData } = useApp();
  const tripData = getTripData(tripId);
  const flights = tripData.flights;
  const [editingFlight, setEditingFlight] = useState<FlightInfo | null>(null);
  const [editingLeg, setEditingLeg] = useState<FlightLeg | null>(null);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const doubleTap = useDoubleTap();

  function saveFlight(flight: FlightInfo) {
    const exists = flights.find((f) => f.id === flight.id);
    const updated = exists
      ? flights.map((f) => (f.id === flight.id ? flight : f))
      : [...flights, flight];
    setSharedTripData(tripId, { flights: updated });
    setEditingFlight(null);
  }

  function deleteFlight(id: string) {
    setSharedTripData(tripId, { flights: flights.filter((f) => f.id !== id) });
    setEditingFlight(null);
  }

  function saveLeg(flightId: string, leg: FlightLeg) {
    const updated = flights.map((f) => {
      if (f.id !== flightId) return f;
      const existingLeg = f.legs.find((l) => l.id === leg.id);
      const legs = existingLeg
        ? f.legs.map((l) => (l.id === leg.id ? leg : l))
        : [...f.legs, leg];
      return { ...f, legs };
    });
    setSharedTripData(tripId, { flights: updated });
    setEditingLeg(null);
    setEditingFlightId(null);
  }

  function deleteLeg(flightId: string, legId: string) {
    const updated = flights.map((f) => {
      if (f.id !== flightId) return f;
      return { ...f, legs: f.legs.filter((l) => l.id !== legId) };
    });
    setSharedTripData(tripId, { flights: updated });
    setEditingLeg(null);
    setEditingFlightId(null);
  }

  function newFlight(): FlightInfo {
    return { id: generateId(), airline: "", legs: [] };
  }

  function newLeg(): FlightLeg {
    return {
      id: generateId(),
      direction: "",
      date: "",
      flightNumber: "",
      departureTime: "",
      departureAirportCode: "",
      departureAirport: "",
      arrivalTime: "",
      arrivalAirportCode: "",
      arrivalAirport: "",
    };
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">航班資訊</h2>
        {!viewOnly && (
          <button
            className="btn-round-add"
            onClick={() => setEditingFlight(newFlight())}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {flights.length === 0 && (
        <div className="empty-state">
          <p>尚無航班資訊</p>
        </div>
      )}

      {flights.map((flight) => (
        <div key={flight.id} className="card">
          <div className="flex justify-between items-center w-full mb-2">
            <h3
              className="font-semibold text-sky-600 dark:text-sky-400 cursor-pointer"
              onClick={doubleTap(
                flight.id,
                () => !viewOnly && setEditingFlight(flight),
              )}
            >
              {flight.airline || "航班"}
            </h3>
          </div>

          <InfoRow label="訂位代號" value={flight.bookingCode} />
          <InfoRow label="機票號碼" value={flight.ticketNumber} />
          <InfoRow label="會員方案" value={flight.memberPlan} />
          <InfoRow label="會員卡號" value={flight.memberNumber} />
          <InfoRow label="票價" value={flight.ticketPrice} />
          <InfoRow label="託運行李" value={flight.checkedBaggage} />
          <InfoRow label="隨身行李" value={flight.carryOn} />

          {flight.legs.map((leg) => {
            const departure = getAirportDisplay(
              leg.departureAirportCode,
              leg.departureAirport,
              leg.departureTerminal,
            );
            const arrival = getAirportDisplay(
              leg.arrivalAirportCode,
              leg.arrivalAirport,
              leg.arrivalTerminal,
            );

            return (
              <div key={leg.id} className="flight-leg-card">
                <button
                  className="flight-leg-title"
                  onClick={doubleTap(leg.id, () => {
                    if (viewOnly) return;
                    setEditingLeg(leg);
                    setEditingFlightId(flight.id);
                  })}
                >
                  {leg.direction}
                </button>

                <div className="mt-2">
                  <InfoRow label="日期" value={formatDate(leg.date)} />
                  <InfoRow label="航班" value={getFlightNumberLabel(leg)} />
                  <InfoRow
                    label="起飛"
                    value={
                      <AirportTiming
                        time={leg.departureTime}
                        airport={departure}
                      />
                    }
                  />
                  <InfoRow
                    label="抵達"
                    value={
                      <AirportTiming time={leg.arrivalTime} airport={arrival} />
                    }
                  />
                  <InfoRow label="飛行時間" value={leg.duration} />
                  <InfoRow label="餐點" value={leg.meal} />
                  <InfoRow label="座位" value={leg.seat} />
                </div>
              </div>
            );
          })}

          {!viewOnly && (
            <button
              className="btn-round-add mt-3"
              onClick={() => {
                setEditingLeg(newLeg());
                setEditingFlightId(flight.id);
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" />
            </button>
          )}
        </div>
      ))}

      {editingFlight && (
        <FullScreenModal
          title={editingFlight.airline ? "編輯航班" : "新增航班"}
          onClose={() => setEditingFlight(null)}
        >
          <FlightForm
            flight={editingFlight}
            onSave={saveFlight}
            onDelete={
              editingFlight.airline
                ? () => deleteFlight(editingFlight.id)
                : undefined
            }
          />
        </FullScreenModal>
      )}

      {editingLeg && editingFlightId && (
        <FullScreenModal
          title="航段"
          onClose={() => {
            setEditingLeg(null);
            setEditingFlightId(null);
          }}
        >
          <LegForm
            leg={editingLeg}
            onSave={(leg) => saveLeg(editingFlightId, leg)}
            onDelete={
              editingLeg.direction
                ? () => deleteLeg(editingFlightId, editingLeg.id)
                : undefined
            }
          />
        </FullScreenModal>
      )}
    </div>
  );
}

function AirportTiming({
  time,
  airport,
}: {
  time: string;
  airport: ReturnType<typeof getAirportDisplay>;
}) {
  return (
    <div className="flight-airport-block">
      <div>{time}</div>
      <div className="flight-airport-meta">
        {airport.code && (
          <div className="flight-airport-code">{airport.code}</div>
        )}
        <div className="flight-airport-name-row">
          <span>{airport.name}</span>
          {airport.terminal && <span className="tag">{airport.terminal}</span>}
        </div>
      </div>
    </div>
  );
}

function FlightForm({
  flight,
  onSave,
  onDelete,
}: {
  flight: FlightInfo;
  onSave: (f: FlightInfo) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(flight);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">航空公司</label>
        <input
          className="form-input"
          value={form.airline}
          onChange={(e) => setForm({ ...form, airline: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">訂位代號</label>
          <input
            className="form-input"
            value={form.bookingCode || ""}
            onChange={(e) => setForm({ ...form, bookingCode: e.target.value })}
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">票價</label>
          <input
            className="form-input"
            value={form.ticketPrice || ""}
            onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">機票號碼</label>
        <input
          className="form-input"
          value={form.ticketNumber || ""}
          onChange={(e) => setForm({ ...form, ticketNumber: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">會員方案</label>
          <input
            className="form-input"
            value={form.memberPlan || ""}
            onChange={(e) => setForm({ ...form, memberPlan: e.target.value })}
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">會員卡號</label>
          <input
            className="form-input"
            value={form.memberNumber || ""}
            onChange={(e) => setForm({ ...form, memberNumber: e.target.value })}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">託運行李</label>
          <input
            className="form-input"
            value={form.checkedBaggage || ""}
            onChange={(e) =>
              setForm({ ...form, checkedBaggage: e.target.value })
            }
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">隨身行李</label>
          <input
            className="form-input"
            value={form.carryOn || ""}
            onChange={(e) => setForm({ ...form, carryOn: e.target.value })}
          />
        </div>
      </div>
      <button
        className="btn btn-primary w-full mt-8"
        onClick={() => onSave(form)}
      >
        儲存
      </button>
      {onDelete && (
        <button className="btn btn-secondary w-full mt-2" onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          刪除航班
        </button>
      )}
    </div>
  );
}

function LegForm({
  leg,
  onSave,
  onDelete,
}: {
  leg: FlightLeg;
  onSave: (l: FlightLeg) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(leg);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">方向（如：去程：台北 → 清邁）</label>
        <input
          className="form-input"
          value={form.direction}
          onChange={(e) => setForm({ ...form, direction: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">日期</label>
        <input
          className="form-input"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">航班號碼</label>
        <input
          className="form-input"
          value={form.flightNumber}
          onChange={(e) =>
            setForm({ ...form, flightNumber: e.target.value.toUpperCase() })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">機型</label>
        <input
          className="form-input"
          value={form.aircraft || ""}
          onChange={(e) => setForm({ ...form, aircraft: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">起飛時間</label>
          <input
            className="form-input"
            value={form.departureTime}
            onChange={(e) =>
              setForm({ ...form, departureTime: e.target.value })
            }
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">抵達時間</label>
          <input
            className="form-input"
            value={form.arrivalTime}
            onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">起飛機場縮寫</label>
          <input
            className="form-input"
            value={form.departureAirportCode || ""}
            onChange={(e) =>
              setForm({
                ...form,
                departureAirportCode: e.target.value.toUpperCase(),
              })
            }
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">抵達機場縮寫</label>
          <input
            className="form-input"
            value={form.arrivalAirportCode || ""}
            onChange={(e) =>
              setForm({
                ...form,
                arrivalAirportCode: e.target.value.toUpperCase(),
              })
            }
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">起飛機場中文</label>
          <input
            className="form-input"
            value={form.departureAirport}
            onChange={(e) =>
              setForm({ ...form, departureAirport: e.target.value })
            }
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">抵達機場中文</label>
          <input
            className="form-input"
            value={form.arrivalAirport}
            onChange={(e) =>
              setForm({ ...form, arrivalAirport: e.target.value })
            }
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">起飛航廈</label>
          <input
            className="form-input"
            value={form.departureTerminal || ""}
            onChange={(e) =>
              setForm({ ...form, departureTerminal: e.target.value })
            }
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">抵達航廈</label>
          <input
            className="form-input"
            value={form.arrivalTerminal || ""}
            onChange={(e) =>
              setForm({ ...form, arrivalTerminal: e.target.value })
            }
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">飛行時間</label>
        <input
          className="form-input"
          value={form.duration || ""}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">餐點</label>
        <input
          className="form-input"
          value={form.meal || ""}
          onChange={(e) => setForm({ ...form, meal: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">座位</label>
        <input
          className="form-input"
          value={form.seat || ""}
          onChange={(e) => setForm({ ...form, seat: e.target.value })}
        />
      </div>
      <button className="btn btn-primary w-full" onClick={() => onSave(form)}>
        儲存
      </button>
      {onDelete && (
        <button className="btn btn-secondary w-full mt-2" onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          刪除航段
        </button>
      )}
    </div>
  );
}
