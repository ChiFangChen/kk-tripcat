import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faLink,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { Modal } from "../../components/Modal";
import { FullScreenModal } from "../../components/FullScreenModal";
import { generateId } from "../../utils/id";
import { formatDate } from "../../utils/date";
import { ImageUpload } from "../../components/ImageUpload";
import type { ShoppingItem, FavoriteItem } from "../../types";

interface Props {
  tripId: string;
  viewOnly?: boolean;
}

export function ShoppingTab({ tripId, viewOnly }: Props) {
  const { state, dispatch, setUserTripData, getTripData } = useApp();
  const tripData = getTripData(tripId);
  const items = tripData.shopping || [];
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [matchingFavorites, setMatchingFavorites] = useState<FavoriteItem[]>(
    [],
  );
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const doubleTap = useDoubleTap();

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const displayed = showCompleted ? items : unchecked;

  function toggleCheck(id: string) {
    if (viewOnly) return;
    const updated = items.map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i,
    );
    setUserTripData(tripId, { shopping: updated });
  }

  function openAdd() {
    setNewItem("");
    setMatchingFavorites([]);
    setPendingItem(null);
    setShowAddModal(true);
  }

  function addItem() {
    if (!newItem.trim()) return;
    const text = newItem.trim();

    const matches = state.favorites.filter(
      (f) =>
        f.name.toLowerCase().includes(text.toLowerCase()) ||
        text.toLowerCase().includes(f.name.toLowerCase()),
    );

    if (matches.length > 0) {
      setMatchingFavorites(matches);
      setPendingItem(text);
    } else {
      createItem(text);
    }
  }

  function createItem(text: string, favoriteId?: string) {
    const item: ShoppingItem = {
      id: generateId(),
      text,
      checked: false,
      starred: !!favoriteId,
      favoriteId,
    };
    setUserTripData(tripId, { shopping: [...items, item] });
    setNewItem("");
    setMatchingFavorites([]);
    setPendingItem(null);
    setShowAddModal(false);
  }

  function updateItem(updated: ShoppingItem) {
    setUserTripData(tripId, {
      shopping: items.map((i) => (i.id === updated.id ? updated : i)),
    });
    setEditingItem(null);
  }

  function deleteItem(id: string) {
    setUserTripData(tripId, { shopping: items.filter((i) => i.id !== id) });
    setEditingItem(null);
  }

  function toggleStar(item: ShoppingItem) {
    if (viewOnly) return;

    if (item.starred && item.favoriteId) {
      const fav = state.favorites.find((f) => f.id === item.favoriteId);
      if (fav && fav.purchases.length > 0) {
        alert("此商品已有購買紀錄，請到筆記 > 喜歡的東西中刪除");
        return;
      }
      const updated = items.map((i) =>
        i.id === item.id ? { ...i, starred: false, favoriteId: undefined } : i,
      );
      setUserTripData(tripId, { shopping: updated });
      if (fav) {
        dispatch({ type: "DELETE_FAVORITE", favoriteId: fav.id });
      }
    } else {
      const newFav: FavoriteItem = {
        id: generateId(),
        name: item.text,
        purchases: [],
      };
      dispatch({ type: "ADD_FAVORITE", favorite: newFav });
      const updated = items.map((i) =>
        i.id === item.id ? { ...i, starred: true, favoriteId: newFav.id } : i,
      );
      setUserTripData(tripId, { shopping: updated });
    }
  }

  function getFavoriteHistory(favoriteId?: string) {
    if (!favoriteId) return null;
    const fav = state.favorites.find((f) => f.id === favoriteId);
    if (!fav || fav.purchases.length === 0) return null;
    return fav;
  }

  return (
    <div>
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
        {!viewOnly && (
          <button className="btn-round-add" onClick={openAdd}>
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${!showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
          onClick={() => setShowCompleted(false)}
        >
          未買 ({unchecked.length})
        </button>
        <button
          className={`flex-1 text-xs py-1.5 rounded-md transition-all ${showCompleted ? "bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-sm font-medium" : "text-slate-400"}`}
          onClick={() => setShowCompleted(true)}
        >
          全部 ({items.length})
        </button>
      </div>

      <div className="card">
        {displayed.map((item) => (
          <div
            key={item.id}
            className={`checklist-item ${item.checked ? "checked" : ""}`}
            onClick={doubleTap(
              item.id,
              () => !viewOnly && setEditingItem(item),
            )}
          >
            {!viewOnly && (
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(item.id)}
                className="w-5 h-5 flex-shrink-0"
              />
            )}
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="w-8 h-8 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <span className="text-sm">{item.text}</span>
              {item.starred &&
                (() => {
                  const fav = getFavoriteHistory(item.favoriteId);
                  if (!fav) return null;
                  const latest = fav.purchases[0];
                  return (
                    <p className="text-xs text-slate-400">
                      上次：{latest.amount}
                      {latest.currency ? ` ${latest.currency}` : ""} (
                      {formatDate(latest.date)})
                    </p>
                  );
                })()}
            </div>
            {!viewOnly && (
              <button
                className={`star-btn ${item.starred ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(item);
                }}
              >
                <FontAwesomeIcon
                  icon={faStar}
                  className={item.starred ? "" : "opacity-25"}
                />
              </button>
            )}
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="py-4 text-center text-sm text-slate-400">
            {showCompleted ? "購物清單是空的" : "全部買好了！"}
          </div>
        )}
      </div>

      {editingItem && (
        <Modal title="編輯項目" onClose={() => setEditingItem(null)}>
          <EditShoppingForm
            item={editingItem}
            onSave={updateItem}
            onDelete={() => deleteItem(editingItem.id)}
          />
        </Modal>
      )}

      {showAddModal && (
        <FullScreenModal
          title="新增購物項目"
          onClose={() => setShowAddModal(false)}
        >
          <div className="form-group">
            <label className="form-label">品名</label>
            <input
              className="form-input"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              autoFocus
            />
          </div>

          {matchingFavorites.length > 0 && pendingItem && (
            <div className="card mb-4 border-amber-300">
              <p className="text-sm mb-2">
                找到相似的「喜歡的東西」，要連結嗎？
              </p>
              {matchingFavorites.map((fav) => (
                <button
                  key={fav.id}
                  className="btn btn-sm btn-primary mr-2 mb-1"
                  onClick={() => createItem(pendingItem, fav.id)}
                >
                  <FontAwesomeIcon icon={faLink} className="mr-1" />
                  {fav.name}
                </button>
              ))}
              <button
                className="btn btn-sm btn-secondary mb-1"
                onClick={() => createItem(pendingItem)}
              >
                不連結，直接新增
              </button>
            </div>
          )}

          <button className="btn btn-primary w-full" onClick={addItem}>
            新增
          </button>
        </FullScreenModal>
      )}
    </div>
  );
}

function EditShoppingForm({
  item,
  onSave,
  onDelete,
}: {
  item: ShoppingItem;
  onSave: (i: ShoppingItem) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState(item);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">品名</label>
        <input
          className="form-input"
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">圖片</label>
        <ImageUpload
          imageUrl={form.imageUrl}
          storagePath="tc-images/shopping"
          onUploaded={(url) => setForm({ ...form, imageUrl: url })}
          onRemoved={() => setForm({ ...form, imageUrl: undefined })}
        />
      </div>
      <button className="btn btn-primary w-full" onClick={() => onSave(form)}>
        儲存
      </button>
      <button className="btn btn-secondary w-full mt-2" onClick={onDelete}>
        <FontAwesomeIcon icon={faTrash} className="mr-1" />
        刪除
      </button>
    </div>
  );
}
