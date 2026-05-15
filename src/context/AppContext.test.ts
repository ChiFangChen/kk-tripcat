import { describe, expect, it } from "vitest";
import { shouldSyncUserCollectionToRemote } from "./AppContext";

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

  it("syncs real collection changes even when they happen right after hydration", () => {
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
    ).toBe(true);
  });

  it("syncs real collection changes after hydration has settled", () => {
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
    ).toBe(true);
  });
});
