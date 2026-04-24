# Image Upload And Item Pool Design

## Goal

Upgrade the app from single-image uploads to a consistent multi-image system, while reshaping shopping and favorites into a clearer product model:

- Most content records can attach multiple images.
- Images are compressed before upload.
- Image binaries live in Firebase Storage.
- Firestore stores only image metadata.
- Shopping supports both trip-local draft items and admin-managed pool items.

## Current State

- Firebase Firestore and Storage are already configured in [src/utils/firebase.ts](/Users/kiki.chen/Workspace/anikiki-apps/kk-tripcat/src/utils/firebase.ts).
- Current upload UI is single-image and immediate-upload in [src/components/ImageUpload.tsx](/Users/kiki.chen/Workspace/anikiki-apps/kk-tripcat/src/components/ImageUpload.tsx).
- Most affected content types still use `imageUrl?: string` in [src/types/index.ts](/Users/kiki.chen/Workspace/anikiki-apps/kk-tripcat/src/types/index.ts).
- Existing shopping and favorites are modeled as separate records, but the desired product direction is closer to:
  - a reusable admin pool of items
  - trip-local shopping drafts that may later be promoted into the pool

## Decisions

### 1. Image Data Model

All supported content types move to:

```ts
type ImageAsset = {
  id: string;
  url: string;
  path: string;
  createdAt: string;
};
```

Fields using images should store:

```ts
images: ImageAsset[];
```

This replaces single `imageUrl` usage for the targeted models.

### 2. Upload Timing

Uploads should happen on save, not on file selection.

Form behavior:

- Existing remote images remain in form state.
- Newly selected files stay local as pending files.
- Save triggers: compress -> upload -> write Firestore.
- Cancel discards pending files without touching Storage.

### 3. Failure Handling

If any image upload fails during save:

- the main record is not saved
- successfully uploaded new files from that same attempt are rolled back
- old remote images remain untouched

When existing images are removed during editing:

- Firestore is updated first
- old Storage files are deleted only after the Firestore write succeeds

### 4. Storage Strategy

Image binaries always live in Firebase Storage.

Firestore stores only metadata in `images[]`.

Proposed path scheme:

- `tc-images/trips/{tripId}/hotels/{hotelId}/{imageId}.jpg`
- `tc-images/trips/{tripId}/schedule-activities/{activityId}/{imageId}.jpg`
- `tc-images/trips/{tripId}/schedule-notes/{noteId}/{imageId}.jpg`
- `tc-images/trips/{tripId}/transport/{itemId}/{imageId}.jpg`
- `tc-images/trips/{tripId}/shopping/{shoppingItemId}/{imageId}.jpg`
- `tc-images/users/{adminUserId}/items/{itemId}/{imageId}.jpg`
- `tc-images/users/{adminUserId}/tips/{tipId}/{imageId}.jpg`

### 5. Scope Of Multi-Image Upgrade

This design upgrades these content types first:

- `Hotel`
- `ScheduleActivity`
- `ScheduleNote`
- `TransportItem`
- `TipNote`
- `TripShoppingItem`
- `Item`

Explicitly excluded for now:

- `FlightInfo`
- `FlightLeg`

## Shopping And Pool Model

### Product Intent

Shopping and favorites should not remain two parallel standalone models.

The new design introduces:

- `Item`: admin-owned pool record
- `TripShoppingItem`: trip-local shopping record

### Item

`Item` is the reusable pool record managed by admin.

Suggested shape:

```ts
type Item = {
  id: string;
  name: string;
  images: ImageAsset[];
  estimatedAmount?: string;
  currency?: string;
  notes?: string;
  purchases: Purchase[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Notes:

- `purchases` belong to the item itself.
- `isFavorite` becomes a property on pool items instead of a separate primary data model.

### TripShoppingItem

`TripShoppingItem` is trip-local and can come from two sources:

1. Draft item created inside a trip by any member
2. Pool item inserted by admin into admin's own trip

Suggested shape:

```ts
type TripShoppingItem = {
  id: string;
  itemId?: string;
  textSnapshot: string;
  images: ImageAsset[];
  estimatedAmount?: string;
  currency?: string;
  note?: string;
  checked: boolean;
  createdBy: string;
  createdAt: string;
  promotedToPoolAt?: string;
  promotedBy?: string;
};
```

Interpretation:

- If `itemId` is absent, this is a trip draft item.
- If `itemId` exists, this is linked to a pool item.

### Linked Item Behavior

For admin's own trip, pool items are not detached.

That means:

- admin can add pool items into the trip
- the trip record references the shared pool item via `itemId`
- displayed content comes from the pool item
- first version only keeps trip-local `checked`

Planned future expansion:

- `estimatedAmountOverride`
- `currencyOverride`
- `noteOverride`

Those are intentionally deferred, but the plan should preserve room for them.

### Draft Promotion Into Pool

When admin promotes someone else's trip draft into the pool:

- a new `Item` is created from the draft snapshot
- draft images are copied into the pool image path
- the original `TripShoppingItem` remains unchanged
- the draft gets `promotedToPoolAt` and `promotedBy`
- UI shows it as already promoted and removes the promote button

The original draft and the pool item must not stay linked after promotion.

## UX Rules

### General Multi-Image UX

- Multiple images are supported.
- No per-record image cap for now.
- Keep image order by array order.
- No drag sorting in first version.
- New images append to the end.

### Shopping UX

Shopping should have two entry paths:

- `新增本次旅程項目`
- `從魚池加入`

Admin-only extra action:

- `查看大家想買的`
- opens a full-screen popup
- shows draft items from other users in the trip
- each unpromoted record has `加入魚池`
- promoted records remain visible with a promoted status

### Favorites UX

Favorites becomes a view over pool items where `isFavorite === true`.

It is no longer the primary source-of-truth structure for the shopping domain.

## Firestore Direction

Follow the existing repo pattern where practical.

Recommended storage layout:

- keep trip-local shopping inside the existing trip-user sync path
- add a new admin/user-scoped item pool collection for reusable items

This avoids overcomplicating the current app while still separating trip-local and reusable data.

## Out Of Scope

- Flight image support
- image drag sorting
- deduplication against existing pool items during promotion
- ignore-state workflow for promoted candidates
- linked-item trip override behavior

## Risks

- Shopping and favorites refactor is broader than a pure image feature.
- Existing components currently assume immediate upload and single `imageUrl`.
- Storage copy logic for promotion requires fetch/download and re-upload behavior from the client.
- The app context and sync helpers will need careful updates because shopping data is persisted per-trip and favorites currently sync separately.

## Recommended Delivery Order

1. Introduce shared multi-image types and helpers.
2. Upgrade non-shopping modules to multi-image first.
3. Refactor shopping and favorites into pool plus trip-local model.
4. Add admin promotion flow and pool insertion UX.
