import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSync,
  faTrash,
  faCheck,
  faTimes,
  faXmark,
  faPlus,
  faRightLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../context/AppContext";
import { Modal } from "./Modal";
import { PasswordInput } from "./PasswordInput";
import { UserAvatar } from "./UserAvatar";
import { useTranslation } from "react-i18next";

interface Props {
  onClose: () => void;
  onSwitchUser?: () => void;
  initialView?: "menu" | "account";
}

const ADMIN_SESSION_KEY = "kk-tripcat-admin-session";

export function UserMenu({
  onClose,
  onSwitchUser,
  initialView = "menu",
}: Props) {
  const { t } = useTranslation();
  const {
    state,
    login,
    logout,
    register,
    updateUser,
    bindGoogleAccount,
    isCurrentUserAdmin,
  } = useApp();
  const currentUser = state.auth.currentUser;
  const admin = isCurrentUserAdmin();
  const [view, setView] = useState<
    "menu" | "account" | "register" | "manage" | "resetpw"
  >(initialView);
  const [returnView, setReturnView] = useState<"menu" | "account" | "manage">(
    "menu",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [regError, setRegError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState("");
  const [googleSuccess, setGoogleSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmGoogleLink, setConfirmGoogleLink] = useState(false);

  if (!currentUser) return null;

  const handleColorChange = (color: string) => {
    updateUser({ ...currentUser, color });
  };

  const handleAvatarModeChange = (avatarMode: "color" | "google") => {
    updateUser({ ...currentUser, avatarMode });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!username.trim()) {
      setRegError("auth.errors.missingUsername");
      return;
    }
    if (state.users.some((u) => u.username === username && !u.deleted)) {
      setRegError("auth.errors.usernameExists");
      return;
    }
    try {
      await register(username, password, displayName || username);
      setUsername("");
      setPassword("");
      setDisplayName("");
      setView("manage");
    } catch {
      setRegError("auth.errors.createFailed");
    }
  };

  const handleSaveName = (userId: string) => {
    const user = state.users.find((u) => u.id === userId);
    if (user && editingName.trim() && editingName.trim() !== user.displayName) {
      updateUser({ ...user, displayName: editingName.trim() });
    }
    setEditingUserId(null);
  };

  const handleDeleteUser = (userId: string) => {
    const user = state.users.find((u) => u.id === userId);
    if (user) updateUser({ ...user, deleted: true });
    setConfirmDelete(null);
    if (userId === currentUser.id && adminSessionId) handleSwitchBackToAdmin();
  };

  const adminSessionId = localStorage.getItem(ADMIN_SESSION_KEY);

  const handleSwitchUser = (user: typeof currentUser) => {
    if (!user) return;
    if (admin && !adminSessionId) {
      localStorage.setItem(ADMIN_SESSION_KEY, currentUser.id);
    }
    login(user);
    onClose();
    onSwitchUser?.();
  };

  const handleSwitchBackToAdmin = () => {
    if (!adminSessionId) return;
    const adminUser = state.users.find((u) => u.id === adminSessionId);
    if (!adminUser) return;
    localStorage.removeItem(ADMIN_SESSION_KEY);
    login(adminUser);
    onClose();
    onSwitchUser?.();
  };

  const handleBindGoogle = async () => {
    setGoogleError("");
    setGoogleSuccess(false);
    setConfirmGoogleLink(false);
    setGoogleLoading(true);
    try {
      const linkedUser = await bindGoogleAccount(currentUser);
      login(linkedUser);
      setGoogleSuccess(true);
    } catch (error) {
      setGoogleError(
        error instanceof Error &&
          error.message === "google-account-already-linked"
          ? "auth.errors.googleAlreadyLinked"
          : "auth.errors.googleLoginFailed",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const activeUsers = state.users
    .filter((u) => !u.deleted)
    .sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return 0;
    });
  const isAdminSession = admin || !!adminSessionId;
  const realAdminId = state.users.find((u) => u.isAdmin)?.id;
  const deleteTarget = confirmDelete
    ? state.users.find((u) => u.id === confirmDelete)
    : null;
  const isGoogleAccount = currentUser.authProvider === "google";

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {view === "menu" && (
          <>
            <div className="modal-header !p-0">
              <div className="flex items-center gap-2 min-w-0">
                <UserAvatar user={currentUser} size="md" />
                <h3 className="min-w-0">{currentUser.displayName}</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {adminSessionId && (
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={handleSwitchBackToAdmin}
              >
                {t("userMenu.returnToAdmin")}
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => {
                setGoogleError("");
                setGoogleSuccess(false);
                setView("account");
              }}
            >
              {t("userMenu.accountSettings")}
            </button>
            {isAdminSession && (
              <button
                className="btn btn-secondary"
                style={{ width: "100%" }}
                onClick={() => setView("manage")}
              >
                {t("userMenu.manageUsers")}
              </button>
            )}
            <button
              className="btn w-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              onClick={() => {
                localStorage.removeItem(ADMIN_SESSION_KEY);
                localStorage.removeItem("kk-tripcat-route-trip");
                onSwitchUser?.();
                logout();
              }}
            >
              {t("auth.logout")}
            </button>
          </>
        )}

        {view === "account" && (
          <>
            <div className="modal-header !p-0">
              <h3 style={{ fontWeight: 600 }}>
                {t("userMenu.accountSettings")}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="member-list-settings">
              <div className="account-row">
                <p className="account-row-title">{t("auth.avatarSource")}</p>
                <div className="avatar-source-options">
                  <div
                    className={`avatar-source-option ${
                      currentUser.googlePhotoURL &&
                      currentUser.avatarMode !== "google"
                        ? "active"
                        : ""
                    }`}
                    title={t("auth.avatarSourceColor")}
                    aria-label={t("auth.avatarSourceColor")}
                  >
                    <button
                      className="account-color-avatar"
                      type="button"
                      onClick={() => handleAvatarModeChange("color")}
                      aria-label={t("auth.avatarSourceColor")}
                      title={t("auth.avatarSourceColor")}
                      style={{
                        backgroundColor: currentUser.color || "#888888",
                      }}
                    >
                      {currentUser.displayName.charAt(0)}
                    </button>
                    <label
                      className="account-color-edit"
                      title={t("auth.avatarSourceColor")}
                      aria-label={t("auth.avatarSourceColor")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FontAwesomeIcon
                        icon={faSync}
                        className="account-color-avatar-icon"
                      />
                      <input
                        type="color"
                        value={currentUser.color || "#888888"}
                        onChange={(e) => {
                          handleColorChange(e.target.value);
                          handleAvatarModeChange("color");
                        }}
                        className="color-input-hidden"
                      />
                    </label>
                  </div>
                  {currentUser.googlePhotoURL && (
                    <button
                      className={`avatar-source-option ${currentUser.avatarMode === "google" ? "active" : ""}`}
                      type="button"
                      title={t("auth.avatarSourceGoogle")}
                      aria-label={t("auth.avatarSourceGoogle")}
                      onClick={() => handleAvatarModeChange("google")}
                    >
                      <UserAvatar
                        user={{ ...currentUser, avatarMode: "google" }}
                        size="md"
                      />
                    </button>
                  )}
                </div>
              </div>
              <div className="account-row">
                <p className="account-row-title">{t("auth.displayName")}</p>
                <p className="account-row-value account-row-value-with-avatar">
                  <span>{currentUser.displayName}</span>
                </p>
              </div>
              <div
                className={`account-row ${isGoogleAccount ? "account-row-stacked" : ""}`}
              >
                <p className="account-row-title">
                  {isGoogleAccount
                    ? t("auth.googleAccount")
                    : t("auth.username")}
                </p>
                <p className="account-row-value">
                  {isGoogleAccount
                    ? currentUser.googleEmail
                    : currentUser.username}
                </p>
                {isGoogleAccount && (
                  <p className="text-xs text-slate-400">
                    {t("auth.googleLinkedPasswordDisabled")}
                  </p>
                )}
              </div>
              {!isGoogleAccount && (
                <>
                  {googleError && (
                    <div className="auth-error">{t(googleError)}</div>
                  )}
                  {googleSuccess && (
                    <p className="text-sm text-slate-500 text-center">
                      {t("auth.googleLinkSuccess")}
                    </p>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={() => setConfirmGoogleLink(true)}
                    disabled={googleLoading}
                  >
                    {googleLoading
                      ? t("common.loading")
                      : t("auth.linkGoogleAccount")}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {confirmGoogleLink && (
          <Modal
            title={t("auth.linkGoogleAccount")}
            onClose={() => setConfirmGoogleLink(false)}
          >
            <p className="text-xs text-slate-400">
              {t("auth.googleLinkPasswordDisabled")}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setConfirmGoogleLink(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={handleBindGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
          </Modal>
        )}

        {view === "register" && (
          <>
            <h3 style={{ fontWeight: 600 }}>{t("userMenu.addUser")}</h3>
            <form
              onSubmit={handleRegister}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div className="form-group">
                <label className="form-label">{t("auth.username")}</label>
                <input
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("auth.password")}</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  {t("auth.passwordWarning")}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">{t("auth.displayName")}</label>
                <input
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              {regError && <div className="auth-error">{t(regError)}</div>}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setView("manage")}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {t("common.create")}
                </button>
              </div>
            </form>
          </>
        )}

        {view === "manage" && (
          <>
            <div className="modal-header !p-0">
              <h3 style={{ fontWeight: 600 }}>{t("userMenu.manageUsers")}</h3>
              <button
                className="header-icon-btn"
                onClick={() => {
                  setUsername("");
                  setPassword("");
                  setDisplayName("");
                  setRegError("");
                  setReturnView("manage");
                  setView("register");
                }}
                title={t("userMenu.addUser")}
                aria-label={t("userMenu.addUser")}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
            <div className="member-list-settings">
              {activeUsers.map((u) => (
                <div key={u.id} className="member-row">
                  <UserAvatar user={u} />
                  {editingUserId === u.id ? (
                    <>
                      <input
                        className="form-input flex-1 !py-1"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                      />
                      <button
                        className="header-icon-btn"
                        onClick={() => setEditingUserId(null)}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                      <button
                        className="header-icon-btn text-green-500"
                        onClick={() => handleSaveName(u.id)}
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          flex: 1,
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                        onClick={() => {
                          setEditingUserId(u.id);
                          setEditingName(u.displayName);
                        }}
                      >
                        {u.displayName}
                      </span>
                      {(u.id !== currentUser.id || !!adminSessionId) && (
                        <button
                          className="header-icon-btn"
                          onClick={() => handleSwitchUser(u)}
                          title={t("userMenu.switchUser")}
                          aria-label={t("userMenu.switchUser")}
                        >
                          <FontAwesomeIcon icon={faRightLeft} />
                        </button>
                      )}
                      {u.id !== realAdminId &&
                        (u.id !== currentUser.id || !!adminSessionId) && (
                          <button
                            className="header-icon-btn text-red-400"
                            onClick={() => setConfirmDelete(u.id)}
                            title={t("common.delete")}
                            aria-label={t("common.delete")}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => setView("menu")}
            >
              {t("common.back")}
            </button>

            {confirmDelete && deleteTarget && (
              <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm mb-2">
                  {t("userMenu.deleteUserConfirm", {
                    name: deleteTarget.displayName,
                  })}
                </p>
                <div className="flex gap-2">
                  <button
                    className="btn btn-secondary flex-1 btn-sm"
                    onClick={() => setConfirmDelete(null)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn btn-sm flex-1 bg-red-500 text-white"
                    onClick={() => handleDeleteUser(confirmDelete)}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {view === "resetpw" && (
          <>
            <h3 style={{ fontWeight: 600 }}>{t("auth.resetPassword")}</h3>
            {resetSuccess ? (
              <>
                <p className="text-sm text-slate-500 text-center">
                  {t("auth.passwordResetSuccess")}
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%" }}
                  onClick={() => setView(returnView)}
                >
                  {t("common.back")}
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newPassword) return;
                  updateUser({ ...currentUser, password: newPassword });
                  setResetSuccess(true);
                }}
              >
                <div className="form-group">
                  <label className="form-label">{t("auth.newPassword")}</label>
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t("auth.passwordWarning")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary flex-1"
                    onClick={() => setView(returnView)}
                  >
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    {t("common.confirm")}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
