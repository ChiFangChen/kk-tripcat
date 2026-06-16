import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faSuitcaseRolling,
  faThumbtack,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { FullScreenModal } from "../../components/FullScreenModal";
import { Modal } from "../../components/Modal";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { EditIconButton } from "../../components/EditIconButton";
import {
  ItemEditorForm,
  type ItemEditorResult,
} from "../../components/ItemEditorForm";
import { generateId } from "../../utils/id";
import type { ChecklistItem } from "../../types";
import { useTranslation } from "react-i18next";

interface Props {
  tripId: string;
  viewOnly?: boolean;
  hideEditButtons?: boolean;
}

export function PreparationTab({ tripId, viewOnly, hideEditButtons }: Props) {
  const { t } = useTranslation();
  const { setUserTripData, getTripData } = useApp();
  const tripData = getTripData(tripId);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(
    null,
  );
  const [fabExpanded, setFabExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const doubleTap = useDoubleTap();

  const items = tripData.checklist;
  const notes = tripData.preparationNotes;
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const displayed = showCompleted ? items : unchecked;
  const otherCategory = t("preparation.other");

  // Build categories with subcategories from flat checklist
  function getCategoryInfos() {
    const catMap = new Map<string, Set<string>>();
    for (const item of items) {
      const cat = item.category || otherCategory;
      if (!catMap.has(cat)) catMap.set(cat, new Set());
      if (item.subcategory) catMap.get(cat)!.add(item.subcategory);
    }
    return Array.from(catMap.entries()).map(([name, subs]) => ({
      name,
      subcategories: Array.from(subs),
    }));
  }

  // Group by category, preserving order
  const categoryOrder: string[] = [];
  const grouped: Record<string, ChecklistItem[]> = {};
  for (const item of displayed) {
    const cat = item.category || otherCategory;
    if (!grouped[cat]) {
      grouped[cat] = [];
      categoryOrder.push(cat);
    }
    grouped[cat].push(item);
  }

  function toggleCheck(id: string) {
    if (viewOnly) return;
    const updated = items.map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i,
    );
    setUserTripData(tripId, { checklist: updated });
  }

  function handleAddItem(result: ItemEditorResult) {
    if (viewOnly) return;
    const item: ChecklistItem = {
      id: generateId(),
      text: result.text,
      checked: false,
      category: result.category || otherCategory,
      subcategory: result.subcategory,
    };
    setUserTripData(tripId, { checklist: [...items, item] });
    setShowAddModal(false);
  }

  function handleEditItem(result: ItemEditorResult) {
    if (viewOnly || !editingItem) return;
    setUserTripData(tripId, {
      checklist: items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              text: result.text,
              category: result.category || i.category,
              subcategory: result.subcategory,
            }
          : i,
      ),
    });
    setEditingItem(null);
  }

  function deleteItem(id: string) {
    if (viewOnly) return;
    setUserTripData(tripId, { checklist: items.filter((i) => i.id !== id) });
    setEditingItem(null);
  }

  function closeFab() {
    setFabExpanded(false);
  }

  function handleFabToggle() {
    if (viewOnly) return;
    setFabExpanded((prev) => !prev);
  }

  function handleFabConfirm() {
    if (viewOnly) return;
    setUserTripData(tripId, { gotReady: !tripData.gotReady });
    closeFab();
  }

  function openEditNotes() {
    if (viewOnly) return;
    setNotesText(notes);
    setEditingNotes(true);
  }

  function saveNotes() {
    if (viewOnly) return;
    setUserTripData(tripId, { preparationNotes: notesText });
    setEditingNotes(false);
  }

  return (
    <div>
      {fabExpanded && !viewOnly && (
        <div className="fixed inset-0 z-30" onClick={closeFab} />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">{t("tripTabs.preparation")}</h2>
      </div>

      {/* Got Ready FAB */}
      {!viewOnly && (
        <div className={`get-ready-fab ${fabExpanded ? "expanded" : ""}`}>
          <button
            className="got-ready-fab-icon"
            onClick={handleFabToggle}
            type="button"
          >
            <FontAwesomeIcon
              icon={tripData.gotReady ? faCircleCheck : faSuitcaseRolling}
            />
          </button>
          {fabExpanded && (
            <button
              className="got-ready-fab-label"
              onClick={handleFabConfirm}
              type="button"
            >
              {tripData.gotReady ? t("preparation.cancelReady") : t("preparation.getReady")}
            </button>
          )}
        </div>
      )}

      {/* Notes block - double tap title to edit */}
      {notes && (
        <div
          className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          onClick={
            viewOnly ? undefined : doubleTap("prep-notes", openEditNotes)
          }
        >
          <div className="editable-title mb-1">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              <FontAwesomeIcon icon={faThumbtack} className="mr-1" />
              {t("settings.template.notes")}
            </p>
            {!viewOnly && !hideEditButtons && (
              <EditIconButton onClick={openEditNotes} />
            )}
          </div>
          <p className="text-xs whitespace-pre-wrap text-slate-400 dark:text-slate-500">
            {notes}
          </p>
        </div>
      )}

      {/* Progress bar - full width */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: items.length
                  ? `${(checked.length / items.length) * 100}%`
                  : "0%",
                background:
                  checked.length === items.length && items.length > 0
                    ? "var(--color-success)"
                    : "var(--color-primary)",
              }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-400 w-8 text-right">
          {items.length ? Math.round((checked.length / items.length) * 100) : 0}
          %
        </span>
      </div>

      {/* Filter segmented control + add button */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1 flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${!showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
            onClick={() => setShowCompleted(false)}
          >
            {t("preparation.incomplete")} ({unchecked.length})
          </button>
          <button
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
            onClick={() => setShowCompleted(true)}
          >
            {t("preparation.all")} ({items.length})
          </button>
        </div>
        {!viewOnly && (
          <button
            className="btn-round-add"
            onClick={() => setShowAddModal(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {/* Grouped checklist */}
      {categoryOrder.map((category) => {
        const catItems = grouped[category];
        const subOrder: string[] = [];
        const subGrouped: Record<string, ChecklistItem[]> = {};
        for (const item of catItems) {
          const sub = item.subcategory || "";
          if (!(sub in subGrouped)) {
            subGrouped[sub] = [];
            subOrder.push(sub);
          }
          subGrouped[sub].push(item);
        }
        const hasSubs = subOrder.some((s) => s !== "");

        const renderItem = (item: ChecklistItem) => (
          <div
            key={item.id}
            className={`checklist-item ${item.checked ? "checked" : ""}`}
            onClick={
              viewOnly
                ? undefined
                : doubleTap(item.id, () => setEditingItem(item))
            }
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleCheck(item.id)}
              className="w-5 h-5 flex-shrink-0"
            />
            <span className="flex-1 text-sm">{item.text}</span>
            {!viewOnly && !hideEditButtons && (
              <EditIconButton onClick={() => setEditingItem(item)} />
            )}
          </div>
        );

        return (
          <div key={category} className="mb-4">
            <h3 className="text-sm font-semibold text-slate-500 mb-1">
              {category}
            </h3>
            <div className="card">
              {subOrder.map((sub) => (
                <div key={sub || "_none"}>
                  {hasSubs && sub && (
                    <p className="text-xs font-medium text-slate-400 mt-2 mb-0.5 first:mt-0 px-1">
                      {sub}
                    </p>
                  )}
                  {subGrouped[sub].map(renderItem)}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {displayed.length === 0 && (
        <div className="empty-state">
          <p>{showCompleted ? t("preparation.emptyList") : t("preparation.everythingReady")}</p>
        </div>
      )}

      {/* Edit item */}
      {editingItem && (
        <FullScreenModal
          title={t("settings.template.editItem")}
          onClose={() => setEditingItem(null)}
        >
          <ItemEditorForm
            categories={getCategoryInfos()}
            initialCategory={editingItem.category || otherCategory}
            initialSubcategory={editingItem.subcategory}
            initialText={editingItem.text}
            saveLabel={t("common.save")}
            onSave={handleEditItem}
            onCancel={() => setEditingItem(null)}
            onDelete={() => setConfirmDeleteItemId(editingItem.id)}
          />
        </FullScreenModal>
      )}
      {confirmDeleteItemId && (
        <ConfirmDeleteModal
          title={t("settings.template.deletePreparationItem")}
          message={t("settings.template.deletePreparationItemConfirm")}
          onCancel={() => setConfirmDeleteItemId(null)}
          onConfirm={() => {
            deleteItem(confirmDeleteItemId);
            setConfirmDeleteItemId(null);
          }}
        />
      )}

      {/* Edit notes modal */}
      {editingNotes && (
        <Modal title={t("settings.template.editNotes")} onClose={() => setEditingNotes(false)}>
          <textarea
            className="form-input"
            rows={5}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            autoFocus
          />
          <div className="form-actions mt-3">
            <button
              className="btn btn-secondary"
              onClick={() => setEditingNotes(false)}
            >
              {t("common.cancel")}
            </button>
            <button className="btn btn-primary" onClick={saveNotes}>
              {t("common.save")}
            </button>
          </div>
        </Modal>
      )}

      {/* Add item */}
      {showAddModal && (
        <FullScreenModal
          title={t("settings.template.addPreparationItem")}
          onClose={() => setShowAddModal(false)}
        >
          <ItemEditorForm
            categories={getCategoryInfos()}
            saveLabel={t("common.add")}
            onSave={handleAddItem}
            onCancel={() => setShowAddModal(false)}
          />
        </FullScreenModal>
      )}
    </div>
  );
}
