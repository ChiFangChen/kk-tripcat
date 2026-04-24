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
  getUserTripDataOnce,
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
  isClientVersionOutdated,
  shouldApplyIncomingSnapshot,
} from "../utils/firebase";
import { defaultTemplate } from "../data/seed";
import type { Firestore } from "firebase/firestore";
import type { Item, TripShoppingItem } from "../pages/trip/shoppingTypes";

// Shared data (visible to all trip members)
export interface SharedTripData {
  schedule: ScheduleDay[];
  scheduleNotes: ScheduleNote[];
  flights: FlightInfo[];
  hotels: Hotel[];
  transport: TransportItem[];
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
  login: (user: User) => void;
  logout: () => void;
  register: (
    username: string,
    password: string,
    displayName: string,
  ) => Promise<User>;
  updateUser: (user: User) => void;
  setTemplate: (template: Template) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (trip: Trip, fields?: Partial<Trip>) => void;
  deleteTrip: (tripId: string) => void;
  getTripData: (tripId: string) => TripData;
  setSharedTripData: (tripId: string, data: Partial<SharedTripData>) => void;
  setUserTripData: (tripId: string, data: Partial<UserTripData>) => void;
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
    ? storage.getItem<TipNote[]>(getTipsStorageKey(currentUser.id)) || []
    : [];
  const items = currentUser
    ? storage.getItem<Item[]>(getItemsStorageKey(currentUser.id)) ||
      []
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
  const [loading, setLoading] = useState(isFirebaseConfigured());
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
  const versionBlockedTripIdsRef = useRef<Set<string>>(new Set());

  // Parse viewTripId from URL once
  const viewTripId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view");
  }, []);

  const firebaseConnected = dbReady && isOnline;

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
    rawDispatch({
      type: "SET_TIPS",
      tips: storage.getItem<TipNote[]>(getTipsStorageKey(currentUserId)) || [],
    });
    tipsUpdatedAtRef.current =
      storage.getItem<string>(getTipsUpdatedAtStorageKey(currentUserId)) ||
      undefined;
    rawDispatch({
      type: "SET_ITEMS",
      items: storage.getItem<Item[]>(getItemsStorageKey(currentUserId)) || [],
    });
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
          const unsub1 = subscribeToUsers(db, (users) => {
            rawDispatch({ type: "SET_USERS", users });
            storage.setItem("users", users);
            usersLoaded = true;
            checkReady();
          });
          const unsub2 = subscribeToTrips(db, (trips) => {
            rawDispatch({ type: "SET_TRIPS", trips });
            storage.setItem("trips", trips);
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
    if (!state.auth.currentUser || !dbRef.current) return;
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
        !shouldApplyIncomingSnapshot(
          tipsUpdatedAtRef.current,
          snapshot.updatedAt,
        )
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
        !shouldApplyIncomingSnapshot(
          itemsUpdatedAtRef.current,
          snapshot.updatedAt,
        )
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
        storage.setItem(getItemsUpdatedAtStorageKey(userId), snapshot.updatedAt);
      }
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [state.auth.currentUser]);

  // Subscribe to shared trip data for view-only link
  useEffect(() => {
    if (!viewTripId || !dbReady || !dbRef.current) return;
    return subscribeToSharedTripData(dbRef.current, viewTripId, (snapshot) => {
      if (isClientVersionOutdated(snapshot.appVersion)) {
        versionBlockedTripIdsRef.current.add(viewTripId);
      }
      const pendingUpdatedAt =
        pendingSharedTripUpdatedAtRef.current[viewTripId];
      if (
        pendingUpdatedAt &&
        (!snapshot.updatedAt || snapshot.updatedAt < pendingUpdatedAt)
      ) {
        return;
      }
      const currentUpdatedAt = sharedTripUpdatedAtRef.current[viewTripId];
      if (!shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)) {
        return;
      }
      if (
        pendingUpdatedAt &&
        snapshot.updatedAt &&
        snapshot.updatedAt >= pendingUpdatedAt
      ) {
        delete pendingSharedTripUpdatedAtRef.current[viewTripId];
      }
      rawDispatch({
        type: "SET_SHARED_TRIP_DATA",
        tripId: viewTripId,
        data: snapshot.data,
      });
      persistSharedTripCache(viewTripId, snapshot.data, snapshot.updatedAt);
    });
  }, [viewTripId, dbReady, persistSharedTripCache]);

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
          if (isClientVersionOutdated(snapshot.appVersion)) {
            versionBlockedTripIdsRef.current.add(tripId);
          }
          const pendingUpdatedAt =
            pendingSharedTripUpdatedAtRef.current[tripId];
          if (
            pendingUpdatedAt &&
            (!snapshot.updatedAt || snapshot.updatedAt < pendingUpdatedAt)
          ) {
            return;
          }
          const currentUpdatedAt = sharedTripUpdatedAtRef.current[tripId];
          if (
            !shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)
          ) {
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
        });
        const unsub2 = subscribeToUserTripData(
          db,
          tripId,
          userId,
          (snapshot) => {
            if (isClientVersionOutdated(snapshot.appVersion)) {
              versionBlockedTripIdsRef.current.add(tripId);
            }
            const pendingUpdatedAt =
              pendingUserTripUpdatedAtRef.current[tripId];
            if (
              pendingUpdatedAt &&
              (!snapshot.updatedAt || snapshot.updatedAt < pendingUpdatedAt)
            ) {
              return;
            }
            const currentUpdatedAt = userTripUpdatedAtRef.current[tripId];
            if (
              !shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)
            ) {
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
    persistSharedTripCache,
    persistUserTripCache,
  ]);

  // Save local cache for non-trip collections and sync tips/items to Firebase.
  const prevTipsRef = useRef(state.tips);
  const prevItemsRef = useRef(state.items);
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

    // Sync tips/item pool to Firebase when they change
    if (firebaseConnected && dbRef.current && state.auth.currentUser) {
      if (state.tips !== prevTipsRef.current) {
        const updatedAt = new Date().toISOString();
        pendingTipsUpdatedAtRef.current = updatedAt;
        tipsUpdatedAtRef.current = updatedAt;
        syncTips(
          dbRef.current,
          state.auth.currentUser.id,
          state.tips,
          updatedAt,
        ).catch(() => {
          if (pendingTipsUpdatedAtRef.current !== updatedAt) return;
          pendingTipsUpdatedAtRef.current = undefined;
        });
      }
      if (state.items !== prevItemsRef.current) {
        const updatedAt = new Date().toISOString();
        pendingItemsUpdatedAtRef.current = updatedAt;
        itemsUpdatedAtRef.current = updatedAt;
        syncItems(
          dbRef.current,
          state.auth.currentUser.id,
          state.items,
          updatedAt,
        ).catch(() => {
          if (pendingItemsUpdatedAtRef.current !== updatedAt) return;
          pendingItemsUpdatedAtRef.current = undefined;
        });
      }
    }
    prevTipsRef.current = state.tips;
    prevItemsRef.current = state.items;
  }, [
    state.users,
    state.trips,
    state.template,
    state.tips,
    state.items,
    currentUserId,
    firebaseConnected,
  ]);

  const login = useCallback((user: User) => {
    dispatch({ type: "LOGIN", user });
    storage.saveAuth(user);
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    storage.saveAuth(null);
  }, []);

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
      dispatch({ type: "ADD_USER", user });
      if (firebaseConnected && dbRef.current)
        await syncUser(dbRef.current, user);
      return user;
    },
    [state.users, dispatch, firebaseConnected],
  );

  const updateUser = useCallback(
    (user: User) => {
      dispatch({ type: "UPDATE_USER", user });
      if (user.id === state.auth.currentUser?.id) storage.saveAuth(user);
      if (firebaseConnected && dbRef.current) syncUser(dbRef.current, user);
    },
    [dispatch, firebaseConnected, state.auth.currentUser],
  );

  function setTemplate(template: Template) {
    if (!firebaseConnected) return;
    dispatch({ type: "SET_TEMPLATE", template });
    if (dbRef.current && state.auth.currentUser) {
      syncTemplate(dbRef.current, state.auth.currentUser.id, template);
      storage.setItem(
        getTemplateStorageKey(state.auth.currentUser.id),
        template,
      );
    }
  }

  const addTrip = useCallback(
    (trip: Trip) => {
      if (!firebaseConnected) return;
      dispatch({ type: "ADD_TRIP", trip });
      if (dbRef.current) syncTrip(dbRef.current, trip);
    },
    [dispatch, firebaseConnected],
  );

  const updateTrip = useCallback(
    (trip: Trip, fields?: Partial<Trip>) => {
      if (!firebaseConnected) return;
      const currentTrip =
        state.trips.find((item) => item.id === trip.id) || trip;
      const nextTrip = fields ? { ...currentTrip, ...fields } : trip;
      const removedMemberIds = currentTrip.members.filter(
        (memberId) => !nextTrip.members.includes(memberId),
      );
      if (fields) {
        dispatch({ type: "UPDATE_TRIP", trip: nextTrip });
        if (dbRef.current) {
          syncTripPartial(dbRef.current, trip.id, fields);
          removedMemberIds.forEach((memberId) => {
            deleteUserTripData(dbRef.current!, trip.id, memberId);
          });
        }
      } else {
        dispatch({ type: "UPDATE_TRIP", trip: nextTrip });
        if (dbRef.current) {
          syncTrip(dbRef.current, nextTrip);
          removedMemberIds.forEach((memberId) => {
            deleteUserTripData(dbRef.current!, trip.id, memberId);
          });
        }
      }
    },
    [dispatch, firebaseConnected, state.trips],
  );

  const deleteTrip = useCallback(
    (tripId: string) => {
      if (!firebaseConnected) return;
      const userId = state.auth.currentUser?.id;
      dispatch({ type: "DELETE_TRIP", tripId });
      const { [tripId]: _shared, ...restShared } = sharedTripDataRef.current;
      const { [tripId]: _user, ...restUser } = userTripDataRef.current;
      const { [tripId]: _sharedAt, ...restSharedAt } =
        sharedTripUpdatedAtRef.current;
      const { [tripId]: _userAt, ...restUserAt } = userTripUpdatedAtRef.current;
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
      if (dbRef.current) {
        deleteTripFromFirestore(dbRef.current, tripId);
        deleteSharedTripData(dbRef.current, tripId);
        if (userId) deleteUserTripData(dbRef.current, tripId, userId);
      }
    },
    [dispatch, firebaseConnected, state.auth.currentUser?.id],
  );

  function getTripData(tripId: string): TripData {
    const shared = state.sharedTripData[tripId] || emptyShared;
    const user = state.userTripData[tripId] || emptyUser;
    return { ...shared, ...user };
  }

  function setSharedTripData(tripId: string, data: Partial<SharedTripData>) {
    if (!firebaseConnected || !dbRef.current) return;
    if (versionBlockedTripIdsRef.current.has(tripId)) {
      console.warn("Blocked shared trip write from outdated client:", tripId);
      return;
    }
    const updatedAt = new Date().toISOString();
    pendingSharedTripUpdatedAtRef.current = {
      ...pendingSharedTripUpdatedAtRef.current,
      [tripId]: updatedAt,
    };
    dispatch({ type: "UPDATE_SHARED_TRIP_DATA", tripId, data });
    syncSharedTripData(dbRef.current, tripId, data, updatedAt).catch(
      (error) => {
        if (pendingSharedTripUpdatedAtRef.current[tripId] !== updatedAt) return;
        delete pendingSharedTripUpdatedAtRef.current[tripId];
        const fallback = syncedSharedTripDataRef.current[tripId] || emptyShared;
        rawDispatch({ type: "SET_SHARED_TRIP_DATA", tripId, data: fallback });
        console.error("Failed to sync shared trip data:", error);
      },
    );
  }

  function setUserTripData(tripId: string, data: Partial<UserTripData>) {
    if (!firebaseConnected || !dbRef.current || !state.auth.currentUser) return;
    if (versionBlockedTripIdsRef.current.has(tripId)) {
      console.warn("Blocked user trip write from outdated client:", tripId);
      return;
    }
    const updatedAt = new Date().toISOString();
    pendingUserTripUpdatedAtRef.current = {
      ...pendingUserTripUpdatedAtRef.current,
      [tripId]: updatedAt,
    };
    dispatch({ type: "UPDATE_USER_TRIP_DATA", tripId, data });
    syncUserTripData(
      dbRef.current,
      tripId,
      state.auth.currentUser.id,
      data,
      updatedAt,
    ).catch((error) => {
      if (pendingUserTripUpdatedAtRef.current[tripId] !== updatedAt) return;
      delete pendingUserTripUpdatedAtRef.current[tripId];
      const fallback = syncedUserTripDataRef.current[tripId] || emptyUser;
      rawDispatch({ type: "SET_USER_TRIP_DATA", tripId, data: fallback });
      console.error("Failed to sync user trip data:", error);
    });
  }

  async function setTripMemberData(
    tripId: string,
    userId: string,
    data: Partial<UserTripData>,
  ): Promise<void> {
    if (!firebaseConnected || !dbRef.current) return;
    const updatedAt = new Date().toISOString();
    await syncUserTripData(dbRef.current, tripId, userId, data, updatedAt);
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

      const memberIds = trip.members.filter((userId) => userId !== currentUserId);
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
        login,
        logout,
        register,
        updateUser,
        setTemplate,
        addTrip,
        updateTrip,
        deleteTrip,
        getTripData,
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
