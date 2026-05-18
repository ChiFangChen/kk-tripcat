import { describe, expect, it } from "vitest";
import {
  getInitialLoadingState,
  shouldApplyUserCollectionSnapshot,
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
