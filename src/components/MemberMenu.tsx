import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faCrown,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../context/AppContext";
import { Modal } from "./Modal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { useTranslation } from "react-i18next";

interface Props {
  tripId: string;
  onClose: () => void;
  readOnly?: boolean;
}

export function MemberMenu({ tripId, onClose, readOnly }: Props) {
  const { t } = useTranslation();
  const { state, updateTrip, getUserName, getUserColor, isTripAdmin } =
    useApp();
  const trip = state.trips.find((t) => t.id === tripId);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<
    string | null
  >(null);
  const admin = trip ? isTripAdmin(trip) : false;
  const canEdit = admin && !readOnly;

  if (!trip) return null;

  const members = trip.members;
  const nonMembers = state.users.filter(
    (u) => !u.deleted && !members.includes(u.id),
  );

  function addMember() {
    if (!selectedUserId || !trip) return;
    updateTrip({ ...trip, members: [...members, selectedUserId] });
    setSelectedUserId("");
    setShowAddMember(false);
  }

  function removeMember(userId: string) {
    if (!trip || userId === trip.creatorId) return;
    updateTrip({ ...trip, members: members.filter((m) => m !== userId) });
  }

  return (
    <Modal title={t("members.title")} onClose={onClose}>
      <div className="flex flex-col gap-2">
        {members.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">{t("members.empty")}</p>
        ) : (
          members.map((userId) => (
            <div key={userId} className="flex items-center gap-2 py-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: getUserColor(userId) }}
              />
              {userId === trip.creatorId && (
                <FontAwesomeIcon
                  icon={faCrown}
                  className="text-amber-400 text-xs"
                />
              )}
              <span className="flex-1 text-sm font-medium">
                {getUserName(userId)}
              </span>
              {canEdit && userId !== trip.creatorId && (
                <button
                  className="text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                  onClick={() => setConfirmRemoveMemberId(userId)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
            </div>
          ))
        )}

        {canEdit && !showAddMember && nonMembers.length > 0 && (
          <button
            className="btn btn-secondary w-full mt-2"
            onClick={() => setShowAddMember(true)}
          >
            <FontAwesomeIcon icon={faUserPlus} className="mr-1" />
            {t("members.add")}
          </button>
        )}

        {canEdit && showAddMember && (
          <div className="mt-2 flex flex-col gap-2">
            <select
              className="form-input"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">{t("members.selectUser")}</option>
              {nonMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setShowAddMember(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={addMember}
                disabled={!selectedUserId}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                {t("common.add")}
              </button>
            </div>
          </div>
        )}
      </div>
      {confirmRemoveMemberId && (
        <ConfirmDeleteModal
          title={t("members.remove")}
          message={t("members.removeConfirm", {
            name: getUserName(confirmRemoveMemberId),
          })}
          confirmLabel="userMenu.remove"
          onCancel={() => setConfirmRemoveMemberId(null)}
          onConfirm={() => {
            removeMember(confirmRemoveMemberId);
            setConfirmRemoveMemberId(null);
          }}
        />
      )}
    </Modal>
  );
}
