import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faUsers,
  faShareNodes,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../context/AppContext";
import { MemberMenu } from "../components/MemberMenu";
import { UserMenu } from "../components/UserMenu";
import { Modal } from "../components/Modal";
import { TemplateSelector } from "../components/TemplateSelector";
import { PreparationTab } from "./trip/PreparationTab";
import { FlightTab } from "./trip/FlightTab";
import { HotelTab } from "./trip/HotelTab";
import { ScheduleTab } from "./trip/ScheduleTab";
import { TransportTab } from "./trip/TransportTab";
import { ShoppingTab } from "./trip/ShoppingTab";
import type { TripTabType, ChecklistItem, Template } from "../types";
import * as storage from "../utils/storage";

interface Props {
  tripId: string;
  onBack: () => void;
  viewOnly?: boolean;
}

// Viewer mode: only show shared tabs
const viewerTabs: { key: TripTabType; label: string }[] = [
  { key: "flight", label: "飛機" },
  { key: "hotel", label: "飯店" },
  { key: "schedule", label: "行程表" },
  { key: "transport", label: "交通" },
];

const commonTabs: { key: TripTabType; label: string }[] = [
  ...viewerTabs,
  { key: "shopping", label: "購物" },
];

const allTabs: { key: TripTabType; label: string }[] = [
  { key: "preparation", label: "準備" },
  ...commonTabs,
];

const preparedTabs: { key: TripTabType; label: string }[] = [
  ...commonTabs,
  { key: "preparation", label: "準備" },
];

export function TripDetailPage({ tripId, onBack, viewOnly }: Props) {
  const {
    state,
    loading,
    isTripAdmin,
    getTripData,
    setUserTripData,
    setTemplate,
    firebaseConnected,
  } = useApp();
  const trip = state.trips.find((t) => t.id === tripId);
  const tripData = getTripData(tripId);

  const [showMembers, setShowMembers] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState("");

  // Template selection for new members who haven't set up yet
  const needsSetup =
    !viewOnly &&
    state.auth.currentUser &&
    trip?.members.includes(state.auth.currentUser.id) &&
    !tripData.setupComplete;
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (needsSetup) {
      queueMicrotask(() => setShowSetup(true));
    }
  }, [needsSetup]);

  const tabs = viewOnly ? viewerTabs : allTabs;
  const defaultTab = viewOnly ? "schedule" : "preparation";

  const storageKey = `trip-tab-${tripId}`;
  const [activeTab, setActiveTab] = useState<TripTabType>(() => {
    if (viewOnly) return defaultTab;
    return storage.getItem<TripTabType>(storageKey) || defaultTab;
  });

  useEffect(() => {
    if (!viewOnly) storage.setItem(storageKey, activeTab);
  }, [activeTab, storageKey, viewOnly]);

  function handleSetupComplete(
    checklist: ChecklistItem[],
    notes: string,
    updatedTemplate: Template | null,
  ) {
    setUserTripData(tripId, {
      checklist,
      shopping: [],
      preparationNotes: notes,
      setupComplete: true,
    });
    if (updatedTemplate) setTemplate(updatedTemplate);
    setShowSetup(false);
  }

  if (loading) return null;

  if (!trip) {
    return (
      <div className="page-container">
        <p className="text-center text-slate-400 py-8">找不到此旅程</p>
        <button className="btn btn-secondary w-full" onClick={onBack}>
          返回
        </button>
      </div>
    );
  }

  // Show template selection for new member
  if (showSetup) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-sky-600 p-2"
            onClick={() => {
              setShowSetup(false);
              onBack();
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h1 className="text-lg font-bold">選擇準備項目</h1>
          <div className="w-8" />
        </div>
        <p className="text-sm text-slate-400 mb-4">
          設定「{trip.name}」的個人準備清單
        </p>
        <TemplateSelector
          template={state.template}
          onConfirm={handleSetupComplete}
          confirmWithUpdateLabel="更新模板並確認"
          confirmLabel="確認"
        />
      </div>
    );
  }

  const admin = !viewOnly && isTripAdmin(trip);
  const baseUrl = `${window.location.origin}${window.location.pathname}`;

  function copyLink(type: "join" | "view") {
    const url = `${baseUrl}?${type}=${tripId}`;
    navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  }

  // Reorder tabs: if gotReady, move preparation to the very end
  const orderedTabs = trip.gotReady ? preparedTabs : tabs;

  return (
    <div>
      <div className="page-header">
        <button onClick={onBack} className="text-sky-600 p-2">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h1>{trip.name}</h1>
        <div className="flex items-center gap-1">
          {!firebaseConnected && (
            <span
              className="sync-warning-icon"
              title="尚未連線，編輯內容僅儲存在本機"
            >
              <FontAwesomeIcon icon={faExclamationCircle} />
            </span>
          )}
          {!viewOnly && (
            <>
              <button
                className="header-icon-btn"
                onClick={() => setShowShare(true)}
              >
                <FontAwesomeIcon icon={faShareNodes} />
              </button>
              <button
                className="header-icon-btn"
                onClick={() => setShowMembers(true)}
              >
                <FontAwesomeIcon icon={faUsers} />
              </button>
              {state.auth.currentUser && (
                <button
                  className="identity-badge"
                  onClick={() => setShowUserMenu(true)}
                  style={{
                    backgroundColor: state.auth.currentUser.color,
                    color: "white",
                  }}
                >
                  {state.auth.currentUser.displayName}
                </button>
              )}
            </>
          )}
          {viewOnly && (
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
              唯讀
            </span>
          )}
        </div>
      </div>

      <div className="trip-tabs">
        {orderedTabs.map((tab) => (
          <button
            key={tab.key}
            className={`trip-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === "preparation" && trip.gotReady && " ✓"}
          </button>
        ))}
      </div>

      <div className="page-container">
        {activeTab === "preparation" && !viewOnly && (
          <PreparationTab tripId={tripId} />
        )}
        {activeTab === "flight" && (
          <FlightTab tripId={tripId} viewOnly={viewOnly} />
        )}
        {activeTab === "hotel" && (
          <HotelTab tripId={tripId} viewOnly={viewOnly} />
        )}
        {activeTab === "schedule" && (
          <ScheduleTab tripId={tripId} viewOnly={viewOnly} />
        )}
        {activeTab === "transport" && (
          <TransportTab tripId={tripId} viewOnly={viewOnly} />
        )}
        {activeTab === "shopping" && !viewOnly && (
          <ShoppingTab tripId={tripId} />
        )}
      </div>

      {showMembers && (
        <MemberMenu tripId={tripId} onClose={() => setShowMembers(false)} />
      )}
      {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}

      {showShare && (
        <Modal title="分享旅程" onClose={() => setShowShare(false)}>
          <div className="flex flex-col gap-3">
            {admin && (
              <div>
                <p className="text-sm font-medium mb-1">邀請加入連結</p>
                <p className="text-xs text-slate-400 mb-2">
                  對方需登入，加入後可編輯共用資料
                </p>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => copyLink("join")}
                >
                  {copied === "join" ? "已複製！" : "複製邀請連結"}
                </button>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1">唯讀連結</p>
              <p className="text-xs text-slate-400 mb-2">
                不需登入，只能看共用資料（行程/航班/飯店/交通）
              </p>
              <button
                className="btn btn-secondary w-full"
                onClick={() => copyLink("view")}
              >
                {copied === "view" ? "已複製！" : "複製唯讀連結"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
