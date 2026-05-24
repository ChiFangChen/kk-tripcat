import { describe, expect, it } from "vitest";
import {
  assertCanWriteToCloud,
  getInitialLoadingState,
  shouldApplyGlobalCollectionSnapshot,
  shouldApplyUserCollectionSnapshot,
  shouldRefreshTripOnVisibility,
  shouldSubscribeUserCollections,
  shouldSyncUserCollectionToRemote,
} from "./AppContext";

describe("getInitialLoadingState", () => {
  it("does not block the first render while Firebase hydrates in the background", () => {
    expect(getInitialLoadingState()).toBe(false);
  });
});

describe("shouldSubscribeUserCollections", () => {
  it("waits for Firebase before subscribing for the current user", () => {
    expect(
      shouldSubscribeUserCollections({
        hasCurrentUser: true,
        dbReady: false,
      }),
    ).toBe(false);

    expect(
      shouldSubscribeUserCollections({
        hasCurrentUser: true,
        dbReady: true,
      }),
    ).toBe(true);
  });

  it("does not subscribe user collections without a current user", () => {
    expect(
      shouldSubscribeUserCollections({
        hasCurrentUser: false,
        dbReady: true,
      }),
    ).toBe(false);
  });
});

describe("shouldApplyUserCollectionSnapshot", () => {
  it("keeps legacy local data when the remote user collection is empty", () => {
    expect(
      shouldApplyUserCollectionSnapshot({
        currentUpdatedAt: undefined,
        incomingUpdatedAt: "2026-05-18T15:14:33.675Z",
        currentCollection: [{ id: "tip-songkran" }],
        incomingCollection: [],
      }),
    ).toBe(false);
  });

  it("applies non-empty remote user collections when local data has no timestamp", () => {
    expect(
      shouldApplyUserCollectionSnapshot({
        currentUpdatedAt: undefined,
        incomingUpdatedAt: "2026-05-18T15:14:33.675Z",
        currentCollection: [],
        incomingCollection: [{ id: "tip-songkran" }],
      }),
    ).toBe(true);
  });
});

describe("shouldApplyGlobalCollectionSnapshot", () => {
  it("keeps local data when Firestore only has an empty cache snapshot", () => {
    expect(
      shouldApplyGlobalCollectionSnapshot({
        currentCollection: [{ id: "trip-1" }],
        incomingCollection: [],
        fromCache: true,
      }),
    ).toBe(false);
  });

  it("applies server-confirmed empty snapshots because remote is source of truth", () => {
    expect(
      shouldApplyGlobalCollectionSnapshot({
        currentCollection: [{ id: "trip-1" }],
        incomingCollection: [],
        fromCache: false,
      }),
    ).toBe(true);
  });

  it("uses Firestore cache snapshots when there is no local data yet", () => {
    expect(
      shouldApplyGlobalCollectionSnapshot({
        currentCollection: [],
        incomingCollection: [{ id: "trip-1" }],
        fromCache: true,
      }),
    ).toBe(true);
  });
});

describe("shouldRefreshTripOnVisibility", () => {
  it("refreshes when the document becomes visible", () => {
    expect(shouldRefreshTripOnVisibility("visible")).toBe(true);
  });

  it("does not refresh while the document is hidden", () => {
    expect(shouldRefreshTripOnVisibility("hidden")).toBe(false);
  });
});

describe("shouldSyncUserCollectionToRemote", () => {
  it("does not sync collections that were just hydrated from local storage", () => {
    const hydratedItems: unknown[] = [];

    expect(
      shouldSyncUserCollectionToRemote({
        firebaseConnected: true,
        hasCurrentUser: true,
        hydratedCollection: hydratedItems,
        collection: hydratedItems,
        previousCollection: [],
      }),
    ).toBe(false);
  });

  it("does not push local collection changes to remote automatically", () => {
    const hydratedItems: unknown[] = [];
    const nextItems: unknown[] = [{ id: "pool-1" }];

    expect(
      shouldSyncUserCollectionToRemote({
        firebaseConnected: true,
        hasCurrentUser: true,
        hydratedCollection: hydratedItems,
        collection: nextItems,
        previousCollection: hydratedItems,
      }),
    ).toBe(false);
  });

  it("does not push local collection changes after hydration has settled", () => {
    const previousItems: unknown[] = [];
    const nextItems: unknown[] = [{ id: "pool-1" }];

    expect(
      shouldSyncUserCollectionToRemote({
        firebaseConnected: true,
        hasCurrentUser: true,
        hydratedCollection: undefined,
        collection: nextItems,
        previousCollection: previousItems,
      }),
    ).toBe(false);
  });
});

describe("assertCanWriteToCloud", () => {
  it("does not block writes when the browser connection flag is stale", () => {
    expect(() =>
      assertCanWriteToCloud({
        firebaseConnected: false,
        hasDb: true,
        hasCurrentUser: true,
        operation: "template",
        requireCurrentUser: true,
      }),
    ).not.toThrow();
  });

  it("throws a consistent error when Firebase is unavailable", () => {
    expect(() =>
      assertCanWriteToCloud({
        firebaseConnected: false,
        hasDb: false,
        operation: "template",
      }),
    ).toThrow("Cannot sync template while Firebase is unavailable.");
  });

  it("throws a consistent error when the database handle is unavailable", () => {
    expect(() =>
      assertCanWriteToCloud({
        firebaseConnected: true,
        hasDb: false,
        operation: "trip",
      }),
    ).toThrow("Cannot sync trip while Firebase is unavailable.");
  });

  it("throws a consistent error when the current user is required but missing", () => {
    expect(() =>
      assertCanWriteToCloud({
        firebaseConnected: true,
        hasDb: true,
        hasCurrentUser: false,
        operation: "user trip data",
        requireCurrentUser: true,
      }),
    ).toThrow("Cannot sync user trip data while Firebase is unavailable.");
  });

  it("passes when all required write dependencies are available", () => {
    expect(() =>
      assertCanWriteToCloud({
        firebaseConnected: true,
        hasDb: true,
        hasCurrentUser: true,
        operation: "template",
        requireCurrentUser: true,
      }),
    ).not.toThrow();
  });
});
