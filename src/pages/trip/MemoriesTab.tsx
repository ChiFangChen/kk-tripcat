import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComment,
  faPen,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../../context/AppContext";
import { FullScreenModal } from "../../components/FullScreenModal";
import { Modal } from "../../components/Modal";
import { ImageGalleryField } from "../../components/ImageGalleryField";
import { MultiImageUpload } from "../../components/MultiImageUpload";
import { SwitchControl } from "../../components/SwitchControl";
import { deleteImage, uploadImage } from "../../utils/firebase";
import {
  createPendingImages,
  persistImagesForRecord,
} from "../../utils/imageUpload";
import { generateId } from "../../utils/id";
import type { ImageAsset, PendingImageFile } from "../../types/images";
import type { MemoryComment, MemoryPost } from "../../types";
import {
  canDeleteMemoryEntry,
  canEditMemoryEntry,
  canSaveMemoryEntry,
  formatMemoryTimestamp,
  getMemoryPostImagePaths,
  sortMemoryComments,
  sortMemoryPosts,
} from "./memoriesModel";

interface Props {
  tripId: string;
  viewOnly?: boolean;
}

export function MemoriesTab({ tripId, viewOnly }: Props) {
  const { t } = useTranslation();
  const {
    state,
    getTripData,
    setSharedTripData,
    updateTrip,
    getUserName,
    getUserColor,
    isTripAdmin,
  } = useApp();
  const trip = state.trips.find((entry) => entry.id === tripId);
  const tripData = getTripData(tripId);
  const posts = sortMemoryPosts(tripData.memories || []);
  const currentUserId = state.auth.currentUser?.id || null;
  const admin = !!trip && isTripAdmin(trip);
  const canWrite = !viewOnly && !!currentUserId;

  const [editingPost, setEditingPost] = useState<MemoryPost | null>(null);
  const [editingComment, setEditingComment] = useState<{
    postId: string;
    comment: MemoryComment;
  } | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState<MemoryPost | null>(
    null,
  );
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<{
    postId: string;
    comment: MemoryComment;
  } | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<boolean | null>(
    null,
  );

  function newPost(): MemoryPost {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      title: "",
      content: "",
      images: [],
      authorId: currentUserId || "anonymous",
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  function savePost(post: MemoryPost) {
    const normalizedPost = {
      ...post,
      title: post.title?.trim() || undefined,
      content: post.content.trim(),
      updatedAt: new Date().toISOString(),
    };
    const exists = posts.some((entry) => entry.id === normalizedPost.id);
    const nextPosts = exists
      ? posts.map((entry) =>
          entry.id === normalizedPost.id ? normalizedPost : entry,
        )
      : [normalizedPost, ...posts];
    setSharedTripData(tripId, { memories: nextPosts });
    setEditingPost(null);
  }

  function newComment(): MemoryComment {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      content: "",
      images: [],
      authorId: currentUserId || "anonymous",
      createdAt: now,
      updatedAt: now,
    };
  }

  function saveComment(postId: string, comment: MemoryComment) {
    const normalizedComment = {
      ...comment,
      content: comment.content.trim(),
      updatedAt: new Date().toISOString(),
    };
    const nextPosts = posts.map((post) => {
      if (post.id !== postId) return post;
      const exists = post.comments.some(
        (entry) => entry.id === normalizedComment.id,
      );
      const comments = exists
        ? post.comments.map((entry) =>
            entry.id === normalizedComment.id ? normalizedComment : entry,
          )
        : [...post.comments, normalizedComment];

      return {
        ...post,
        comments,
        updatedAt: new Date().toISOString(),
      };
    });
    setSharedTripData(tripId, { memories: nextPosts });
    setEditingComment(null);
  }

  async function deletePost(post: MemoryPost) {
    await Promise.all(getMemoryPostImagePaths(post).map(deleteImage));
    setSharedTripData(tripId, {
      memories: posts.filter((entry) => entry.id !== post.id),
    });
    setEditingPost(null);
    setConfirmDeletePost(null);
  }

  async function deleteComment(postId: string, comment: MemoryComment) {
    await Promise.all(comment.images.map((image) => deleteImage(image.path)));
    const nextPosts = posts.map((post) =>
      post.id === postId
        ? {
            ...post,
            comments: post.comments.filter((entry) => entry.id !== comment.id),
            updatedAt: new Date().toISOString(),
          }
        : post,
    );
    setSharedTripData(tripId, { memories: nextPosts });
    setEditingComment(null);
    setConfirmDeleteComment(null);
  }

  function renderAuthorMeta(authorId: string, createdAt: string) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-6 h-6 rounded-full flex-shrink-0"
          style={{ backgroundColor: getUserColor(authorId) }}
        />
        <div className="min-w-0 text-xs text-slate-400">
          <span>{getUserName(authorId)}</span>
          <span> · {formatMemoryTimestamp(createdAt)}</span>
        </div>
      </div>
    );
  }

  function confirmVisibilityChange(visible: boolean) {
    if (!trip) return;
    updateTrip(trip, { memoriesVisibleToViewers: visible });
    setPendingVisibility(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-2">
          {admin && !viewOnly && (
            <SwitchControl
              checked={!!trip?.memoriesVisibleToViewers}
              onChange={setPendingVisibility}
              ariaLabel={t("memories.publicRecords")}
              title={t("memories.publicRecords")}
            />
          )}
        </div>
        {canWrite && (
          <button
            className="btn-round-add"
            onClick={() => setEditingPost(newPost())}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <p>{t("memories.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const canEdit = canEditMemoryEntry(post, currentUserId);
            const canDelete = canDeleteMemoryEntry(post, currentUserId, admin);

            return (
              <div key={post.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  {renderAuthorMeta(post.authorId, post.createdAt)}
                  {canWrite && (canEdit || canDelete) && (
                    <button
                      className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                      onClick={() =>
                        canEdit
                          ? setEditingPost(post)
                          : setConfirmDeletePost(post)
                      }
                    >
                      <FontAwesomeIcon icon={canEdit ? faPen : faTrash} />
                    </button>
                  )}
                </div>

                {post.title && (
                  <h3 className="font-semibold mb-2">{post.title}</h3>
                )}
                {post.content && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap mb-2">
                    {post.content}
                  </p>
                )}
                <ImageGalleryField images={post.images} />
                {sortMemoryComments(post.comments).length > 0 && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                    {sortMemoryComments(post.comments).map((comment) => {
                      const canEditComment = canEditMemoryEntry(
                        comment,
                        currentUserId,
                      );
                      const canDeleteComment = canDeleteMemoryEntry(
                        comment,
                        currentUserId,
                        admin,
                      );

                      return (
                        <div
                          key={comment.id}
                          className="pl-3 border-l border-slate-200 dark:border-slate-700"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            {renderAuthorMeta(
                              comment.authorId,
                              comment.createdAt,
                            )}
                            {canWrite &&
                              (canEditComment || canDeleteComment) && (
                                <button
                                  className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                                  onClick={() =>
                                    canEditComment
                                      ? setEditingComment({
                                          postId: post.id,
                                          comment,
                                        })
                                      : setConfirmDeleteComment({
                                          postId: post.id,
                                          comment,
                                        })
                                  }
                                >
                                  <FontAwesomeIcon
                                    icon={canEditComment ? faPen : faTrash}
                                  />
                                </button>
                              )}
                          </div>
                          {comment.content && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap mb-2">
                              {comment.content}
                            </p>
                          )}
                          <ImageGalleryField images={comment.images} />
                        </div>
                      );
                    })}
                  </div>
                )}
                {canWrite && (
                  <button
                    className="btn btn-secondary btn-sm mt-3"
                    onClick={() =>
                      setEditingComment({
                        postId: post.id,
                        comment: newComment(),
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faComment} className="mr-1" />
                    {t("memories.comment")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingPost && (
        <FullScreenModal
          title={
            posts.some((post) => post.id === editingPost.id)
              ? t("memories.editMemory")
              : t("memories.addMemory")
          }
          onClose={() => setEditingPost(null)}
        >
          <MemoryPostForm
            tripId={tripId}
            post={editingPost}
            onSave={savePost}
            onCancel={() => setEditingPost(null)}
            onDelete={
              posts.some((post) => post.id === editingPost.id)
                ? () => setConfirmDeletePost(editingPost)
                : undefined
            }
          />
        </FullScreenModal>
      )}

      {editingComment && (
        <FullScreenModal
          title={
            posts
              .find((post) => post.id === editingComment.postId)
              ?.comments.some(
                (comment) => comment.id === editingComment.comment.id,
              )
              ? t("memories.editComment")
              : t("memories.addComment")
          }
          onClose={() => setEditingComment(null)}
        >
          <MemoryCommentForm
            tripId={tripId}
            postId={editingComment.postId}
            comment={editingComment.comment}
            onSave={saveComment}
            onCancel={() => setEditingComment(null)}
            onDelete={
              posts
                .find((post) => post.id === editingComment.postId)
                ?.comments.some(
                  (comment) => comment.id === editingComment.comment.id,
                )
                ? () => setConfirmDeleteComment(editingComment)
                : undefined
            }
          />
        </FullScreenModal>
      )}

      {confirmDeletePost && (
        <Modal
          title={t("memories.deleteMemory")}
          onClose={() => setConfirmDeletePost(null)}
        >
          <p className="text-sm mb-4">
            {t("memories.deleteMemoryConfirm")}
          </p>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary flex-1"
              onClick={() => setConfirmDeletePost(null)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-secondary btn-danger flex-1"
              onClick={() => deletePost(confirmDeletePost)}
            >
              {t("common.delete")}
            </button>
          </div>
        </Modal>
      )}

      {confirmDeleteComment && (
        <Modal
          title={t("memories.deleteComment")}
          onClose={() => setConfirmDeleteComment(null)}
        >
          <p className="text-sm mb-4">
            {t("memories.deleteCommentConfirm")}
          </p>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary flex-1"
              onClick={() => setConfirmDeleteComment(null)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-secondary btn-danger flex-1"
              onClick={() =>
                deleteComment(
                  confirmDeleteComment.postId,
                  confirmDeleteComment.comment,
                )
              }
            >
              {t("common.delete")}
            </button>
          </div>
        </Modal>
      )}

      {pendingVisibility !== null && (
        <Modal
          title={t("memories.publicRecords")}
          onClose={() => setPendingVisibility(null)}
        >
          <div className="text-sm mb-4">
            {pendingVisibility ? (
              <div>
                <p>{t("memories.publicOnDescription")}</p>
                <p>{t("memories.publicOnConfirm")}</p>
              </div>
            ) : (
              <div>
                <p>{t("memories.publicOffDescription")}</p>
                <p>{t("memories.publicOffConfirm")}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary flex-1"
              onClick={() => setPendingVisibility(null)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={() => confirmVisibilityChange(pendingVisibility)}
            >
              {t("common.confirm")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MemoryPostForm({
  tripId,
  post,
  onSave,
  onCancel,
  onDelete,
}: {
  tripId: string;
  post: MemoryPost;
  onSave: (post: MemoryPost) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(post);
  const [pendingImages, setPendingImages] = useState<PendingImageFile[]>([]);
  const [removedImages, setRemovedImages] = useState<ImageAsset[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = canSaveMemoryEntry({
    content: form.content,
    images: [...form.images, ...pendingImages],
  });

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await persistImagesForRecord({
        existingImages: form.images,
        pendingImages,
        removedImages,
        basePath: `tc-images/trips/${tripId}/memories/posts/${post.id}`,
        createdAt: new Date().toISOString(),
        upload: uploadImage,
        remove: deleteImage,
        onPersist: async (images) => onSave({ ...form, images }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">{t("memories.formTitle")}</label>
        <input
          className="form-input"
          value={form.title || ""}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("memories.content")}</label>
        <textarea
          className="form-input"
          value={form.content}
          onChange={(event) =>
            setForm({ ...form, content: event.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("memories.images")}</label>
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
          disabled={saving || !canSave}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
      {onDelete && (
        <button
          className="btn btn-secondary btn-danger w-full mt-2"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          {t("common.delete")}
        </button>
      )}
    </div>
  );
}

function MemoryCommentForm({
  tripId,
  postId,
  comment,
  onSave,
  onCancel,
  onDelete,
}: {
  tripId: string;
  postId: string;
  comment: MemoryComment;
  onSave: (postId: string, comment: MemoryComment) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(comment);
  const [pendingImages, setPendingImages] = useState<PendingImageFile[]>([]);
  const [removedImages, setRemovedImages] = useState<ImageAsset[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = canSaveMemoryEntry({
    content: form.content,
    images: [...form.images, ...pendingImages],
  });

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await persistImagesForRecord({
        existingImages: form.images,
        pendingImages,
        removedImages,
        basePath: `tc-images/trips/${tripId}/memories/posts/${postId}/comments/${comment.id}`,
        createdAt: new Date().toISOString(),
        upload: uploadImage,
        remove: deleteImage,
        onPersist: async (images) => onSave(postId, { ...form, images }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">{t("memories.content")}</label>
        <textarea
          className="form-input"
          value={form.content}
          onChange={(event) =>
            setForm({ ...form, content: event.target.value })
          }
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">{t("memories.images")}</label>
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
          disabled={saving || !canSave}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>
      {onDelete && (
        <button
          className="btn btn-secondary btn-danger w-full mt-2"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
          {t("common.delete")}
        </button>
      )}
    </div>
  );
}
