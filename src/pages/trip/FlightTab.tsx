import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { formatDate } from "../../utils/date";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { FullScreenModal } from "../../components/FullScreenModal";
import { InfoRow } from "../../components/InfoRow";
import { Accordion } from "../../components/Accordion";
import { generateId } from "../../utils/id";
import type { FlightInfo, FlightLeg } from "../../types";
import { getAirportDisplay, getFlightNumberLabel } from "./flightDisplay";
import * as storage from "../../utils/storage";

interface Props {
  tripId: string;
  viewOnly?: boolean;
}

export function FlightTab({ tripId, viewOnly }: Props) {
  const { setSharedTripData, getTripData } = useApp();
  const tripData = getTripData(tripId);
  const flights = tripData.flights;
  const collapsedStorageKey = `flight-sections-collapsed-${tripId}`;
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(() => storage.getItem<Record<string, boolean>>(collapsedStorageKey) || {});
  const [editingFlight, setEditingFlight] = useState<FlightInfo | null>(null);
  const [editingLeg, setEditingLeg] = useState<FlightLeg | null>(null);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const doubleTap = useDoubleTap();

  useEffect(() => {
    storage.setItem(collapsedStorageKey, collapsedSections);
  }, [collapsedSections, collapsedStorageKey]);

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

  function getSectionCollapseKey(
    flightId: string,
    section: "booking" | "member" | "baggage",
  ) {
    return `${flightId}-${section}`;
  }

  function toggleSection(
    flightId: string,
    section: "booking" | "member" | "baggage",
  ) {
    const key = getSectionCollapseKey(flightId, section);
    setCollapsedSections((current) => ({
      ...current,
      [key]: !(current[key] ?? false),
    }));
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
        <div key={flight.id} className="card flight-card">
          <div className="flight-card-header">
            <div>
              <h3
                className="flight-card-title"
                onClick={doubleTap(
                  flight.id,
                  () => !viewOnly && setEditingFlight(flight),
                )}
              >
                {flight.airline || "航班"}
              </h3>
              {(flight.memberPlan || flight.memberNumber) && (
                <div className="flight-card-meta">
                  {(flight.memberPlan || flight.memberNumber) && (
                    <span className="flight-meta-chip">
                      {`${flight.memberPlan && flight.memberPlan} ${flight.memberNumber && flight.memberNumber}`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {(flight.bookingCode ||
            flight.ticketPrice ||
            flight.ticketNumber ||
            flight.booking?.platform ||
            flight.checkedBaggage ||
            flight.carryOn ||
            flight.booking?.note ||
            flight.booking?.assignee) && (
            <div className="flight-panel-card">
              <Accordion
                title="票務"
                isOpen={
                  !(
                    collapsedSections[
                      getSectionCollapseKey(flight.id, "booking")
                    ] ?? false
                  )
                }
                onToggle={() => toggleSection(flight.id, "booking")}
              >
                <div className="flight-panel-body">
                  <InfoRow
                    label="訂位代號"
                    value={getFlightBookingCode(flight)}
                  />
                  <InfoRow label="票號" value={flight.ticketNumber} />
                  <InfoRow label="票價" value={getFlightTicketPrice(flight)} />
                  <InfoRow
                    label="平台"
                    value={
                      flight.booking?.platform ? (
                        <div className="flex items-center gap-2">
                          <span>{flight.booking.platform}</span>
                          {flight.booking.assignee && (
                            <span className="tag">
                              {flight.booking.assignee}
                            </span>
                          )}
                        </div>
                      ) : undefined
                    }
                  />
                  <InfoRow label="備註" value={flight.booking?.note} />
                  <InfoRow
                    label="託運行李"
                    value={
                      flight.checkedBaggage ? (
                        <div className="flight-multiline-text">
                          {flight.checkedBaggage}
                        </div>
                      ) : undefined
                    }
                  />
                  <InfoRow
                    label="隨身行李"
                    value={
                      flight.carryOn ? (
                        <div className="flight-multiline-text">
                          {flight.carryOn}
                        </div>
                      ) : undefined
                    }
                  />
                </div>
              </Accordion>
            </div>
          )}

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

                <div className="flight-route">
                  <AirportSide
                    time={formatFlightTime(leg.departureTime)}
                    airport={departure}
                  />
                  <div className="flight-route-center">
                    <div>{formatDate(leg.date)}</div>
                    <div className="flight-route-line" />
                    {leg.duration && (
                      <div className="flight-route-duration">
                        {leg.duration}
                      </div>
                    )}
                  </div>
                  <AirportSide
                    time={formatFlightTime(leg.arrivalTime)}
                    airport={arrival}
                    align="right"
                  />
                </div>

                <div>
                  <InfoRow label="航班" value={getFlightNumberLabel(leg)} />
                  <InfoRow
                    label="起飛機場"
                    value={<AirportNameWithTerminal airport={departure} />}
                  />
                  <InfoRow
                    label="抵達機場"
                    value={<AirportNameWithTerminal airport={arrival} />}
                  />
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
            onCancel={() => setEditingFlight(null)}
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
            onCancel={() => {
              setEditingLeg(null);
              setEditingFlightId(null);
            }}
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

function AirportNameWithTerminal({
  airport,
}: {
  airport: ReturnType<typeof getAirportDisplay>;
}) {
  return (
    <span className="flight-airport-name-inline">
      <span>{airport.name}</span>
      {airport.terminal && <span className="tag">{airport.terminal}</span>}
    </span>
  );
}

function formatFlightTime(time: string): string {
  const trimmed = time.trim();
  const match = trimmed.match(/^(\d{1,2}:\d{2})(?:\s?(AM|PM))$/i);
  if (!match) return trimmed;

  const [, timePart, meridiem] = match;
  const [hourText, minute] = timePart.split(":");
  let hour = Number(hourText);
  const upperMeridiem = meridiem.toUpperCase();

  if (upperMeridiem === "AM") {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function AirportSide({
  time,
  airport,
  align = "left",
}: {
  time: string;
  airport: ReturnType<typeof getAirportDisplay>;
  align?: "left" | "right";
}) {
  return (
    <div className={`flight-route-side ${align === "right" ? "arrival" : ""}`}>
      <div className="flight-route-side-main">
        {airport.code && (
          <span className="flight-route-code">{airport.code}</span>
        )}
        <span className="flight-route-time">{time}</span>
      </div>
    </div>
  );
}

function FlightForm({
  flight,
  onSave,
  onCancel,
  onDelete,
}: {
  flight: FlightInfo;
  onSave: (f: FlightInfo) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({
    ...flight,
    bookingCode: getFlightBookingCode(flight) || "",
    ticketPrice: getFlightTicketPrice(flight) || "",
  });
  const [booking, setBooking] = useState({
    platform: flight.booking?.platform || "",
    assignee: flight.booking?.assignee || "",
    note: flight.booking?.note || "",
  });

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
        <div className="form-group">
          <label className="form-label">機票號碼</label>
          <input
            className="form-input"
            value={form.ticketNumber || ""}
            onChange={(e) => setForm({ ...form, ticketNumber: e.target.value })}
          />
        </div>
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
      <div className="form-group">
        <label className="form-label">平台</label>
        <input
          className="form-input"
          value={booking.platform || ""}
          onChange={(e) => setBooking({ ...booking, platform: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">負責人</label>
          <input
            className="form-input"
            value={booking.assignee || ""}
            onChange={(e) =>
              setBooking({ ...booking, assignee: e.target.value })
            }
          />
        </div>
        <div className="form-group flex-1" />
      </div>
      <div className="form-group flex-1">
        <label className="form-label">票價</label>
        <input
          className="form-input"
          value={form.ticketPrice || ""}
          onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">票務備註</label>
        <textarea
          className="form-input"
          value={booking.note || ""}
          onChange={(e) => setBooking({ ...booking, note: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group flex-1">
          <label className="form-label">託運行李</label>
          <textarea
            className="form-input"
            rows={4}
            value={form.checkedBaggage || ""}
            onChange={(e) =>
              setForm({ ...form, checkedBaggage: e.target.value })
            }
          />
        </div>
        <div className="form-group flex-1">
          <label className="form-label">隨身行李</label>
          <textarea
            className="form-input"
            rows={4}
            value={form.carryOn || ""}
            onChange={(e) => setForm({ ...form, carryOn: e.target.value })}
          />
        </div>
      </div>
      <div className="form-actions mt-8">
        <button className="btn btn-secondary" onClick={onCancel} type="button">
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={() =>
            onSave({
              ...form,
              bookingCode: form.bookingCode || undefined,
              ticketPrice: form.ticketPrice || undefined,
              booking: Object.values(booking).some((value) => value)
                ? booking
                : undefined,
            })
          }
        >
          儲存
        </button>
      </div>
      {onDelete && (
        <button
          className="btn btn-secondary btn-danger w-full mt-2"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          刪除航班
        </button>
      )}
    </div>
  );
}

function getFlightBookingCode(flight: FlightInfo): string | undefined {
  return flight.bookingCode || flight.booking?.orderNumber;
}

function getFlightTicketPrice(flight: FlightInfo): string | undefined {
  return flight.ticketPrice || flight.booking?.amount;
}

function LegForm({
  leg,
  onSave,
  onCancel,
  onDelete,
}: {
  leg: FlightLeg;
  onSave: (l: FlightLeg) => void;
  onCancel: () => void;
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
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} type="button">
          取消
        </button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>
          儲存
        </button>
      </div>
      {onDelete && (
        <button
          className="btn btn-secondary btn-danger w-full mt-2"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          刪除航段
        </button>
      )}
    </div>
  );
}
