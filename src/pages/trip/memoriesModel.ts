import type { MemoryComment, MemoryPost } from "../../types";

export function canSaveMemoryEntry({
  content,
  images,
}: {
  content: string;
  images: unknown[];
}): boolean {
  return content.trim().length > 0 || images.length > 0;
}

export function sortMemoryPosts(posts: MemoryPost[]): MemoryPost[] {
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sortMemoryComments(
  comments: MemoryComment[],
): MemoryComment[] {
  return [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function isMemoryEntryPublic(
  entry: { visibility?: "public" | "private" },
): boolean {
  return entry.visibility !== "private";
}

export function filterViewerMemoryPosts(posts: MemoryPost[]): MemoryPost[] {
  return posts
    .filter(isMemoryEntryPublic)
    .map((post) => ({
      ...post,
      comments: post.comments.filter(isMemoryEntryPublic),
    }));
}

export function canEditMemoryEntry(
  entry: { authorId: string },
  currentUserId: string | null | undefined,
): boolean {
  return !!currentUserId && entry.authorId === currentUserId;
}

export function canDeleteMemoryEntry(
  entry: { authorId: string },
  currentUserId: string | null | undefined,
  isAdmin: boolean,
): boolean {
  return isAdmin || canEditMemoryEntry(entry, currentUserId);
}

export function getMemoryPostImagePaths(post: MemoryPost): string[] {
  return [
    ...post.images.map((image) => image.path),
    ...post.comments.flatMap((comment) =>
      comment.images.map((image) => image.path),
    ),
  ];
}

export function formatMemoryTimestamp(
  value: string,
  now = new Date(),
): string {
  const date = new Date(value);
  const datePart =
    date.getFullYear() === now.getFullYear()
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;

  return `${datePart} ${timePart}`;
}
