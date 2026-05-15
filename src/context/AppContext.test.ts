import { describe, expect, it } from "vitest";
import { shouldSyncUserCollectionToRemote } from "./AppContext";

describe("shouldSyncUserCollectionToRemote", () => {
  it("does not sync collections that were just hydrated from local storage", () => {
    const previousItems: unknown[] = [];
    const hydratedItems: unknown[] = [];

    expect(
      shouldSyncUserCollectionToRemote({
        firebaseConnected: true,
        hasCurrentUser: true,
        currentUserId: "admin-1",
        hydratedCollectionUserId: "admin-1",
        collection: hydratedItems,
        previousCollection: previousItems,
      }),
    ).toBe(false);
  });

  it("syncs real collection changes after hydration has settled", () => {
    const previousItems: unknown[] = [];
    const nextItems: unknown[] = [{ id: "pool-1" }];

    expect(
      shouldSyncUserCollectionToRemote({
        firebaseConnected: true,
        hasCurrentUser: true,
        currentUserId: "admin-1",
        hydratedCollectionUserId: undefined,
        collection: nextItems,
        previousCollection: previousItems,
      }),
    ).toBe(true);
  });
});
