import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faEllipsisVertical,
  faGear,
  faUsers,
  faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import { shouldRefreshTripOnVisibility, useApp } from "../context/AppContext";
import { MemberMenu } from "../components/MemberMenu";
import { UserMenu } from "../components/UserMenu";
import { Modal } from "../components/Modal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { FullScreenModal } from "../components/FullScreenModal";
import { SwitchControl } from "../components/SwitchControl";
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
import { useTranslation } from "react-i18next";

interface Props {
  tripId: string;
  onBack: () => void;
  viewOnly?: boolean;
}

export function TripDetailPage({ tripId, onBack, viewOnly }: Props) {
  const { t } = useTranslation();
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
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [confirmDisablePreparation, setConfirmDisablePreparation] =
    useState(false);
  const [showPreparationPicker, setShowPreparationPicker] = useState(false);
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
  }, [tripId, firstEntryMode, showPreparationPicker]);

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
          message: t("settings.template.syncFailed"),
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
    setShowPreparationPicker(false);
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

  function openTripSettings() {
    setShowTabMenu(false);
    setShowTripSettings(true);
  }

  function handleEnablePreparation() {
    setShowTripSettings(false);
    setShowPreparationPicker(true);
  }

  function handleDisablePreparation() {
    setUserTripData(tripId, {
      checklist: [],
      preparationNotes: "",
      skipPreparation: true,
      setupComplete: true,
      gotReady: false,
    });
    setConfirmDisablePreparation(false);
    setShowTripSettings(false);
    setSetupChoice(null);
    setActiveTab("flight");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (loading) return null;

  if (!trip) {
    return (
      <div className="page-container">
        <p className="text-center text-slate-400 py-8">{t("app.tripNotFound")}</p>
        <button className="btn btn-secondary w-full" onClick={onBack}>
          {t("common.back")}
        </button>
      </div>
    );
  }

  if (!completed && firstEntryMode === "choice") {
    return (
      <div className="page-container">
        <div className="card">
          <h1 className="text-lg font-bold mb-2">{t("tripDetail.firstEntry")}</h1>
          <p className="text-sm text-slate-400 mb-6">
            {t("tripDetail.firstEntryQuestion", {
              name: trip.name,
            })}
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={() => setSetupChoice("preparation")}
          >
            {t("tripDetail.addPreparationItems")}
          </button>
          <button
            className="btn btn-secondary w-full mt-2"
            onClick={handleSkipPreparation}
          >
            {t("tripDetail.skipPreparationItems")}
          </button>
        </div>
      </div>
    );
  }

  // Show template selection for new member or trip settings enable flow.
  if (!completed && (firstEntryMode === "template" || showPreparationPicker)) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <div className="page-title-group">
            <button
              className="text-sky-600"
              onClick={() => {
                if (showPreparationPicker) {
                  setShowPreparationPicker(false);
                } else {
                  setSetupChoice(null);
                  onBack();
                }
              }}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h1 className="text-lg font-bold">{t("trips.choosePreparation")}</h1>
          </div>
          <div className="w-8" />
        </div>
        <p className="text-sm text-slate-400 mb-4">{t("tripDetail.editPreparationItems")}</p>
        <TemplateSelector
          template={state.template}
          onConfirm={handleSetupComplete}
          confirmWithUpdateLabel={t("tripDetail.saveTemplateAndApply")}
          confirmLabel={t("tripDetail.applyDirectly")}
        />
      </div>
    );
  }

  if (showTripSettings) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title-group">
            <button
              onClick={() => {
                setConfirmDisablePreparation(false);
                setShowTripSettings(false);
              }}
              className="text-sky-600"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <h1>{t("tripDetail.tripSettings")}</h1>
          </div>
          <div className="w-8" />
        </div>

        <div className="page-container">
          <div className="settings-list">
            <div
              className="settings-list-item"
            >
              <span className="settings-list-icon">
                <FontAwesomeIcon icon={faGear} />
              </span>
              <div className="settings-list-content">
                <span className="settings-list-title">
                  {t("tripDetail.preparationSettings")}
                </span>
                <p className="settings-list-description">
                  {t("tripDetail.preparationSettingDescription")}
                </p>
              </div>
              <SwitchControl
                checked={!tripData.skipPreparation}
                disabled={readOnly}
                ariaLabel={t("tripDetail.preparationSettings")}
                title={t("tripDetail.preparationSettings")}
                onChange={(checked) => {
                  if (checked) {
                    handleEnablePreparation();
                  } else {
                    setConfirmDisablePreparation(true);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {confirmDisablePreparation && (
          <ConfirmDeleteModal
            title={t("tripDetail.disablePreparation")}
            message={t("tripDetail.disablePreparationConfirm")}
            confirmLabel="common.confirm"
            onCancel={() => setConfirmDisablePreparation(false)}
            onConfirm={handleDisablePreparation}
          />
        )}
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

  function handleUpdateTrip(updatedTrip: typeof trip) {
    if (!updatedTrip) return;
    updateTrip(updatedTrip);
    setEditingTrip(false);
  }

  return (
    <div>
      <div className="trip-detail-sticky">
        <div className="page-header">
          <div className="page-title-group">
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
                  ? doubleTap(`trip-title-${trip.id}`, () =>
                      setEditingTrip(true),
                    )
                  : undefined
              }
            >
              {trip.name}
            </h1>
          </div>
          <div className="flex items-center gap-1">
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
              <span className="status-badge">{t("tripDetail.readOnly")}</span>
            )}
          </div>
        </div>

        <div className="trip-tabs">
          <div className="trip-tabs-main">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`trip-tab ${effectiveActiveTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>
          {!viewOnly && (
            <div className="trip-tabs-menu">
              <button
                className={`trip-tab-menu-btn ${menuTabs.some((tab) => tab.key === effectiveActiveTab) ? "active" : ""}`}
                onClick={() => setShowTabMenu((current) => !current)}
                title={t("tripDetail.menu")}
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
                      {t(tab.label)}
                    </button>
                  ))}
                  {menuTabs.length > 0 && <div className="trip-tab-menu-divider" />}
                  <button
                    className="trip-tab-menu-item"
                    onClick={openTripSettings}
                  >
                    <FontAwesomeIcon icon={faGear} className="mr-2" />
                    {t("tripDetail.tripSettings")}
                  </button>
                </div>
              </>
              )}
            </div>
          )}
        </div>
      </div>

      {editingTrip && (
        <FullScreenModal title={t("tripDetail.editTrip")} onClose={() => setEditingTrip(false)}>
          <TripEditForm
            trip={trip}
            onSave={handleUpdateTrip}
            onCancel={() => setEditingTrip(false)}
          />
        </FullScreenModal>
      )}

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

      {confirmDisablePreparation && (
        <ConfirmDeleteModal
          title={t("tripDetail.disablePreparation")}
          message={t("tripDetail.disablePreparationConfirm")}
          confirmLabel="common.confirm"
          onCancel={() => setConfirmDisablePreparation(false)}
          onConfirm={handleDisablePreparation}
        />
      )}

      {showShare && (
        <Modal title={t("tripDetail.shareTrip")} onClose={() => setShowShare(false)}>
          <div className="flex flex-col gap-3">
            {admin && !completed && (
              <div>
                <p className="text-sm font-medium mb-1">{t("tripDetail.inviteLink")}</p>
                <p className="text-xs text-slate-400 mb-2">
                  {t("tripDetail.inviteLinkDescription")}
                </p>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => copyLink("join")}
                >
                  {copied === "join" ? t("tripDetail.copied") : t("tripDetail.copyInviteLink")}
                </button>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1">{t("tripDetail.readOnlyLink")}</p>
              <p className="text-xs text-slate-400 mb-2">
                {t("tripDetail.readOnlyLinkDescription")}
              </p>
              <button
                className="btn btn-secondary w-full"
                onClick={() => copyLink("view")}
              >
                {copied === "view" ? t("tripDetail.copied") : t("tripDetail.copyReadOnlyLink")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
