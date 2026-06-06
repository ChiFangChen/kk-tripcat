import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { FullScreenModal } from "../../components/FullScreenModal";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { useDoubleTap } from "../../hooks/useDoubleTap";
import { generateId } from "../../utils/id";
import { ImageGalleryField } from "../../components/ImageGalleryField";
import { MultiImageUpload } from "../../components/MultiImageUpload";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import type { TipNote } from "../../types";
import type { ImageAsset, PendingImageFile } from "../../types/images";

export function TipsSection() {
  const { t } = useTranslation();
  const { state, firebaseConnected, setTips, showToast } = useApp();
  const [editing, setEditing] = useState<TipNote | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const detailDoubleTap = useDoubleTap();

  const allTags = [...new Set(state.tips.flatMap((t) => t.tags))];

  const filtered = state.tips.filter((tip) => {
    if (filterTag && !tip.tags.includes(filterTag)) return false;
    if (
      searchText &&
      !tip.title.toLowerCase().includes(searchText.toLowerCase()) &&
      !tip.content.toLowerCase().includes(searchText.toLowerCase())
    )
      return false;
    return true;
  });

  function warnReadOnly() {
    showToast({ type: "info", message: t("notes.readOnlyOffline") });
  }

  async function save(tip: TipNote) {
    if (!firebaseConnected) {
      warnReadOnly();
      return;
    }
    const exists = state.tips.find((t) => t.id === tip.id);
    const updatedAt = new Date().toISOString();
    if (exists) {
      await setTips(
        state.tips.map((entry) =>
          entry.id === tip.id ? { ...tip, updatedAt } : entry,
        ),
      );
    } else {
      await setTips([tip, ...state.tips]);
    }
    setEditing(null);
  }

  async function remove(id: string) {
    if (!firebaseConnected) {
      warnReadOnly();
      return;
    }
    const tip = state.tips.find((entry) => entry.id === id);
    if (tip) {
      await Promise.all(tip.images.map((image) => deleteImage(image.path)));
    }
    await setTips(state.tips.filter((tip) => tip.id !== id));
  }

  function newTip(): TipNote {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      title: "",
      content: "",
      tags: [],
      images: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <input
          className="form-input mr-3"
          placeholder={t("notes.searchPlaceholder")}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button
          className="btn-round-add"
          onClick={() => {
            if (!firebaseConnected) {
              warnReadOnly();
              return;
            }
            setEditing(newTip());
          }}
          disabled={!firebaseConnected}
          aria-disabled={!firebaseConnected}
          title={
            firebaseConnected ? t("notes.addTip") : t("notes.readOnlyOffline")
          }
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          <button
            className={`tag cursor-pointer ${!filterTag ? "opacity-100" : "opacity-50"}`}
            onClick={() => setFilterTag(null)}
          >
            {t("notes.all")}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag cursor-pointer ${filterTag === tag ? "opacity-100" : "opacity-50"}`}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{t("notes.empty")}</p>
        </div>
      ) : (
        filtered.map((tip) => (
          <div
            key={tip.id}
            className="card cursor-pointer"
            onClick={detailDoubleTap("tip-detail-title", () => {
              if (!firebaseConnected) {
                warnReadOnly();
                return;
              }
              setEditing(tip);
            })}
          >
            <h3 className="font-semibold mb-1">{tip.title}</h3>
            <p className="text-sm text-slate-500 whitespace-pre-wrap mb-2">
              {tip.content}
            </p>
            <div className="flex flex-wrap gap-1">
              {tip.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            <ImageGalleryField images={tip.images} className="mt-2" />
          </div>
        ))
      )}

      {editing && (
        <FullScreenModal
          title={editing.title ? t("notes.editTip") : t("notes.newTip")}
          onClose={() => setEditing(null)}
        >
          <TipForm
            tip={editing}
            onSave={save}
            onCancel={() => setEditing(null)}
            onDelete={() => setConfirmDeleteId(editing.id)}
          />
        </FullScreenModal>
      )}
      {confirmDeleteId && (
        <ConfirmDeleteModal
          title={t("notes.deleteTip")}
          message={t("notes.deleteTipConfirm")}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            remove(confirmDeleteId);
            setConfirmDeleteId(null);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TipForm({
  tip,
  onSave,
  onCancel,
  onDelete,
}: {
  tip: TipNote;
  onSave: (t: TipNote) => void | Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { state } = useApp();
  const [form, setForm] = useState(tip);
  const [tagsInput, setTagsInput] = useState(tip.tags.join(", "));
  const [pendingImages, setPendingImages] = useState<PendingImageFile[]>([]);
  const [removedImages, setRemovedImages] = useState<ImageAsset[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await persistImagesForRecord({
        existingImages: form.images,
        pendingImages,
        removedImages,
        basePath: `tc-images/users/${state.auth.currentUser?.id || "anonymous"}/tips/${tip.id}`,
        createdAt: new Date().toISOString(),
        upload: uploadImage,
        remove: deleteImage,
        onPersist: async (images) => {
          await onSave({
            ...form,
            images,
            tags: tagsInput
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          });
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fullscreen-modal-form">
      <div className="form-group">
        <label className="form-label">{t("notes.titleLabel")}</label>
        <input
          className="form-input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("notes.content")}</label>
        <textarea
          className="form-input"
          rows={6}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("notes.tagsCommaSeparated")}</label>
        <input
          className="form-input"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("notes.images")}</label>
        <MultiImageUpload
          existingImages={form.images}
          pendingImages={pendingImages}
          onAddFiles={(files) =>
            setPendingImages((current) => [
              ...current,
              ...createPendingImages(files, generateId),
            ])
          }
          onRemoveExisting={(imageId) => {
            const image = form.images.find((entry) => entry.id === imageId);
            if (!image) return;
            setRemovedImages((current) => [...current, image]);
            setForm({
              ...form,
              images: form.images.filter((entry) => entry.id !== imageId),
            });
          }}
          onRemovePending={(imageId) =>
            setPendingImages((current) =>
              current.filter((entry) => entry.imageId !== imageId),
            )
          }
        />
      </div>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel} type="button">
          {t("common.cancel")}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {tip.title && (
          <button className="btn btn-danger" onClick={onDelete}>
            {t("common.delete")}
          </button>
        )}
      </div>
    </div>
  );
}
