export const IMAGE_DELETE_RETRY_ATTEMPTS = 3;

export async function deleteImagePathWithRetry(
  path: string,
  remove: (path: string) => Promise<void>,
  attempts = IMAGE_DELETE_RETRY_ATTEMPTS,
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await remove(path);
      return true;
    } catch {
      if (attempt === attempts) return false;
    }
  }

  return false;
}

export async function deleteImagePathsWithRetry(
  paths: string[],
  remove: (path: string) => Promise<void>,
  attempts = IMAGE_DELETE_RETRY_ATTEMPTS,
): Promise<string[]> {
  const results = await Promise.all(
    paths.map(async (path) => ({
      path,
      deleted: await deleteImagePathWithRetry(path, remove, attempts),
    })),
  );

  return results
    .filter((result) => !result.deleted)
    .map((result) => result.path);
}
