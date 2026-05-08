import type { MemoryPost } from "../../types";

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
  return post.images.map((image) => image.path);
}
