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
import { getEditableTabs, getFirstEntryMode } from "./trip/tripEntry";

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
  const [setupChoice, setSetupChoice] = useState<"preparation" | "skip" | null>(
    null,
  );

  const isMember =
    !!state.auth.currentUser &&
    !!trip?.members.includes(state.auth.currentUser.id);
  const firstEntryMode = getFirstEntryMode({
    viewOnly,
    isMember,
    setupComplete: tripData.setupComplete,
    skipPreparation: tripData.skipPreparation,
    setupChoice: setupChoice || undefined,
  });
  const editableTabs = getEditableTabs(tripData.skipPreparation);
  const tabs = viewOnly ? viewerTabs : editableTabs;
  const defaultTab = viewOnly
    ? "schedule"
    : tripData.skipPreparation
      ? "flight"
      : "preparation";

  const storageKey = `trip-tab-${tripId}`;
  const [activeTab, setActiveTab] = useState<TripTabType>(() => {
    if (viewOnly) return defaultTab;
    return storage.getItem<TripTabType>(storageKey) || defaultTab;
  });

  useEffect(() => {
    if (!viewOnly) storage.setItem(storageKey, activeTab);
  }, [activeTab, storageKey, viewOnly]);

  useEffect(() => {
    if (tabs.some((tab) => tab.key === activeTab)) return;
    setActiveTab(defaultTab);
  }, [activeTab, defaultTab, tabs]);

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
      skipPreparation: false,
    });
    if (updatedTemplate) setTemplate(updatedTemplate);
    setSetupChoice(null);
  }

  function handleSkipPreparation() {
    setUserTripData(tripId, {
      skipPreparation: true,
    });
    setSetupChoice("skip");
    setActiveTab("flight");
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

  if (firstEntryMode === "choice") {
    return (
      <div className="page-container">
        <div className="card">
          <h1 className="text-lg font-bold mb-2">第一次進入旅程</h1>
          <p className="text-sm text-slate-400 mb-6">
            你要為「{trip.name}」設定自己的準備事項嗎？
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={() => setSetupChoice("preparation")}
          >
            加入準備事項
          </button>
          <button
            className="btn btn-secondary w-full mt-2"
            onClick={handleSkipPreparation}
          >
            略過準備事項
          </button>
        </div>
      </div>
    );
  }

  // Show template selection for new member who chose to use preparation
  if (firstEntryMode === "template") {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-sky-600 p-2"
            onClick={() => {
              setSetupChoice(null);
              onBack();
            }}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h1 className="text-lg font-bold">選擇準備項目</h1>
          <div className="w-8" />
        </div>
        <p className="text-sm text-slate-400 mb-4">請編輯準備事項</p>
        <TemplateSelector
          template={state.template}
          onConfirm={handleSetupComplete}
          confirmWithUpdateLabel="將以上存入準備事項模板並套用"
          confirmLabel="直接套用"
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

  // Reorder tabs only when preparation tab is available.
  const orderedTabs =
    viewOnly || tripData.skipPreparation
      ? tabs
      : trip.gotReady
        ? [
            ...tabs.filter((tab) => tab.key !== "preparation"),
            tabs.find((tab) => tab.key === "preparation")!,
          ]
        : tabs;

  return (
    <div>
      <div className="page-header">
        {viewOnly ? (
          <div className="w-10" />
        ) : (
          <button onClick={onBack} className="text-sky-600 p-2">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}
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
