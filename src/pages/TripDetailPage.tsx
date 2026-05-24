import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faEllipsisVertical,
  faUsers,
  faShareNodes,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { shouldRefreshTripOnVisibility, useApp } from "../context/AppContext";
import { MemberMenu } from "../components/MemberMenu";
import { UserMenu } from "../components/UserMenu";
import { Modal } from "../components/Modal";
import { FullScreenModal } from "../components/FullScreenModal";
import { TemplateSelector } from "../components/TemplateSelector";
import { TripEditForm } from "../components/TripEditForm";
import { useDoubleTap } from "../hooks/useDoubleTap";
import { PreparationTab } from "./trip/PreparationTab";
import { FlightTab } from "./trip/FlightTab";
import { HotelTab } from "./trip/HotelTab";
import { ScheduleTab } from "./trip/ScheduleTab";
import { TransportTab } from "./trip/TransportTab";
import { ShoppingTab } from "./trip/ShoppingTab";
import { MemoriesTab } from "./trip/MemoriesTab";
import type { TripTabType, ChecklistItem, Template } from "../types";
import * as storage from "../utils/storage";
import {
  getEffectiveTripTab,
  getFirstEntryMode,
  getTripTabGroups,
  getViewerTabs,
} from "./trip/tripEntry";

interface Props {
  tripId: string;
  onBack: () => void;
  viewOnly?: boolean;
}

export function TripDetailPage({ tripId, onBack, viewOnly }: Props) {
  const {
    state,
    loading,
    isTripAdmin,
    getTripData,
    refreshTripData,
    setUserTripData,
    setTemplate,
    updateTrip,
    showToast,
  } = useApp();
  const trip = state.trips.find((t) => t.id === tripId);
  const tripData = getTripData(tripId);
  const completed = !!trip?.isCompleted;
  const readOnly = !!viewOnly || completed;

  const [showMembers, setShowMembers] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [copied, setCopied] = useState("");
  const [setupChoice, setSetupChoice] = useState<"preparation" | "skip" | null>(
    null,
  );
  const doubleTap = useDoubleTap();

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
  const viewerTabs = getViewerTabs(trip?.memoriesVisibleToViewers);
  const tabGroups = getTripTabGroups({
    skipPreparation: tripData.skipPreparation,
    gotReady: tripData.gotReady,
    completed,
  });
  const tabs = viewOnly ? viewerTabs : tabGroups.mainTabs;
  const menuTabs = viewOnly ? [] : tabGroups.menuTabs;
  const allTabs = [...tabs, ...menuTabs];
  const defaultTab = viewOnly
    ? viewerTabs[0].key
    : completed || tripData.skipPreparation
      ? "flight"
      : "preparation";
  const tabStorageUserKey = viewOnly
    ? "viewer"
    : state.auth.currentUser?.id || "guest";

  const storageKey = `trip-tab-${tripId}-${tabStorageUserKey}`;
  const [activeTab, setActiveTab] = useState<TripTabType>(() => {
    if (viewOnly) return defaultTab;
    return storage.getItem<TripTabType>(storageKey) || defaultTab;
  });
  const effectiveActiveTab = getEffectiveTripTab({
    activeTab,
    defaultTab,
    tabs: allTabs,
  });

  useEffect(() => {
    if (!viewOnly) storage.setItem(storageKey, effectiveActiveTab);
  }, [effectiveActiveTab, storageKey, viewOnly]);

  useEffect(() => {
    void refreshTripData(tripId, { includeUserData: !viewOnly });
  }, [refreshTripData, tripId, viewOnly]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!shouldRefreshTripOnVisibility(document.visibilityState)) return;
      void refreshTripData(tripId, { includeUserData: !viewOnly });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshTripData, tripId, viewOnly]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [tripId, firstEntryMode]);

  async function handleSetupComplete(
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
          message: "模板沒有同步成功，請確認網路後再試一次",
        });
        return;
      }
    }

    setUserTripData(tripId, {
      checklist,
      shopping: [],
      preparationNotes: notes,
      setupComplete: true,
      skipPreparation: false,
      gotReady: false,
    });
    setSetupChoice(null);
    setActiveTab("preparation");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function handleSkipPreparation() {
    setUserTripData(tripId, {
      skipPreparation: true,
    });
    setSetupChoice("skip");
    setActiveTab("flight");
    window.scrollTo({ top: 0, behavior: "auto" });
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

  if (!completed && firstEntryMode === "choice") {
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
  if (!completed && firstEntryMode === "template") {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-sky-600"
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

  function toggleCompleted() {
    if (!admin || !trip) return;
    if (completed) {
      updateTrip(trip, {
        isCompleted: false,
        completedAt: "",
        completedBy: "",
      });
      return;
    }

    if (!state.auth.currentUser) return;
    updateTrip(trip, {
      isCompleted: true,
      completedAt: new Date().toISOString(),
      completedBy: state.auth.currentUser.id,
    });
  }

  function handleUpdateTrip(updatedTrip: typeof trip) {
    if (!updatedTrip) return;
    updateTrip(updatedTrip);
    setEditingTrip(false);
  }

  return (
    <div>
      <div className="page-header">
        {viewOnly ? (
          <div className="w-10" />
        ) : (
          <button onClick={onBack} className="text-sky-600">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}
        <h1
          className={admin && !readOnly ? "cursor-pointer" : undefined}
          onClick={
            admin && !readOnly
              ? doubleTap(`trip-title-${trip.id}`, () => setEditingTrip(true))
              : undefined
          }
        >
          {trip.name}
        </h1>
        <div className="flex items-center gap-1">
          {!viewOnly && (
            <>
              {admin && (
                <button
                  className={`header-icon-btn ${completed ? "active" : ""}`}
                  onClick={toggleCompleted}
                  title={completed ? "取消完成" : "完成旅程"}
                >
                  <FontAwesomeIcon icon={faCircleCheck} />
                </button>
              )}
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
          {viewOnly && <span className="status-badge">唯讀</span>}
        </div>
      </div>

      {editingTrip && (
        <FullScreenModal title="編輯旅程" onClose={() => setEditingTrip(false)}>
          <TripEditForm
            trip={trip}
            onSave={handleUpdateTrip}
            onCancel={() => setEditingTrip(false)}
          />
        </FullScreenModal>
      )}

      <div className="trip-tabs">
        <div className="trip-tabs-main">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`trip-tab ${effectiveActiveTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {menuTabs.length > 0 && (
          <div className="trip-tabs-menu">
            <button
              className={`trip-tab-menu-btn ${menuTabs.some((tab) => tab.key === effectiveActiveTab) ? "active" : ""}`}
              onClick={() => setShowTabMenu((current) => !current)}
              title="更多分頁"
            >
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
            {showTabMenu && (
              <>
                <div
                  className="trip-tab-menu-popover-wrapper"
                  onClick={() => setShowTabMenu(false)}
                ></div>
                <div className="trip-tab-menu-popover">
                  {menuTabs.map((tab) => (
                    <button
                      key={tab.key}
                      className={`trip-tab-menu-item ${effectiveActiveTab === tab.key ? "active" : ""}`}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setShowTabMenu(false);
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="page-container">
        {effectiveActiveTab === "preparation" && !viewOnly && (
          <PreparationTab tripId={tripId} viewOnly={readOnly} />
        )}
        {effectiveActiveTab === "flight" && (
          <FlightTab tripId={tripId} viewOnly={readOnly} />
        )}
        {effectiveActiveTab === "hotel" && (
          <HotelTab tripId={tripId} viewOnly={readOnly} />
        )}
        {effectiveActiveTab === "schedule" && (
          <ScheduleTab tripId={tripId} viewOnly={readOnly} />
        )}
        {effectiveActiveTab === "transport" && (
          <TransportTab tripId={tripId} viewOnly={readOnly} />
        )}
        {effectiveActiveTab === "shopping" && !viewOnly && (
          <ShoppingTab tripId={tripId} viewOnly={readOnly} />
        )}
        {effectiveActiveTab === "memories" && (
          <MemoriesTab tripId={tripId} viewOnly={viewOnly} />
        )}
      </div>

      {showMembers && (
        <MemberMenu
          tripId={tripId}
          readOnly={readOnly}
          onClose={() => setShowMembers(false)}
        />
      )}
      {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}

      {showShare && (
        <Modal title="分享旅程" onClose={() => setShowShare(false)}>
          <div className="flex flex-col gap-3">
            {admin && !completed && (
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
