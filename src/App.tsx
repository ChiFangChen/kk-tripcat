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
import { Modal } from "./components/Modal";
import {
  getEffectiveMainTab,
  getEffectiveSelectedTripId,
} from "./navigationState";
import type { TabType } from "./types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import "./App.css";

function AppContent() {
  const { state, loading, updateTrip, viewTripId, isCurrentUserAdmin } =
    useApp();
  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      storage.getItem<"light" | "dark">("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
  const [authPage, setAuthPage] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState<TabType>(
    () => storage.getItem<TabType>("activeTab") || "trips",
  );
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() =>
    storage.getItem<string>("route-trip"),
  );
  const [showUserMenu, setShowUserMenu] = useState(false);
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
      setNotice("已在旅程中！");
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
          <Modal title="加入旅程" onClose={() => setJoinTripId(null)}>
            <p className="text-sm mb-4">是否加入「{joinTrip.name}」旅程？</p>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setJoinTripId(null)}
              >
                取消
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={handleJoinConfirm}
              >
                下一步
              </button>
            </div>
          </Modal>,
          document.body,
        )
      : joinTripId && !joinTrip
        ? createPortal(
            <Modal title="加入旅程" onClose={() => setJoinTripId(null)}>
              <p className="text-sm mb-4">找不到此旅程</p>
              <button
                className="btn btn-secondary w-full"
                onClick={() => setJoinTripId(null)}
              >
                確定
              </button>
            </Modal>,
            document.body,
          )
        : null;

  const noticeDialog = notice
    ? createPortal(
        <Modal title="提示" onClose={() => setNotice(null)}>
          <p className="text-sm mb-4">{notice}</p>
          <button
            className="btn btn-secondary w-full"
            onClick={() => setNotice(null)}
          >
            確定
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
            className="header-icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="切換主題"
          >
            <FontAwesomeIcon icon={theme === "dark" ? faSun : faMoon} />
          </button>
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
        </div>
      </div>

      {effectiveActiveTab === "trips" && (
        <TripsPage onSelectTrip={setSelectedTripId} />
      )}
      {effectiveActiveTab === "notes" && canAccessNotes && <NotesPage />}
      {effectiveActiveTab === "settings" && <SettingsPage />}
      <BottomTabBar activeTab={effectiveActiveTab} onTabChange={setActiveTab} />

      {showUserMenu && (
        <UserMenu
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
