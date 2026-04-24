# Image Upload And Item Pool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add batch-save multi-image upload across the main content modules, and reshape shopping plus favorites into a pool-plus-trip model backed by Firebase Storage and Firestore metadata.

**Architecture:** Introduce a shared `ImageAsset` model and a reusable draft-image form workflow that batches compression and upload on save. Non-shopping modules migrate from `imageUrl` to `images[]`, while shopping is split into admin-owned pool `Item` records and trip-local `TripShoppingItem` records with admin promotion from trip drafts into the pool.

**Tech Stack:** React, TypeScript, Vite, Firebase Firestore, Firebase Storage, Font Awesome, local app context state

---

## File Structure

### Existing files to modify

- `src/types/index.ts`
- `src/utils/firebase.ts`
- `src/context/AppContext.tsx`
- `src/components/ImageUpload.tsx`
- `src/pages/trip/HotelTab.tsx`
- `src/pages/trip/ScheduleTab.tsx`
- `src/pages/trip/TransportTab.tsx`
- `src/pages/trip/ShoppingTab.tsx`
- `src/pages/notes/TipsSection.tsx`
- `src/pages/notes/FavoritesSection.tsx`

### New files recommended

- `src/types/images.ts`
- `src/utils/imageUpload.ts`
- `src/components/MultiImageUpload.tsx`
- `src/components/ImageGalleryField.tsx`
- `src/pages/trip/shoppingTypes.ts`

### Tests to add or update

- `src/utils/firebaseShared.test.ts`
- `src/pages/trip/tripEntry.test.ts`
- new test file: `src/utils/imageUpload.test.ts`
- new test file: `src/pages/trip/shoppingModel.test.ts`

## Chunk 1: Shared Image Model And Upload Pipeline

### Task 1: Define the shared image types

**Files:**

- Create: `src/types/images.ts`
- Modify: `src/types/index.ts`

- [ ] Add `ImageAsset`, `PendingImageFile`, and any helper discriminated types needed for form state.
- [ ] Replace `imageUrl?: string` with `images: ImageAsset[]` on:
  - `Hotel`
  - `ScheduleActivity`
  - `ScheduleNote`
  - `TransportItem`
  - `TipNote`
- [ ] Remove image fields from shopping and favorites old models as part of later refactor preparation.
- [ ] Run typecheck to surface breakage.

Run: `npm run build`
Expected: Type errors in old UI and helpers that still assume `imageUrl`.

### Task 2: Extract image compression and upload helpers

**Files:**

- Create: `src/utils/imageUpload.ts`
- Modify: `src/utils/firebase.ts`
- Test: `src/utils/imageUpload.test.ts`

- [ ] Move compression logic out of the current upload component into a reusable helper.
- [ ] Add helpers for:
  - `compressImageFile`
  - `uploadImageAsset`
  - `uploadPendingImagesBatch`
  - `deleteImagesByPath`
  - `copyImagesToNewPaths`
- [ ] Ensure helpers return `ImageAsset` objects, not raw URLs.
- [ ] Implement rollback for partially uploaded batches.
- [ ] Add tests for path generation assumptions and rollback behavior where practical.

Run: `npm run build`
Expected: Shared helpers compile even if consumers still fail.

### Task 3: Replace immediate-upload UI with batch-save form UI

**Files:**

- Modify: `src/components/ImageUpload.tsx`
- Create: `src/components/MultiImageUpload.tsx`
- Create: `src/components/ImageGalleryField.tsx`

- [ ] Stop using the current component as an uploader that immediately writes to Storage.
- [ ] Convert it into a display-focused or compatibility wrapper if needed.
- [ ] Build a new multi-image field component that:
  - shows existing remote images
  - shows pending local files
  - allows adding multiple files
  - allows removing both existing and pending entries
- [ ] Keep component ownership local to parent forms so save still happens in the page form.

Run: `npm run build`
Expected: Components compile; page callers still need migration.

## Chunk 2: Non-Shopping Module Migration

### Task 4: Upgrade hotel and transport forms to `images[]`

**Files:**

- Modify: `src/pages/trip/HotelTab.tsx`
- Modify: `src/pages/trip/TransportTab.tsx`

- [ ] Replace single-image form state with existing-remote plus pending-image state.
- [ ] On save, upload pending images to trip-scoped paths.
- [ ] On edit delete, delay Storage deletion until data write succeeds.
- [ ] Update list/detail displays to render galleries or first-image preview from `images[]`.

Run: `npm run build`
Expected: Hotel and transport compile with no `imageUrl` references.

### Task 5: Upgrade schedule models and forms to `images[]`

**Files:**

- Modify: `src/pages/trip/ScheduleTab.tsx`

- [ ] Migrate both `ScheduleActivity` and `ScheduleNote`.
- [ ] Update modal forms, detail views, and list previews.
- [ ] Reuse the shared upload helpers and components rather than copying logic.

Run: `npm run build`
Expected: Schedule compiles with no old image field usage.

### Task 6: Upgrade tips to `images[]`

**Files:**

- Modify: `src/pages/notes/TipsSection.tsx`

- [ ] Add multi-image support to tips.
- [ ] Keep tips admin-only behavior intact.
- [ ] Ensure Firestore sync still uses the same overall document strategy.

Run: `npm run build`
Expected: Tips compile cleanly.

## Chunk 3: Shopping And Favorites Data Refactor

### Task 7: Define the new shopping and pool types

**Files:**

- Create: `src/pages/trip/shoppingTypes.ts`
- Modify: `src/types/index.ts`
- Test: `src/pages/trip/shoppingModel.test.ts`

- [ ] Add `Item` and `TripShoppingItem` types.
- [ ] Add `promotedToPoolAt` and `promotedBy`.
- [ ] Add `estimatedAmount` and `currency` to both pool item and trip shopping item.
- [ ] Keep room for future trip overrides, but do not implement them yet.
- [ ] Remove or phase out old `FavoriteItem.imageUrl` and `ShoppingItem.imageUrl` assumptions.

Run: `npm run build`
Expected: Type failures in app context and tabs reveal all integration points.

### Task 8: Extend Firebase sync helpers for the pool

**Files:**

- Modify: `src/utils/firebase.ts`
- Modify: `src/context/AppContext.tsx`
- Test: `src/utils/firebaseShared.test.ts`

- [ ] Add subscription and sync helpers for the new item pool collection.
- [ ] Decide whether to store pool items in a dedicated doc per admin user or in a new collection structure aligned with current repo patterns.
- [ ] Wire pool items into app context state.
- [ ] Preserve current offline/local-cache style where feasible.

Run: `npm run build`
Expected: Context compiles with new item pool state shape.

### Task 9: Convert favorites into a view over pool items

**Files:**

- Modify: `src/pages/notes/FavoritesSection.tsx`
- Modify: `src/context/AppContext.tsx`

- [ ] Replace the old standalone favorite editing flow with item-pool editing filtered by `isFavorite`.
- [ ] Keep purchase history editing here if this remains the preferred admin UX.
- [ ] Add multi-image support using the shared field.

Run: `npm run build`
Expected: No old favorites image or separate favorite-model assumptions remain.

## Chunk 4: Shopping UX And Promotion Flow

### Task 10: Rebuild shopping around trip drafts plus pool insertion

**Files:**

- Modify: `src/pages/trip/ShoppingTab.tsx`
- Modify: `src/context/AppContext.tsx`

- [ ] Support two creation flows:
  - trip-local draft item creation for any member
  - pool item insertion for admin
- [ ] Preserve admin linked-item behavior for admin-owned trip usage.
- [ ] Keep first version of linked-items trip-local fields minimal: `checked` only.
- [ ] Add multi-image support to trip draft items.

Run: `npm run build`
Expected: Shopping tab compiles with the new data model.

### Task 11: Add the admin review popup for other members' wanted items

**Files:**

- Modify: `src/pages/trip/ShoppingTab.tsx`
- Reuse: `src/components/FullScreenModal.tsx`

- [ ] Add an admin-only button to open a full-screen review modal.
- [ ] Show other users' trip draft shopping items.
- [ ] For unpromoted items, show `加入魚池`.
- [ ] For promoted items, keep them visible with a promoted indicator and no promote button.

Run: `npm run build`
Expected: Admin review flow compiles and renders.

### Task 12: Implement promotion into the pool

**Files:**

- Modify: `src/pages/trip/ShoppingTab.tsx`
- Modify: `src/utils/imageUpload.ts`
- Modify: `src/context/AppContext.tsx`

- [ ] On promote:
  - create a new pool `Item`
  - copy draft images from trip paths into pool paths
  - save the new pool item
  - mark the original draft with `promotedToPoolAt` and `promotedBy`
- [ ] Do not link the original draft and new pool item after promotion.
- [ ] Keep promoted drafts visible in the admin review popup.

Run: `npm run build`
Expected: Promotion flow compiles cleanly.

## Chunk 5: Verification And Cleanup

### Task 13: Remove leftover single-image assumptions

**Files:**

- Modify any remaining references surfaced by search

- [ ] Search for `imageUrl`, `ImageUpload`, and direct URL-path deletion regex usage.
- [ ] Replace URL-derived delete logic with path-based deletes from `ImageAsset.path`.
- [ ] Remove dead compatibility code if it is no longer needed.

Run: `rg -n "imageUrl|ImageUpload|o\\\\/(.+?)\\\\?" src`
Expected: Only intentionally retained compatibility references remain, or no matches.

### Task 14: Run verification

**Files:**

- No new files expected

- [ ] Run full build.
- [ ] Run targeted tests for firebase shared helpers and shopping model helpers.
- [ ] Manually smoke-test:
  - hotel multi-image save
  - schedule note multi-image save
  - transport multi-image save
  - tips multi-image save
  - member creates trip shopping draft with images
  - admin promotes draft to pool
  - admin inserts pool item into own trip

Run: `npm run build`
Expected: PASS

Run: `npm test -- --runInBand`
Expected: PASS or a clearly scoped list of unrelated pre-existing failures

### Task 15: Commit in logical slices

**Files:**

- All touched files

- [ ] Commit after shared image pipeline.
- [ ] Commit after non-shopping migration.
- [ ] Commit after shopping plus pool refactor.
- [ ] Commit after promotion UX and verification.

Suggested commits:

```bash
git add src/types src/utils src/components src/pages/trip/HotelTab.tsx src/pages/trip/TransportTab.tsx src/pages/trip/ScheduleTab.tsx src/pages/notes/TipsSection.tsx
git commit -m "feat: add batch multi-image upload flow"
```

```bash
git add src/context/AppContext.tsx src/pages/trip/ShoppingTab.tsx src/pages/notes/FavoritesSection.tsx src/pages/trip/shoppingTypes.ts src/utils/firebase.ts
git commit -m "feat: introduce item pool and trip shopping draft model"
```

```bash
git add src/pages/trip/ShoppingTab.tsx src/utils/imageUpload.ts src/context/AppContext.tsx
git commit -m "feat: add shopping promotion flow for admin"
```
