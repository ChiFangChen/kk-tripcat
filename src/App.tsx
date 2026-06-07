import { useState, useEffect, useCallback, useRef } from "react";
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
import { getReadableTextColor } from "./utils/color";
import type { TabType, UserSettings, UserTheme } from "./types";
import i18n, { type Language } from "./i18n";
import "./App.css";

type SettingsKey = keyof UserSettings;
type AppSettings = Required<UserSettings>;

function getInitialSettings(): AppSettings {
  return {
    theme:
      storage.getItem<UserTheme>("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
    textScale: storage.getItem<number>("textScale") || 100,
    language: storage.getItem<Language>("language") || "zh-TW",
    hideTripEditButtons:
      storage.getItem<boolean>("hideTripEditButtons") || false,
    defaultSkipPreparation:
      storage.getItem<boolean>("defaultSkipPreparation") || false,
    defaultHideShoppingList:
      storage.getItem<boolean>("defaultHideShoppingList") || false,
  };
}

function hasSetting(settings: UserSettings | undefined, key: SettingsKey) {
  return settings?.[key] !== undefined;
}

function removeLocalSettingsCache() {
  storage.removeItem("theme");
  storage.removeItem("textScale");
  storage.removeItem("language");
  storage.removeItem("hideTripEditButtons");
  storage.removeItem("defaultSkipPreparation");
  storage.removeItem("defaultHideShoppingList");
}

function AppContent() {
  const { t } = useTranslation();
  const {
    state,
    loading,
    updateTrip,
    updateUser,
    viewTripId,
    isCurrentUserAdmin,
  } = useApp();
  const initialSettingsRef = useRef(getInitialSettings());
  const latestUserSettingsRef = useRef<UserSettings>(
    initialSettingsRef.current,
  );
  const migratedSettingsUserRef = useRef<string | null>(null);
  const [theme, setTheme] = useState<UserTheme>(
    () => initialSettingsRef.current.theme,
  );
  const [textScale, setTextScale] = useState(
    () => initialSettingsRef.current.textScale,
  );
  const [language, setLanguage] = useState<Language>(
    () => initialSettingsRef.current.language,
  );
  const [hideTripEditButtons, setHideTripEditButtons] = useState(
    () => initialSettingsRef.current.hideTripEditButtons,
  );
  const [defaultSkipPreparation, setDefaultSkipPreparation] = useState(
    () => initialSettingsRef.current.defaultSkipPreparation,
  );
  const [defaultHideShoppingList, setDefaultHideShoppingList] = useState(
    () => initialSettingsRef.current.defaultHideShoppingList,
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
    document.documentElement.lang = language;
    void i18n.changeLanguage(language);
  }, [language]);

  useEffect(() => {
    const settings = state.auth.currentUser?.settings;
    if (!settings) return;
    latestUserSettingsRef.current = {
      ...latestUserSettingsRef.current,
      ...settings,
    };
    if (settings.theme) setTheme(settings.theme);
    if (typeof settings.textScale === "number") setTextScale(settings.textScale);
    if (settings.language) setLanguage(settings.language);
    if (typeof settings.hideTripEditButtons === "boolean") {
      setHideTripEditButtons(settings.hideTripEditButtons);
    }
    if (typeof settings.defaultSkipPreparation === "boolean") {
      setDefaultSkipPreparation(settings.defaultSkipPreparation);
    }
    if (typeof settings.defaultHideShoppingList === "boolean") {
      setDefaultHideShoppingList(settings.defaultHideShoppingList);
    }
  }, [
    state.auth.currentUser?.settings?.theme,
    state.auth.currentUser?.settings?.textScale,
    state.auth.currentUser?.settings?.language,
    state.auth.currentUser?.settings?.hideTripEditButtons,
    state.auth.currentUser?.settings?.defaultSkipPreparation,
    state.auth.currentUser?.settings?.defaultHideShoppingList,
  ]);

  useEffect(() => {
    const currentUser = state.auth.currentUser;
    if (loading || !currentUser) return;
    if (migratedSettingsUserRef.current === currentUser.id) return;

    const settings = currentUser.settings;
    const nextSettings: Required<UserSettings> = {
      theme: settings?.theme ?? theme,
      textScale: settings?.textScale ?? textScale,
      language: settings?.language ?? language,
      hideTripEditButtons:
        settings?.hideTripEditButtons ?? hideTripEditButtons,
      defaultSkipPreparation:
        settings?.defaultSkipPreparation ?? defaultSkipPreparation,
      defaultHideShoppingList:
        settings?.defaultHideShoppingList ?? defaultHideShoppingList,
    };
    const settingKeys: SettingsKey[] = [
      "theme",
      "textScale",
      "language",
      "hideTripEditButtons",
      "defaultSkipPreparation",
      "defaultHideShoppingList",
    ];
    const missingSettings = settingKeys.filter(
      (key) => !hasSetting(settings, key),
    );

    migratedSettingsUserRef.current = currentUser.id;
    if (missingSettings.length > 0) {
      latestUserSettingsRef.current = nextSettings;
      void updateUser({ ...currentUser, settings: nextSettings });
    }
    removeLocalSettingsCache();
  }, [
    loading,
    state.auth.currentUser,
    theme,
    textScale,
    language,
    hideTripEditButtons,
    defaultSkipPreparation,
    defaultHideShoppingList,
    updateUser,
  ]);

  const updateCurrentUserSettings = useCallback(
    (settings: Partial<UserSettings>) => {
      const currentUser = state.auth.currentUser;
      if (!currentUser) return;
      const nextSettings = {
        ...latestUserSettingsRef.current,
        ...settings,
      };
      latestUserSettingsRef.current = nextSettings;
      void updateUser({
        ...currentUser,
        settings: nextSettings,
      });
    },
    [state.auth.currentUser, updateUser],
  );

  const handleThemeChange = useCallback(
    (nextTheme: UserTheme) => {
      setTheme(nextTheme);
      updateCurrentUserSettings({ theme: nextTheme });
    },
    [updateCurrentUserSettings],
  );

  const handleTextScaleChange = useCallback(
    (nextTextScale: number) => {
      setTextScale(nextTextScale);
      updateCurrentUserSettings({ textScale: nextTextScale });
    },
    [updateCurrentUserSettings],
  );

  const handleLanguageChange = useCallback(
    (nextLanguage: Language) => {
      setLanguage(nextLanguage);
      updateCurrentUserSettings({ language: nextLanguage });
    },
    [updateCurrentUserSettings],
  );

  const handleHideTripEditButtonsChange = useCallback(
    (hidden: boolean) => {
      setHideTripEditButtons(hidden);
      updateCurrentUserSettings({ hideTripEditButtons: hidden });
    },
    [updateCurrentUserSettings],
  );

  const handleDefaultSkipPreparationChange = useCallback(
    (skip: boolean) => {
      setDefaultSkipPreparation(skip);
      updateCurrentUserSettings({ defaultSkipPreparation: skip });
    },
    [updateCurrentUserSettings],
  );

  const handleDefaultHideShoppingListChange = useCallback(
    (hidden: boolean) => {
      setDefaultHideShoppingList(hidden);
      updateCurrentUserSettings({ defaultHideShoppingList: hidden });
    },
    [updateCurrentUserSettings],
  );

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
            className={`identity-badge ${
              state.auth.currentUser.avatarMode === "google" &&
              state.auth.currentUser.googlePhotoURL
                ? "with-avatar"
                : ""
            }`}
            onClick={() => {
              setUserMenuInitialView("menu");
              setShowUserMenu(true);
            }}
            style={{
              backgroundColor: state.auth.currentUser.color,
              color: getReadableTextColor(state.auth.currentUser.color),
            }}
          >
            {state.auth.currentUser.avatarMode === "google" &&
              state.auth.currentUser.googlePhotoURL && (
                <UserAvatar user={state.auth.currentUser} />
              )}
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
          onThemeChange={handleThemeChange}
          textScale={textScale}
          onTextScaleChange={handleTextScaleChange}
          language={language}
          onLanguageChange={handleLanguageChange}
          hideTripEditButtons={hideTripEditButtons}
          onHideTripEditButtonsChange={handleHideTripEditButtonsChange}
          defaultSkipPreparation={defaultSkipPreparation}
          onDefaultSkipPreparationChange={handleDefaultSkipPreparationChange}
          defaultHideShoppingList={defaultHideShoppingList}
          onDefaultHideShoppingListChange={handleDefaultHideShoppingListChange}
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
