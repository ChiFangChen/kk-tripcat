/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  User,
  Trip,
  Template,
  TipNote,
  ChecklistItem,
  FlightInfo,
  Hotel,
  ScheduleDay,
  ScheduleNote,
  TransportItem,
  MemoryPost,
} from "../types";
import { USER_COLORS } from "../types";
import * as storage from "../utils/storage";
import { generateId } from "../utils/id";
import {
  initFirebase,
  isFirebaseConfigured,
  subscribeToUsers,
  subscribeToTrips,
  subscribeToSharedTripData,
  subscribeToUserTripData,
  getSharedTripDataFromServer,
  getUserTripDataOnce,
  getUserTripDataFromServer,
  subscribeToTemplate,
  subscribeToTips,
  subscribeToItems,
  syncUser,
  syncSharedTripData,
  syncUserTripData,
  syncTemplate,
  syncTips,
  syncItems,
  syncTrip,
  syncTripPartial,
  deleteTripFromFirestore,
  deleteSharedTripData,
  deleteUserTripData,
  normalizeItems,
  normalizeTips,
  isClientVersionOutdated,
  shouldApplyIncomingSnapshot,
  type SharedTripSnapshot,
  type UserTripSnapshot,
} from "../utils/firebase";
import { defaultTemplate } from "../data/seed";
import type { Firestore } from "firebase/firestore";
import type { Item, TripShoppingItem } from "../pages/trip/shoppingTypes";
import type { ToastMessage, ToastType } from "../types/toast";
import { subscribeGlobalToast } from "../utils/toastBus";

// Shared data (visible to all trip members)
export interface SharedTripData {
  schedule: ScheduleDay[];
  scheduleNotes: ScheduleNote[];
  flights: FlightInfo[];
  hotels: Hotel[];
  transport: TransportItem[];
  memories: MemoryPost[];
}

// Per-user data (private to each user)
export interface UserTripData {
  checklist: ChecklistItem[];
  shopping: TripShoppingItem[];
  preparationNotes: string;
  setupComplete?: boolean;
  skipPreparation?: boolean;
  gotReady?: boolean;
}

// Combined for backward compat
export interface TripData extends SharedTripData, UserTripData {}

interface AppState {
  auth: { currentUser: User | null };
  users: User[];
  trips: Trip[];
  template: Template;
  tips: TipNote[];
  items: Item[];
  sharedTripData: Record<string, SharedTripData>;
  userTripData: Record<string, UserTripData>; // keyed by tripId
}

type Action =
  | { type: "LOGIN"; user: User }
  | { type: "LOGOUT" }
  | { type: "SET_USERS"; users: User[] }
  | { type: "ADD_USER"; user: User }
  | { type: "UPDATE_USER"; user: User }
  | { type: "SET_TRIPS"; trips: Trip[] }
  | { type: "ADD_TRIP"; trip: Trip }
  | { type: "UPDATE_TRIP"; trip: Trip }
  | { type: "DELETE_TRIP"; tripId: string }
  | { type: "REMOVE_TRIP_LOCAL_DATA"; tripId: string }
  | { type: "SET_ALL_USER_TRIP_DATA"; data: Record<string, UserTripData> }
  | { type: "SET_SHARED_TRIP_DATA"; tripId: string; data: SharedTripData }
  | {
      type: "UPDATE_SHARED_TRIP_DATA";
      tripId: string;
      data: Partial<SharedTripData>;
    }
  | { type: "SET_USER_TRIP_DATA"; tripId: string; data: UserTripData }
  | {
      type: "UPDATE_USER_TRIP_DATA";
      tripId: string;
      data: Partial<UserTripData>;
    }
  | { type: "SET_TEMPLATE"; template: Template }
  | { type: "SET_TIPS"; tips: TipNote[] }
  | { type: "ADD_TIP"; tip: TipNote }
  | { type: "UPDATE_TIP"; tip: TipNote }
  | { type: "DELETE_TIP"; tipId: string }
  | { type: "SET_ITEMS"; items: Item[] }
  | { type: "ADD_ITEM"; item: Item }
  | { type: "UPDATE_ITEM"; item: Item }
  | { type: "DELETE_ITEM"; itemId: string };

const emptyShared: SharedTripData = {
  schedule: [],
  scheduleNotes: [],
  flights: [],
  hotels: [],
  transport: [],
  memories: [],
};
const emptyUser: UserTripData = {
  checklist: [],
  shopping: [],
  preparationNotes: "",
  skipPreparation: false,
  gotReady: false,
};

function getTemplateStorageKey(userId: string) {
  return `template-${userId}`;
}

function getTipsStorageKey(userId: string) {
  return `tips-${userId}`;
}

function getItemsStorageKey(userId: string) {
  return `items-${userId}`;
}

function getTipsUpdatedAtStorageKey(userId: string) {
  return `tipsUpdatedAt-${userId}`;
}

function getItemsUpdatedAtStorageKey(userId: string) {
  return `itemsUpdatedAt-${userId}`;
}

function getUserTripDataStorageKey(userId: string) {
  return `userTripData-${userId}`;
}

function getUserTripUpdatedAtStorageKey(userId: string) {
  return `userTripUpdatedAt-${userId}`;
}

export function shouldSyncUserCollectionToRemote({
  firebaseConnected: _firebaseConnected,
  hasCurrentUser: _hasCurrentUser,
  hydratedCollection: _hydratedCollection,
  collection: _collection,
  previousCollection: _previousCollection,
}: {
  firebaseConnected: boolean;
  hasCurrentUser: boolean;
  hydratedCollection?: unknown;
  collection: unknown;
  previousCollection: unknown;
}) {
  void _firebaseConnected;
  void _hasCurrentUser;
  void _hydratedCollection;
  void _collection;
  void _previousCollection;
  return false;
}

export function assertCanWriteToCloud({
  firebaseConnected,
  hasDb,
  hasCurrentUser,
  operation,
  requireCurrentUser = false,
}: {
  firebaseConnected: boolean;
  hasDb: boolean;
  hasCurrentUser?: boolean;
  operation: string;
  requireCurrentUser?: boolean;
}) {
  if (!firebaseConnected || !hasDb || (requireCurrentUser && !hasCurrentUser)) {
    throw new Error(`Cannot sync ${operation} while Firebase is unavailable.`);
  }
}

export function shouldSubscribeUserCollections({
  hasCurrentUser,
  dbReady,
}: {
  hasCurrentUser: boolean;
  dbReady: boolean;
}) {
  return hasCurrentUser && dbReady;
}

export function getInitialLoadingState() {
  return false;
}

export function shouldApplyUserCollectionSnapshot({
  currentUpdatedAt,
  incomingUpdatedAt,
  currentCollection,
  incomingCollection,
}: {
  currentUpdatedAt?: string;
  incomingUpdatedAt?: string;
  currentCollection: unknown[];
  incomingCollection: unknown[];
}) {
  if (
    !currentUpdatedAt &&
    currentCollection.length > 0 &&
    incomingCollection.length === 0
  ) {
    return false;
  }
  return shouldApplyIncomingSnapshot(currentUpdatedAt, incomingUpdatedAt);
}

export function shouldApplyGlobalCollectionSnapshot({
  currentCollection,
  incomingCollection: _incomingCollection,
  fromCache,
}: {
  currentCollection: unknown[];
  incomingCollection: unknown[];
  fromCache: boolean;
}) {
  void _incomingCollection;
  return !fromCache || currentCollection.length === 0;
}

export function shouldRefreshTripOnVisibility(
  visibilityState: DocumentVisibilityState,
) {
  return visibilityState === "visible";
}

const WRITE_BLOCKED_ACTIONS = new Set<Action["type"]>([
  "ADD_USER",
  "UPDATE_USER",
  "ADD_TRIP",
  "UPDATE_TRIP",
  "DELETE_TRIP",
  "ADD_TIP",
  "UPDATE_TIP",
  "DELETE_TIP",
  "ADD_ITEM",
  "UPDATE_ITEM",
  "DELETE_ITEM",
]);

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, auth: { currentUser: action.user } };
    case "LOGOUT":
      return { ...state, auth: { currentUser: null } };
    case "SET_USERS": {
      const users = action.users.map((u, i) =>
        u.color ? u : { ...u, color: USER_COLORS[i % USER_COLORS.length] },
      );
      return { ...state, users };
    }
    case "ADD_USER":
      return { ...state, users: [...state.users, action.user] };
    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.user.id ? action.user : u,
        ),
        auth:
          state.auth.currentUser?.id === action.user.id
            ? { currentUser: action.user }
            : state.auth,
      };
    case "SET_TRIPS":
      return { ...state, trips: action.trips };
    case "ADD_TRIP":
      return { ...state, trips: [action.trip, ...state.trips] };
    case "UPDATE_TRIP":
      return {
        ...state,
        trips: state.trips.map((t) =>
          t.id === action.trip.id ? action.trip : t,
        ),
      };
    case "DELETE_TRIP": {
      const { [action.tripId]: _s, ...restShared } = state.sharedTripData;
      const { [action.tripId]: _u, ...restUser } = state.userTripData;
      void _s;
      void _u;
      return {
        ...state,
        trips: state.trips.filter((t) => t.id !== action.tripId),
        sharedTripData: restShared,
        userTripData: restUser,
      };
    }
    case "REMOVE_TRIP_LOCAL_DATA": {
      const { [action.tripId]: _s, ...restShared } = state.sharedTripData;
      const { [action.tripId]: _u, ...restUser } = state.userTripData;
      void _s;
      void _u;
      return {
        ...state,
        sharedTripData: restShared,
        userTripData: restUser,
      };
    }
    case "SET_ALL_USER_TRIP_DATA":
      return {
        ...state,
        userTripData: action.data,
      };
    case "SET_SHARED_TRIP_DATA":
      return {
        ...state,
        sharedTripData: {
          ...state.sharedTripData,
          [action.tripId]: action.data,
        },
      };
    case "UPDATE_SHARED_TRIP_DATA":
      return {
        ...state,
        sharedTripData: {
          ...state.sharedTripData,
          [action.tripId]: {
            ...(state.sharedTripData[action.tripId] || emptyShared),
            ...action.data,
          },
        },
      };
    case "SET_USER_TRIP_DATA":
      return {
        ...state,
        userTripData: { ...state.userTripData, [action.tripId]: action.data },
      };
    case "UPDATE_USER_TRIP_DATA":
      return {
        ...state,
        userTripData: {
          ...state.userTripData,
          [action.tripId]: {
            ...(state.userTripData[action.tripId] || emptyUser),
            ...action.data,
          },
        },
      };
    case "SET_TEMPLATE":
      return { ...state, template: action.template };
    case "SET_TIPS":
      return { ...state, tips: action.tips };
    case "ADD_TIP":
      return { ...state, tips: [action.tip, ...state.tips] };
    case "UPDATE_TIP":
      return {
        ...state,
        tips: state.tips.map((t) => (t.id === action.tip.id ? action.tip : t)),
      };
    case "DELETE_TIP":
      return {
        ...state,
        tips: state.tips.filter((t) => t.id !== action.tipId),
      };
    case "SET_ITEMS":
      return { ...state, items: action.items };
    case "ADD_ITEM":
      return { ...state, items: [action.item, ...state.items] };
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.item.id ? action.item : item,
        ),
      };
    case "DELETE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId),
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loading: boolean;
  viewTripId: string | null;
  firebaseConnected: boolean;
  toast: ToastMessage | null;
  showToast: (toast: { type?: ToastType; message: string }) => void;
  dismissToast: () => void;
  login: (user: User) => void;
  logout: () => void;
  register: (
    username: string,
    password: string,
    displayName: string,
  ) => Promise<User>;
  updateUser: (user: User) => Promise<void>;
  setTips: (tips: TipNote[]) => Promise<void>;
  setItems: (items: Item[]) => Promise<void>;
  setTemplate: (template: Template) => Promise<void>;
  addTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip, fields?: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  getTripData: (tripId: string) => TripData;
  refreshTripData: (
    tripId: string,
    options?: { includeUserData?: boolean },
  ) => Promise<void>;
  setSharedTripData: (
    tripId: string,
    data: Partial<SharedTripData>,
  ) => Promise<void>;
  setUserTripData: (
    tripId: string,
    data: Partial<UserTripData>,
  ) => Promise<void>;
  setTripMemberData: (
    tripId: string,
    userId: string,
    data: Partial<UserTripData>,
  ) => Promise<void>;
  getUserName: (userId: string) => string;
  getUserColor: (userId: string) => string;
  isCurrentUserAdmin: () => boolean;
  isTripAdmin: (trip: Trip) => boolean;
  loadTripMemberData: (tripId: string) => Promise<Record<string, UserTripData>>;
}

const AppContext = createContext<AppContextType | null>(null);

function loadInitialState(): AppState {
  const currentUser = storage.loadAuth();
  const trips = storage.getItem<Trip[]>("trips") || [];
  const template = currentUser
    ? storage.getItem<Template>(getTemplateStorageKey(currentUser.id)) ||
      defaultTemplate
    : defaultTemplate;
  const tips = currentUser
    ? normalizeTips(
        storage.getItem<TipNote[]>(getTipsStorageKey(currentUser.id)) || [],
      )
    : [];
  const items = currentUser
    ? normalizeItems(
        storage.getItem<Item[]>(getItemsStorageKey(currentUser.id)) || [],
      )
    : [];
  const users = storage.getItem<User[]>("users") || [];

  const sharedTripData =
    storage.getItem<Record<string, SharedTripData>>("sharedTripData") || {};
  const userTripData = currentUser
    ? storage.getItem<Record<string, UserTripData>>(
        getUserTripDataStorageKey(currentUser.id),
      ) || {}
    : {};

  // Migrate: add setupComplete to existing user trip data
  for (const [tripId, data] of Object.entries(userTripData)) {
    if (!data.setupComplete && data.checklist?.length > 0) {
      userTripData[tripId] = { ...data, setupComplete: true };
    }
    if (data.skipPreparation === undefined) {
      userTripData[tripId] = {
        ...userTripData[tripId],
        skipPreparation: false,
      };
    }
    if (data.gotReady === undefined) {
      userTripData[tripId] = {
        ...userTripData[tripId],
        gotReady: false,
      };
    }
  }

  return {
    auth: { currentUser },
    users,
    trips,
    template,
    tips,
    items,
    sharedTripData,
    userTripData,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, null, loadInitialState);
  const currentUserId = state.auth.currentUser?.id;
  const [loading, setLoading] = useState(getInitialLoadingState);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);
  const dbRef = useRef<Firestore | null>(null);
  const firebaseListeningRef = useRef(false);
  const tripSubsRef = useRef<Record<string, () => void>>({});
  const skipFirstSave = useRef(true);
  const sharedTripDataRef = useRef(state.sharedTripData);
  const userTripDataRef = useRef(state.userTripData);
  const syncedSharedTripDataRef = useRef(state.sharedTripData);
  const syncedUserTripDataRef = useRef(state.userTripData);
  const tipsUpdatedAtRef = useRef<string | undefined>(
    currentUserId
      ? storage.getItem<string>(getTipsUpdatedAtStorageKey(currentUserId)) ||
          undefined
      : undefined,
  );
  const itemsUpdatedAtRef = useRef<string | undefined>(
    currentUserId
      ? storage.getItem<string>(getItemsUpdatedAtStorageKey(currentUserId)) ||
          undefined
      : undefined,
  );
  const sharedTripUpdatedAtRef = useRef(
    storage.getItem<Record<string, string>>("sharedTripUpdatedAt") || {},
  );
  const userTripUpdatedAtRef = useRef(
    currentUserId
      ? storage.getItem<Record<string, string>>(
          getUserTripUpdatedAtStorageKey(currentUserId),
        ) || {}
      : {},
  );
  const pendingSharedTripUpdatedAtRef = useRef<Record<string, string>>({});
  const pendingUserTripUpdatedAtRef = useRef<Record<string, string>>({});
  const pendingTipsUpdatedAtRef = useRef<string | undefined>(undefined);
  const pendingItemsUpdatedAtRef = useRef<string | undefined>(undefined);
  const hydratedTipsRef = useRef<TipNote[] | undefined>(undefined);
  const hydratedItemsRef = useRef<Item[] | undefined>(undefined);
  const latestUsersRef = useRef(state.users);
  const latestTripsRef = useRef(state.trips);
  const latestTipsRef = useRef(state.tips);
  const latestItemsRef = useRef(state.items);
  const versionBlockedTripIdsRef = useRef<Set<string>>(new Set());
  const toastTimerRef = useRef<number | null>(null);

  // Parse viewTripId from URL once
  const viewTripId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view");
  }, []);

  const firebaseConnected = dbReady && isOnline;

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    ({ type = "info", message }: { type?: ToastType; message: string }) => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }

      setToast({
        id: generateId(),
        type,
        message,
      });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 3000);
    },
    [],
  );

  const showSyncError = useCallback(
    (message = "沒有同步成功，請確認網路後再試一次") => {
      showToast({ type: "error", message });
    },
    [showToast],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => subscribeGlobalToast(showToast), [showToast]);

  const dispatch = useCallback(
    (action: Action) => {
      if (!firebaseConnected && WRITE_BLOCKED_ACTIONS.has(action.type)) {
        return;
      }
      rawDispatch(action);
    },
    [firebaseConnected],
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    storage.removeItem("tripData");
  }, []);

  useEffect(() => {
    sharedTripDataRef.current = state.sharedTripData;
  }, [state.sharedTripData]);

  useEffect(() => {
    userTripDataRef.current = state.userTripData;
  }, [state.userTripData]);

  useEffect(() => {
    latestUsersRef.current = state.users;
  }, [state.users]);

  useEffect(() => {
    latestTripsRef.current = state.trips;
  }, [state.trips]);

  useEffect(() => {
    latestTipsRef.current = state.tips;
  }, [state.tips]);

  useEffect(() => {
    latestItemsRef.current = state.items;
  }, [state.items]);

  useEffect(() => {
    if (!currentUserId) {
      rawDispatch({ type: "SET_ALL_USER_TRIP_DATA", data: {} });
      rawDispatch({ type: "SET_TEMPLATE", template: defaultTemplate });
      rawDispatch({ type: "SET_TIPS", tips: [] });
      rawDispatch({ type: "SET_ITEMS", items: [] });
      userTripDataRef.current = {};
      syncedUserTripDataRef.current = {};
      userTripUpdatedAtRef.current = {};
      tipsUpdatedAtRef.current = undefined;
      itemsUpdatedAtRef.current = undefined;
      pendingTipsUpdatedAtRef.current = undefined;
      pendingItemsUpdatedAtRef.current = undefined;
      hydratedTipsRef.current = undefined;
      hydratedItemsRef.current = undefined;
      return;
    }

    const nextUserTripData =
      storage.getItem<Record<string, UserTripData>>(
        getUserTripDataStorageKey(currentUserId),
      ) || {};
    const nextUserTripUpdatedAt =
      storage.getItem<Record<string, string>>(
        getUserTripUpdatedAtStorageKey(currentUserId),
      ) || {};

    rawDispatch({ type: "SET_ALL_USER_TRIP_DATA", data: nextUserTripData });
    userTripDataRef.current = nextUserTripData;
    syncedUserTripDataRef.current = nextUserTripData;
    userTripUpdatedAtRef.current = nextUserTripUpdatedAt;

    rawDispatch({
      type: "SET_TEMPLATE",
      template:
        storage.getItem<Template>(getTemplateStorageKey(currentUserId)) ||
        defaultTemplate,
    });
    const nextTips = normalizeTips(
      storage.getItem<TipNote[]>(getTipsStorageKey(currentUserId)) || [],
    );
    rawDispatch({
      type: "SET_TIPS",
      tips: nextTips,
    });
    hydratedTipsRef.current = nextTips;
    tipsUpdatedAtRef.current =
      storage.getItem<string>(getTipsUpdatedAtStorageKey(currentUserId)) ||
      undefined;
    const nextItems = normalizeItems(
      storage.getItem<Item[]>(getItemsStorageKey(currentUserId)) || [],
    );
    rawDispatch({
      type: "SET_ITEMS",
      items: nextItems,
    });
    hydratedItemsRef.current = nextItems;
    itemsUpdatedAtRef.current =
      storage.getItem<string>(getItemsUpdatedAtStorageKey(currentUserId)) ||
      undefined;
  }, [currentUserId]);

  const persistSharedTripCache = useCallback(
    (tripId: string, data: SharedTripData, updatedAt?: string) => {
      const nextSharedTripData = {
        ...syncedSharedTripDataRef.current,
        [tripId]: data,
      };
      syncedSharedTripDataRef.current = nextSharedTripData;
      sharedTripDataRef.current = nextSharedTripData;
      storage.setItem("sharedTripData", nextSharedTripData);
      if (updatedAt) {
        const nextUpdatedAt = {
          ...sharedTripUpdatedAtRef.current,
          [tripId]: updatedAt,
        };
        sharedTripUpdatedAtRef.current = nextUpdatedAt;
        storage.setItem("sharedTripUpdatedAt", nextUpdatedAt);
      }
    },
    [],
  );

  const persistUserTripCache = useCallback(
    (tripId: string, data: UserTripData, updatedAt?: string) => {
      if (!currentUserId) return;
      const nextUserTripData = {
        ...syncedUserTripDataRef.current,
        [tripId]: data,
      };
      syncedUserTripDataRef.current = nextUserTripData;
      userTripDataRef.current = nextUserTripData;
      storage.setItem(
        getUserTripDataStorageKey(currentUserId),
        nextUserTripData,
      );
      if (updatedAt) {
        const nextUpdatedAt = {
          ...userTripUpdatedAtRef.current,
          [tripId]: updatedAt,
        };
        userTripUpdatedAtRef.current = nextUpdatedAt;
        storage.setItem(
          getUserTripUpdatedAtStorageKey(currentUserId),
          nextUpdatedAt,
        );
      }
    },
    [currentUserId],
  );

  const applySharedTripSnapshot = useCallback(
    (tripId: string, snapshot: SharedTripSnapshot) => {
      if (isClientVersionOutdated(snapshot.appVersion)) {
        versionBlockedTripIdsRef.current.add(tripId);
      }
      const pendingUpdatedAt = pendingSharedTripUpdatedAtRef.current[tripId];
      if (
        pendingUpdatedAt &&
        (!snapshot.updatedAt || snapshot.updatedAt < pendingUpdatedAt)
      ) {
        return;
      }
      const currentUpdatedAt = sharedTripUpdatedAtRef.current[tripId];
      if (!shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)) {
        return;
      }
      if (
        pendingUpdatedAt &&
        snapshot.updatedAt &&
        snapshot.updatedAt >= pendingUpdatedAt
      ) {
        delete pendingSharedTripUpdatedAtRef.current[tripId];
      }
      rawDispatch({
        type: "SET_SHARED_TRIP_DATA",
        tripId,
        data: snapshot.data,
      });
      persistSharedTripCache(tripId, snapshot.data, snapshot.updatedAt);
    },
    [persistSharedTripCache],
  );

  const applyUserTripSnapshot = useCallback(
    (tripId: string, snapshot: UserTripSnapshot) => {
      if (isClientVersionOutdated(snapshot.appVersion)) {
        versionBlockedTripIdsRef.current.add(tripId);
      }
      const pendingUpdatedAt = pendingUserTripUpdatedAtRef.current[tripId];
      if (
        pendingUpdatedAt &&
        (!snapshot.updatedAt || snapshot.updatedAt < pendingUpdatedAt)
      ) {
        return;
      }
      const currentUpdatedAt = userTripUpdatedAtRef.current[tripId];
      if (!shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)) {
        return;
      }
      if (
        pendingUpdatedAt &&
        snapshot.updatedAt &&
        snapshot.updatedAt >= pendingUpdatedAt
      ) {
        delete pendingUserTripUpdatedAtRef.current[tripId];
      }
      rawDispatch({
        type: "SET_USER_TRIP_DATA",
        tripId,
        data: snapshot.data,
      });
      persistUserTripCache(tripId, snapshot.data, snapshot.updatedAt);
    },
    [persistUserTripCache],
  );

  // Initialize Firebase
  useEffect(() => {
    if (isFirebaseConfigured() && !firebaseListeningRef.current) {
      let cleanups: (() => void)[] = [];
      initFirebase().then((db) => {
        dbRef.current = db;
        setDbReady(!!db);
        if (db) {
          firebaseListeningRef.current = true;
          let usersLoaded = false;
          let tripsLoaded = false;
          const checkReady = () => {
            if (usersLoaded && tripsLoaded) setLoading(false);
          };
          const unsub1 = subscribeToUsers(db, (snapshot) => {
            if (
              !shouldApplyGlobalCollectionSnapshot({
                currentCollection: latestUsersRef.current,
                incomingCollection: snapshot.data,
                fromCache: snapshot.fromCache,
              })
            ) {
              usersLoaded = true;
              checkReady();
              return;
            }
            rawDispatch({ type: "SET_USERS", users: snapshot.data });
            storage.setItem("users", snapshot.data);
            usersLoaded = true;
            checkReady();
          });
          const unsub2 = subscribeToTrips(db, (snapshot) => {
            if (
              !shouldApplyGlobalCollectionSnapshot({
                currentCollection: latestTripsRef.current,
                incomingCollection: snapshot.data,
                fromCache: snapshot.fromCache,
              })
            ) {
              tripsLoaded = true;
              checkReady();
              return;
            }
            rawDispatch({ type: "SET_TRIPS", trips: snapshot.data });
            storage.setItem("trips", snapshot.data);
            tripsLoaded = true;
            checkReady();
          });
          cleanups = [unsub1, unsub2];
        } else {
          setLoading(false);
        }
      });
      return () => {
        cleanups.forEach((fn) => fn());
        firebaseListeningRef.current = false;
      };
    }
  }, []);

  // Subscribe to template, tips, item pool when user logs in
  useEffect(() => {
    if (
      !shouldSubscribeUserCollections({
        hasCurrentUser: Boolean(state.auth.currentUser),
        dbReady,
      }) ||
      !state.auth.currentUser ||
      !dbRef.current
    ) {
      return;
    }
    const db = dbRef.current;
    const userId = state.auth.currentUser.id;
    const unsub1 = subscribeToTemplate(db, userId, (template) => {
      if (template) {
        rawDispatch({ type: "SET_TEMPLATE", template });
        storage.setItem(getTemplateStorageKey(userId), template);
      } else {
        rawDispatch({ type: "SET_TEMPLATE", template: defaultTemplate });
        storage.setItem(getTemplateStorageKey(userId), defaultTemplate);
      }
    });
    const unsub2 = subscribeToTips(db, userId, (snapshot) => {
      const pendingUpdatedAt = pendingTipsUpdatedAtRef.current;
      if (
        pendingUpdatedAt &&
        (!snapshot.updatedAt || snapshot.updatedAt < pendingUpdatedAt)
      ) {
        return;
      }
      if (
        !shouldApplyUserCollectionSnapshot({
          currentUpdatedAt: tipsUpdatedAtRef.current,
          incomingUpdatedAt: snapshot.updatedAt,
          currentCollection: latestTipsRef.current,
          incomingCollection: snapshot.tips,
        })
      ) {
        return;
      }
      if (
        pendingUpdatedAt &&
        snapshot.updatedAt &&
        snapshot.updatedAt >= pendingUpdatedAt
      ) {
        pendingTipsUpdatedAtRef.current = undefined;
      }
      rawDispatch({ type: "SET_TIPS", tips: snapshot.tips });
      storage.setItem(getTipsStorageKey(userId), snapshot.tips);
      if (snapshot.updatedAt) {
        tipsUpdatedAtRef.current = snapshot.updatedAt;
        storage.setItem(getTipsUpdatedAtStorageKey(userId), snapshot.updatedAt);
      }
    });
    const unsub3 = subscribeToItems(db, userId, (snapshot) => {
      const pendingUpdatedAt = pendingItemsUpdatedAtRef.current;
      if (
        pendingUpdatedAt &&
        (!snapshot.updatedAt || snapshot.updatedAt < pendingUpdatedAt)
      ) {
        return;
      }
      if (
        !shouldApplyUserCollectionSnapshot({
          currentUpdatedAt: itemsUpdatedAtRef.current,
          incomingUpdatedAt: snapshot.updatedAt,
          currentCollection: latestItemsRef.current,
          incomingCollection: snapshot.items,
        })
      ) {
        return;
      }
      if (
        pendingUpdatedAt &&
        snapshot.updatedAt &&
        snapshot.updatedAt >= pendingUpdatedAt
      ) {
        pendingItemsUpdatedAtRef.current = undefined;
      }
      rawDispatch({ type: "SET_ITEMS", items: snapshot.items });
      storage.setItem(getItemsStorageKey(userId), snapshot.items);
      if (snapshot.updatedAt) {
        itemsUpdatedAtRef.current = snapshot.updatedAt;
        storage.setItem(
          getItemsUpdatedAtStorageKey(userId),
          snapshot.updatedAt,
        );
      }
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [state.auth.currentUser, dbReady]);

  // Subscribe to shared trip data for view-only link
  useEffect(() => {
    if (!viewTripId || !dbReady || !dbRef.current) return;
    return subscribeToSharedTripData(dbRef.current, viewTripId, (snapshot) => {
      applySharedTripSnapshot(viewTripId, snapshot);
    });
  }, [viewTripId, dbReady, applySharedTripSnapshot]);

  // Cleanup all trip subscriptions on unmount only
  useEffect(() => {
    return () => {
      Object.values(tripSubsRef.current).forEach((fn) => fn());
      tripSubsRef.current = {};
    };
  }, []);

  // Subscribe to trip data incrementally — no cleanup on re-run to avoid
  // tearing down active subscriptions (which would re-fire onSnapshot with
  // potentially stale Firestore data, overwriting local edits).
  useEffect(() => {
    const db = dbRef.current;
    const userId = state.auth.currentUser?.id;

    if (!db || !userId) {
      // Logged out or no db — unsubscribe from everything
      for (const unsub of Object.values(tripSubsRef.current)) unsub();
      tripSubsRef.current = {};
      return;
    }

    const currentTripIds = new Set(
      state.trips.filter((t) => t.members.includes(userId)).map((t) => t.id),
    );

    // Unsubscribe from trips user is no longer a member of
    for (const [tripId, unsub] of Object.entries(tripSubsRef.current)) {
      if (!currentTripIds.has(tripId)) {
        unsub();
        delete tripSubsRef.current[tripId];
        rawDispatch({ type: "REMOVE_TRIP_LOCAL_DATA", tripId });
        const { [tripId]: _shared, ...restShared } = sharedTripDataRef.current;
        const { [tripId]: _user, ...restUser } = userTripDataRef.current;
        const { [tripId]: _syncedShared, ...restSyncedShared } =
          syncedSharedTripDataRef.current;
        const { [tripId]: _syncedUser, ...restSyncedUser } =
          syncedUserTripDataRef.current;
        const { [tripId]: _sharedAt, ...restSharedAt } =
          sharedTripUpdatedAtRef.current;
        const { [tripId]: _userAt, ...restUserAt } =
          userTripUpdatedAtRef.current;
        void _shared;
        void _user;
        void _syncedShared;
        void _syncedUser;
        void _sharedAt;
        void _userAt;
        sharedTripDataRef.current = restShared;
        userTripDataRef.current = restUser;
        syncedSharedTripDataRef.current = restSyncedShared;
        syncedUserTripDataRef.current = restSyncedUser;
        sharedTripUpdatedAtRef.current = restSharedAt;
        userTripUpdatedAtRef.current = restUserAt;
        delete pendingSharedTripUpdatedAtRef.current[tripId];
        delete pendingUserTripUpdatedAtRef.current[tripId];
        versionBlockedTripIdsRef.current.delete(tripId);
        storage.setItem("sharedTripData", restSyncedShared);
        storage.setItem("sharedTripUpdatedAt", restSharedAt);
        storage.setItem(getUserTripDataStorageKey(userId), restSyncedUser);
        storage.setItem(getUserTripUpdatedAtStorageKey(userId), restUserAt);
      }
    }

    // Subscribe to new trips only — existing subscriptions stay untouched
    for (const tripId of currentTripIds) {
      if (!tripSubsRef.current[tripId]) {
        const unsub1 = subscribeToSharedTripData(db, tripId, (snapshot) => {
          applySharedTripSnapshot(tripId, snapshot);
        });
        const unsub2 = subscribeToUserTripData(
          db,
          tripId,
          userId,
          (snapshot) => {
            applyUserTripSnapshot(tripId, snapshot);
          },
        );
        tripSubsRef.current[tripId] = () => {
          unsub1();
          unsub2();
        };
      }
    }
  }, [
    state.trips,
    state.auth.currentUser?.id,
    applySharedTripSnapshot,
    applyUserTripSnapshot,
  ]);

  // Save local cache. Remote writes happen only through explicit write APIs.
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    storage.setItem("users", state.users);
    storage.setItem("trips", state.trips);
    if (currentUserId) {
      storage.setItem(getTemplateStorageKey(currentUserId), state.template);
      storage.setItem(getTipsStorageKey(currentUserId), state.tips);
      storage.setItem(getItemsStorageKey(currentUserId), state.items);
      if (tipsUpdatedAtRef.current) {
        storage.setItem(
          getTipsUpdatedAtStorageKey(currentUserId),
          tipsUpdatedAtRef.current,
        );
      }
      if (itemsUpdatedAtRef.current) {
        storage.setItem(
          getItemsUpdatedAtStorageKey(currentUserId),
          itemsUpdatedAtRef.current,
        );
      }
      storage.setItem(
        getUserTripDataStorageKey(currentUserId),
        state.userTripData,
      );
      storage.setItem(
        getUserTripUpdatedAtStorageKey(currentUserId),
        userTripUpdatedAtRef.current,
      );
    }
    if (firebaseConnected && dbRef.current && state.auth.currentUser) {
      if (state.tips === hydratedTipsRef.current) {
        hydratedTipsRef.current = undefined;
      }
      if (state.items === hydratedItemsRef.current) {
        hydratedItemsRef.current = undefined;
      }
    }
  }, [
    state.users,
    state.trips,
    state.template,
    state.tips,
    state.items,
    state.userTripData,
    state.auth.currentUser,
    currentUserId,
    firebaseConnected,
  ]);

  const login = useCallback((user: User) => {
    dispatch({ type: "LOGIN", user });
    storage.saveAuth(user);
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    storage.saveAuth(null);
  }, [dispatch]);

  const register = useCallback(
    async (
      username: string,
      password: string,
      displayName: string,
    ): Promise<User> => {
      const usedColors = state.users.map((u) => u.color);
      const available = USER_COLORS.filter((c) => !usedColors.includes(c));
      const colorPool = available.length > 0 ? available : USER_COLORS;
      const color = colorPool[Math.floor(Math.random() * colorPool.length)];
      const user: User = {
        id: generateId(),
        username,
        password,
        displayName,
        color,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };
      try {
        assertCanWriteToCloud({
          firebaseConnected,
          hasDb: Boolean(dbRef.current),
          operation: "user",
        });
        await syncUser(dbRef.current!, user);
        dispatch({ type: "ADD_USER", user });
      } catch (error) {
        showSyncError("帳號沒有建立成功，請確認網路後再試一次");
        throw error;
      }
      return user;
    },
    [state.users, dispatch, firebaseConnected, showSyncError],
  );

  const updateUser = useCallback(
    async (user: User) => {
      try {
        assertCanWriteToCloud({
          firebaseConnected,
          hasDb: Boolean(dbRef.current),
          operation: "user",
        });
        await syncUser(dbRef.current!, user);
        dispatch({ type: "UPDATE_USER", user });
        if (user.id === state.auth.currentUser?.id) storage.saveAuth(user);
      } catch (error) {
        showSyncError("使用者資料沒有同步成功，請確認網路後再試一次");
        console.error("Failed to sync user:", error);
      }
    },
    [dispatch, firebaseConnected, showSyncError, state.auth.currentUser],
  );

  const setTips = useCallback(
    async (tips: TipNote[]) => {
      assertCanWriteToCloud({
        firebaseConnected,
        hasDb: Boolean(dbRef.current),
        hasCurrentUser: Boolean(currentUserId),
        operation: "tips",
        requireCurrentUser: true,
      });
      const userId = currentUserId!;

      const updatedAt = new Date().toISOString();
      const previousUpdatedAt = tipsUpdatedAtRef.current;
      pendingTipsUpdatedAtRef.current = updatedAt;
      tipsUpdatedAtRef.current = updatedAt;

      try {
        await syncTips(dbRef.current!, userId, tips, updatedAt);
        hydratedTipsRef.current = tips;
        rawDispatch({ type: "SET_TIPS", tips });
        storage.setItem(getTipsStorageKey(userId), tips);
        storage.setItem(getTipsUpdatedAtStorageKey(userId), updatedAt);
      } catch (error) {
        if (pendingTipsUpdatedAtRef.current === updatedAt) {
          pendingTipsUpdatedAtRef.current = undefined;
        }
        tipsUpdatedAtRef.current = previousUpdatedAt;
        throw error;
      }
    },
    [currentUserId, firebaseConnected],
  );

  const setItems = useCallback(
    async (items: Item[]) => {
      assertCanWriteToCloud({
        firebaseConnected,
        hasDb: Boolean(dbRef.current),
        hasCurrentUser: Boolean(currentUserId),
        operation: "item pool",
        requireCurrentUser: true,
      });
      const userId = currentUserId!;

      const updatedAt = new Date().toISOString();
      const previousUpdatedAt = itemsUpdatedAtRef.current;
      pendingItemsUpdatedAtRef.current = updatedAt;
      itemsUpdatedAtRef.current = updatedAt;

      try {
        await syncItems(dbRef.current!, userId, items, updatedAt);
        hydratedItemsRef.current = items;
        rawDispatch({ type: "SET_ITEMS", items });
        storage.setItem(getItemsStorageKey(userId), items);
        storage.setItem(getItemsUpdatedAtStorageKey(userId), updatedAt);
      } catch (error) {
        if (pendingItemsUpdatedAtRef.current === updatedAt) {
          pendingItemsUpdatedAtRef.current = undefined;
        }
        itemsUpdatedAtRef.current = previousUpdatedAt;
        throw error;
      }
    },
    [currentUserId, firebaseConnected],
  );

  const setTemplate = useCallback(
    async (template: Template) => {
      assertCanWriteToCloud({
        firebaseConnected,
        hasDb: Boolean(dbRef.current),
        hasCurrentUser: Boolean(state.auth.currentUser),
        operation: "template",
        requireCurrentUser: true,
      });

      await syncTemplate(dbRef.current!, state.auth.currentUser!.id, template);
      dispatch({ type: "SET_TEMPLATE", template });
      storage.setItem(
        getTemplateStorageKey(state.auth.currentUser!.id),
        template,
      );
    },
    [dispatch, firebaseConnected, state.auth.currentUser],
  );

  const addTrip = useCallback(
    async (trip: Trip) => {
      try {
        assertCanWriteToCloud({
          firebaseConnected,
          hasDb: Boolean(dbRef.current),
          operation: "trip",
        });
        await syncTrip(dbRef.current!, trip);
        dispatch({ type: "ADD_TRIP", trip });
      } catch (error) {
        showSyncError("旅程沒有建立成功，請確認網路後再試一次");
        throw error;
      }
    },
    [dispatch, firebaseConnected, showSyncError],
  );

  const updateTrip = useCallback(
    async (trip: Trip, fields?: Partial<Trip>) => {
      try {
        assertCanWriteToCloud({
          firebaseConnected,
          hasDb: Boolean(dbRef.current),
          operation: "trip",
        });
        const currentTrip =
          state.trips.find((item) => item.id === trip.id) || trip;
        const nextTrip = fields ? { ...currentTrip, ...fields } : trip;
        const removedMemberIds = currentTrip.members.filter(
          (memberId) => !nextTrip.members.includes(memberId),
        );
        if (fields) await syncTripPartial(dbRef.current!, trip.id, fields);
        else await syncTrip(dbRef.current!, nextTrip);
        await Promise.all(
          removedMemberIds.map((memberId) =>
            deleteUserTripData(dbRef.current!, trip.id, memberId),
          ),
        );
        dispatch({ type: "UPDATE_TRIP", trip: nextTrip });
      } catch (error) {
        showSyncError("旅程沒有同步成功，請確認網路後再試一次");
        console.error("Failed to sync trip:", error);
      }
    },
    [dispatch, firebaseConnected, showSyncError, state.trips],
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      try {
        assertCanWriteToCloud({
          firebaseConnected,
          hasDb: Boolean(dbRef.current),
          operation: "trip",
        });
        const userId = state.auth.currentUser?.id;
        await Promise.all([
          deleteTripFromFirestore(dbRef.current!, tripId),
          deleteSharedTripData(dbRef.current!, tripId),
          ...(userId
            ? [deleteUserTripData(dbRef.current!, tripId, userId)]
            : []),
        ]);
        dispatch({ type: "DELETE_TRIP", tripId });
        const { [tripId]: _shared, ...restShared } = sharedTripDataRef.current;
        const { [tripId]: _user, ...restUser } = userTripDataRef.current;
        const { [tripId]: _sharedAt, ...restSharedAt } =
          sharedTripUpdatedAtRef.current;
        const { [tripId]: _userAt, ...restUserAt } =
          userTripUpdatedAtRef.current;
        void _shared;
        void _user;
        void _sharedAt;
        void _userAt;
        sharedTripDataRef.current = restShared;
        userTripDataRef.current = restUser;
        syncedSharedTripDataRef.current = restShared;
        syncedUserTripDataRef.current = restUser;
        sharedTripUpdatedAtRef.current = restSharedAt;
        userTripUpdatedAtRef.current = restUserAt;
        delete pendingSharedTripUpdatedAtRef.current[tripId];
        delete pendingUserTripUpdatedAtRef.current[tripId];
        versionBlockedTripIdsRef.current.delete(tripId);
        storage.setItem("sharedTripData", restShared);
        storage.setItem("sharedTripUpdatedAt", restSharedAt);
        if (userId) {
          storage.setItem(getUserTripDataStorageKey(userId), restUser);
          storage.setItem(getUserTripUpdatedAtStorageKey(userId), restUserAt);
        }
      } catch (error) {
        showSyncError("旅程沒有刪除成功，請確認網路後再試一次");
        console.error("Failed to delete trip:", error);
      }
    },
    [dispatch, firebaseConnected, showSyncError, state.auth.currentUser?.id],
  );

  function getTripData(tripId: string): TripData {
    const shared = state.sharedTripData[tripId] || emptyShared;
    const user = state.userTripData[tripId] || emptyUser;
    return { ...shared, ...user };
  }

  const refreshTripData = useCallback(
    async (
      tripId: string,
      options: { includeUserData?: boolean } = {},
    ): Promise<void> => {
      const db = dbRef.current;
      if (!db) return;

      try {
        const sharedSnapshot = await getSharedTripDataFromServer(db, tripId);
        applySharedTripSnapshot(tripId, sharedSnapshot);

        const includeUserData = options.includeUserData ?? true;
        const userId = state.auth.currentUser?.id;
        if (!includeUserData || !userId) return;

        const userSnapshot = await getUserTripDataFromServer(
          db,
          tripId,
          userId,
        );
        applyUserTripSnapshot(tripId, userSnapshot);
      } catch (error) {
        console.warn("Failed to refresh trip data from server:", error);
      }
    },
    [
      applySharedTripSnapshot,
      applyUserTripSnapshot,
      state.auth.currentUser?.id,
    ],
  );

  async function setSharedTripData(
    tripId: string,
    data: Partial<SharedTripData>,
  ): Promise<void> {
    try {
      assertCanWriteToCloud({
        firebaseConnected,
        hasDb: Boolean(dbRef.current),
        operation: "shared trip data",
      });
    } catch (error) {
      showSyncError();
      console.error("Failed to start shared trip data sync:", error);
      return;
    }
    if (versionBlockedTripIdsRef.current.has(tripId)) {
      const error = new Error("Blocked shared trip write from outdated client.");
      console.warn(error.message, tripId);
      showSyncError("資料版本較新，請重新整理後再試一次");
      return;
    }
    const updatedAt = new Date().toISOString();
    pendingSharedTripUpdatedAtRef.current = {
      ...pendingSharedTripUpdatedAtRef.current,
      [tripId]: updatedAt,
    };
    dispatch({ type: "UPDATE_SHARED_TRIP_DATA", tripId, data });
    try {
      await syncSharedTripData(dbRef.current!, tripId, data, updatedAt);
    } catch (error) {
      if (pendingSharedTripUpdatedAtRef.current[tripId] === updatedAt) {
        delete pendingSharedTripUpdatedAtRef.current[tripId];
        const fallback = syncedSharedTripDataRef.current[tripId] || emptyShared;
        rawDispatch({ type: "SET_SHARED_TRIP_DATA", tripId, data: fallback });
      }
      showSyncError();
      console.error("Failed to sync shared trip data:", error);
    }
  }

  async function setUserTripData(
    tripId: string,
    data: Partial<UserTripData>,
  ): Promise<void> {
    try {
      assertCanWriteToCloud({
        firebaseConnected,
        hasDb: Boolean(dbRef.current),
        hasCurrentUser: Boolean(state.auth.currentUser),
        operation: "user trip data",
        requireCurrentUser: true,
      });
    } catch (error) {
      showSyncError();
      console.error("Failed to start user trip data sync:", error);
      return;
    }
    if (versionBlockedTripIdsRef.current.has(tripId)) {
      const error = new Error("Blocked user trip write from outdated client.");
      console.warn(error.message, tripId);
      showSyncError("資料版本較新，請重新整理後再試一次");
      return;
    }
    const updatedAt = new Date().toISOString();
    pendingUserTripUpdatedAtRef.current = {
      ...pendingUserTripUpdatedAtRef.current,
      [tripId]: updatedAt,
    };
    dispatch({ type: "UPDATE_USER_TRIP_DATA", tripId, data });
    try {
      await syncUserTripData(
        dbRef.current!,
        tripId,
        state.auth.currentUser!.id,
        data,
        updatedAt,
      );
    } catch (error) {
      if (pendingUserTripUpdatedAtRef.current[tripId] === updatedAt) {
        delete pendingUserTripUpdatedAtRef.current[tripId];
        const fallback = syncedUserTripDataRef.current[tripId] || emptyUser;
        rawDispatch({ type: "SET_USER_TRIP_DATA", tripId, data: fallback });
      }
      showSyncError();
      console.error("Failed to sync user trip data:", error);
    }
  }

  async function setTripMemberData(
    tripId: string,
    userId: string,
    data: Partial<UserTripData>,
  ): Promise<void> {
    try {
      assertCanWriteToCloud({
        firebaseConnected,
        hasDb: Boolean(dbRef.current),
        operation: "trip member data",
      });
      const updatedAt = new Date().toISOString();
      await syncUserTripData(dbRef.current!, tripId, userId, data, updatedAt);
    } catch (error) {
      showSyncError();
      throw error;
    }
  }

  const getUserName = useCallback(
    (userId: string): string => {
      return state.users.find((u) => u.id === userId)?.displayName || "未知";
    },
    [state.users],
  );

  const getUserColor = useCallback(
    (userId: string): string => {
      return state.users.find((u) => u.id === userId)?.color || "#888";
    },
    [state.users],
  );

  const isCurrentUserAdmin = useCallback((): boolean => {
    const user = state.auth.currentUser;
    if (!user) return false;
    return !!user.isAdmin;
  }, [state.auth.currentUser]);

  const isTripAdmin = useCallback(
    (trip: Trip): boolean => {
      const user = state.auth.currentUser;
      if (!user) return false;
      if (user.id === "admin-kiki" || user.username === "kiki") return true;
      return trip.creatorId === user.id;
    },
    [state.auth.currentUser],
  );

  const loadTripMemberData = useCallback(
    async (tripId: string): Promise<Record<string, UserTripData>> => {
      const trip = state.trips.find((entry) => entry.id === tripId);
      const currentUserId = state.auth.currentUser?.id;
      if (!trip || !currentUserId || !dbRef.current) return {};

      const memberIds = trip.members.filter(
        (userId) => userId !== currentUserId,
      );
      const memberSnapshots = await Promise.all(
        memberIds.map(async (userId) => ({
          userId,
          snapshot: await getUserTripDataOnce(dbRef.current!, tripId, userId),
        })),
      );

      return Object.fromEntries(
        memberSnapshots.map(({ userId, snapshot }) => [userId, snapshot.data]),
      );
    },
    [state.trips, state.auth.currentUser?.id],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        loading,
        viewTripId,
        firebaseConnected,
        toast,
        showToast,
        dismissToast,
        login,
        logout,
        register,
        updateUser,
        setTips,
        setItems,
        setTemplate,
        addTrip,
        updateTrip,
        deleteTrip,
        getTripData,
        refreshTripData,
        setSharedTripData,
        setUserTripData,
        setTripMemberData,
        getUserName,
        getUserColor,
        isCurrentUserAdmin,
        isTripAdmin,
        loadTripMemberData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
