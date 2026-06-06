import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AppProvider, useApp } from "./context/AppContext";
import * as storage from "./utils/storage";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { ConnectedToastViewport } from "./components/ToastViewport";
import { BottomTabBar } from "./components/BottomTabBar";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { TripsPage } from "./pages/TripsPage";
import { TripDetailPage } from "./pages/TripDetailPage";
import { NotesPage } from "./pages/NotesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UserMenu } from "./components/UserMenu";
import { UserAvatar } from "./components/UserAvatar";
import { Modal } from "./components/Modal";
import { useTranslation } from "react-i18next";
import {
  getEffectiveMainTab,
  getEffectiveSelectedTripId,
} from "./navigationState";
import type { TabType } from "./types";
import i18n, { type Language } from "./i18n";
import "./App.css";

function AppContent() {
  const { t } = useTranslation();
  const { state, loading, updateTrip, viewTripId, isCurrentUserAdmin } =
    useApp();
  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      storage.getItem<"light" | "dark">("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
  const [textScale, setTextScale] = useState(
    () => storage.getItem<number>("textScale") || 100,
  );
  const [language, setLanguage] = useState<Language>(
    () => storage.getItem<Language>("language") || "zh-TW",
  );
  const [hideTripEditButtons, setHideTripEditButtons] = useState(
    () => storage.getItem<boolean>("hideTripEditButtons") || false,
  );
  const [defaultSkipPreparation, setDefaultSkipPreparation] = useState(
    () => storage.getItem<boolean>("defaultSkipPreparation") || false,
  );
  const [defaultHideShoppingList, setDefaultHideShoppingList] = useState(
    () => storage.getItem<boolean>("defaultHideShoppingList") || false,
  );
  const [authPage, setAuthPage] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState<TabType>(
    () => storage.getItem<TabType>("activeTab") || "trips",
  );
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() =>
    storage.getItem<string>("route-trip"),
  );
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuInitialView, setUserMenuInitialView] = useState<
    "menu" | "account"
  >("menu");
  const [notice, setNotice] = useState<string | null>(null);

  const currentUserId = state.auth.currentUser?.id;
  const visibleTrips = currentUserId
    ? state.trips.filter((trip) => trip.members.includes(currentUserId))
    : [];
  const canAccessNotes = isCurrentUserAdmin();
  const effectiveActiveTab = getEffectiveMainTab(activeTab, canAccessNotes);
  const effectiveSelectedTripId = getEffectiveSelectedTripId(
    selectedTripId,
    visibleTrips.map((trip) => trip.id),
  );
  const selectedTrip = visibleTrips.find(
    (trip) => trip.id === effectiveSelectedTripId,
  );

  useEffect(() => {
    if (effectiveSelectedTripId) {
      storage.setItem("route-trip", effectiveSelectedTripId);
    } else {
      storage.removeItem("route-trip");
    }
  }, [effectiveSelectedTripId]);

  useEffect(() => {
    storage.setItem("activeTab", effectiveActiveTab);
  }, [effectiveActiveTab]);

  useEffect(() => {
    storage.setItem("theme", theme);
    document.documentElement.className = `theme-${theme}`;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        "content",
        theme === "dark" ? "#1e293b" : "#7EC8E3",
      );
    }
  }, [theme]);

  useEffect(() => {
    const scaleProgress = Math.max(0, Math.min(1, (textScale - 100) / 100));
    const leadingBoost = scaleProgress * 0.08;
    storage.setItem("textScale", textScale);
    document.documentElement.style.setProperty(
      "--text-scale",
      String(textScale / 100),
    );
    document.documentElement.style.setProperty(
      "--line-height-tight",
      String(1.35 + leadingBoost),
    );
    document.documentElement.style.setProperty(
      "--line-height-normal",
      String(1.5 + leadingBoost),
    );
    document.documentElement.style.setProperty(
      "--line-height-relaxed",
      String(1.65 + leadingBoost),
    );
    document.documentElement.style.setProperty("--letter-spacing-normal", "0");
  }, [textScale]);

  useEffect(() => {
    storage.setItem("language", language);
    document.documentElement.lang = language;
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    storage.setItem("hideTripEditButtons", hideTripEditButtons);
  }, [hideTripEditButtons]);

  useEffect(() => {
    storage.setItem("defaultSkipPreparation", defaultSkipPreparation);
  }, [defaultSkipPreparation]);

  useEffect(() => {
    storage.setItem("defaultHideShoppingList", defaultHideShoppingList);
  }, [defaultHideShoppingList]);

  // Join trip via URL: ?join=<tripId>
  const [joinTripId, setJoinTripId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("join");
  });

  // Clear join query param from URL, but keep view-only links shareable/reloadable
  useEffect(() => {
    if (joinTripId) {
      const url = new URL(window.location.href);
      url.searchParams.delete("join");
      const search = url.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        search ? `${url.pathname}?${search}` : url.pathname,
      );
    }
  }, [joinTripId]);

  const joinTrip = state.trips.find((t) => t.id === joinTripId);

  function handleJoinConfirm() {
    if (!joinTrip || !state.auth.currentUser) return;
    if (joinTrip.members.includes(state.auth.currentUser.id)) {
      setNotice(t("app.alreadyInTrip"));
      setJoinTripId(null);
      return;
    }
    updateTrip({
      ...joinTrip,
      members: [...joinTrip.members, state.auth.currentUser.id],
    });
    setJoinTripId(null);
    setSelectedTripId(joinTrip.id);
  }

  // Viewer mode: no login needed, read-only
  if (viewTripId) {
    return (
      <div className={`app theme-${theme}`}>
        <TripDetailPage
          tripId={viewTripId}
          onBack={() => (window.location.href = window.location.pathname)}
          hideEditButtons={hideTripEditButtons}
          viewOnly
        />
      </div>
    );
  }

  // Loading Firebase data
  if (loading) {
    return (
      <div className={`identity-page theme-${theme}`}>
        <div className="login-logo loading-spinner">🐱</div>
      </div>
    );
  }

  // Not logged in
  if (!state.auth.currentUser) {
    if (authPage === "register") {
      return (
        <div className={`app theme-${theme}`}>
          <Register onSwitchToLogin={() => setAuthPage("login")} />
        </div>
      );
    }
    return (
      <div className={`app theme-${theme}`}>
        <Login onSwitchToRegister={() => setAuthPage("register")} />
      </div>
    );
  }

  // Join dialog
  const joinDialog =
    joinTripId && joinTrip
      ? createPortal(
          <Modal title={t("app.joinTrip")} onClose={() => setJoinTripId(null)}>
            <p className="text-sm mb-4">
              {t("app.joinTripQuestion", { name: joinTrip.name })}
            </p>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setJoinTripId(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={handleJoinConfirm}
              >
                {t("trips.next")}
              </button>
            </div>
          </Modal>,
          document.body,
        )
      : joinTripId && !joinTrip
        ? createPortal(
            <Modal title={t("app.joinTrip")} onClose={() => setJoinTripId(null)}>
              <p className="text-sm mb-4">{t("app.tripNotFound")}</p>
              <button
                className="btn btn-secondary w-full"
                onClick={() => setJoinTripId(null)}
              >
                {t("common.ok")}
              </button>
            </Modal>,
            document.body,
          )
        : null;

  const noticeDialog = notice
    ? createPortal(
        <Modal title={t("app.notice")} onClose={() => setNotice(null)}>
          <p className="text-sm mb-4">{notice}</p>
          <button
            className="btn btn-secondary w-full"
            onClick={() => setNotice(null)}
          >
            {t("common.ok")}
          </button>
        </Modal>,
        document.body,
      )
    : null;

  // Inside a trip
  if (effectiveSelectedTripId && selectedTrip) {
    return (
      <div className={`app theme-${theme}`}>
        <TripDetailPage
          tripId={selectedTrip.id}
          onBack={() => setSelectedTripId(null)}
          hideEditButtons={hideTripEditButtons}
        />
        {joinDialog}
        {noticeDialog}
      </div>
    );
  }

  // Main app with tabs
  return (
    <div className={`app theme-${theme}`}>
      <div className="top-bar">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐱</span>
          <span className="font-semibold">KK TripCat</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="identity-badge"
            onClick={() => {
              setUserMenuInitialView("menu");
              setShowUserMenu(true);
            }}
          >
            <UserAvatar user={state.auth.currentUser} />
            {state.auth.currentUser.displayName}
          </button>
        </div>
      </div>

      {effectiveActiveTab === "trips" && (
        <TripsPage
          onSelectTrip={setSelectedTripId}
          defaultSkipPreparation={defaultSkipPreparation}
          defaultHideShoppingList={defaultHideShoppingList}
        />
      )}
      {effectiveActiveTab === "notes" && canAccessNotes && <NotesPage />}
      {effectiveActiveTab === "settings" && (
        <SettingsPage
          theme={theme}
          onThemeChange={setTheme}
          textScale={textScale}
          onTextScaleChange={setTextScale}
          language={language}
          onLanguageChange={setLanguage}
          hideTripEditButtons={hideTripEditButtons}
          onHideTripEditButtonsChange={setHideTripEditButtons}
          defaultSkipPreparation={defaultSkipPreparation}
          onDefaultSkipPreparationChange={setDefaultSkipPreparation}
          defaultHideShoppingList={defaultHideShoppingList}
          onDefaultHideShoppingListChange={setDefaultHideShoppingList}
          onOpenAccountSettings={() => {
            setUserMenuInitialView("account");
            setShowUserMenu(true);
          }}
        />
      )}
      <BottomTabBar activeTab={effectiveActiveTab} onTabChange={setActiveTab} />

      {showUserMenu && (
        <UserMenu
          initialView={userMenuInitialView}
          onClose={() => setShowUserMenu(false)}
          onSwitchUser={() => {
            setShowUserMenu(false);
            setSelectedTripId(null);
          }}
        />
      )}
      {joinDialog}
      {noticeDialog}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <ConnectedToastViewport />
      <UpdatePrompt />
    </AppProvider>
  );
}
