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
  FavoriteItem,
  ChecklistItem,
  FlightInfo,
  Hotel,
  ScheduleDay,
  ScheduleNote,
  TransportItem,
  ShoppingItem,
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
  subscribeToTemplate,
  subscribeToTips,
  subscribeToFavorites,
  syncUser,
  syncSharedTripData,
  syncUserTripData,
  syncTemplate,
  syncTips,
  syncFavorites,
  syncTrip,
  syncTripPartial,
  deleteTripFromFirestore,
  deleteSharedTripData,
  deleteUserTripData,
  shouldApplyIncomingSnapshot,
} from "../utils/firebase";
import { defaultTemplate } from "../data/seed";
import type { Firestore } from "firebase/firestore";

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
  shopping: ShoppingItem[];
  preparationNotes: string;
  setupComplete?: boolean;
  skipPreparation?: boolean;
}

// Combined for backward compat
export interface TripData extends SharedTripData, UserTripData {}

interface AppState {
  auth: { currentUser: User | null };
  users: User[];
  trips: Trip[];
  template: Template;
  tips: TipNote[];
  favorites: FavoriteItem[];
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
  | { type: "SET_FAVORITES"; favorites: FavoriteItem[] }
  | { type: "ADD_FAVORITE"; favorite: FavoriteItem }
  | { type: "UPDATE_FAVORITE"; favorite: FavoriteItem }
  | { type: "DELETE_FAVORITE"; favoriteId: string };

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
};

const WRITE_BLOCKED_ACTIONS = new Set<Action["type"]>([
  "ADD_USER",
  "UPDATE_USER",
  "ADD_TRIP",
  "UPDATE_TRIP",
  "DELETE_TRIP",
  "ADD_TIP",
  "UPDATE_TIP",
  "DELETE_TIP",
  "ADD_FAVORITE",
  "UPDATE_FAVORITE",
  "DELETE_FAVORITE",
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
    case "SET_FAVORITES":
      return { ...state, favorites: action.favorites };
    case "ADD_FAVORITE":
      return { ...state, favorites: [action.favorite, ...state.favorites] };
    case "UPDATE_FAVORITE":
      return {
        ...state,
        favorites: state.favorites.map((f) =>
          f.id === action.favorite.id ? action.favorite : f,
        ),
      };
    case "DELETE_FAVORITE":
      return {
        ...state,
        favorites: state.favorites.filter((f) => f.id !== action.favoriteId),
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
  getUserName: (userId: string) => string;
  getUserColor: (userId: string) => string;
  isCurrentUserAdmin: () => boolean;
  isTripAdmin: (trip: Trip) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

function loadInitialState(): AppState {
  const currentUser = storage.loadAuth();
  const trips = storage.getItem<Trip[]>("trips") || [];
  const template = storage.getItem<Template>("template") || defaultTemplate;
  const tips = storage.getItem<TipNote[]>("tips") || [];
  const favorites = storage.getItem<FavoriteItem[]>("favorites") || [];
  const users = storage.getItem<User[]>("users") || [];

  const sharedTripData =
    storage.getItem<Record<string, SharedTripData>>("sharedTripData") || {};
  const userTripData =
    storage.getItem<Record<string, UserTripData>>("userTripData") || {};

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
  }

  return {
    auth: { currentUser },
    users,
    trips,
    template,
    tips,
    favorites,
    sharedTripData,
    userTripData,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, null, loadInitialState);
  const [loading, setLoading] = useState(isFirebaseConfigured());
  const [dbReady, setDbReady] = useState(false);
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine);
  const dbRef = useRef<Firestore | null>(null);
  const firebaseListeningRef = useRef(false);
  const tripSubsRef = useRef<Record<string, () => void>>({});
  const skipFirstSave = useRef(true);
  const sharedTripDataRef = useRef(state.sharedTripData);
  const userTripDataRef = useRef(state.userTripData);
  const sharedTripUpdatedAtRef = useRef(
    storage.getItem<Record<string, string>>("sharedTripUpdatedAt") || {},
  );
  const userTripUpdatedAtRef = useRef(
    storage.getItem<Record<string, string>>("userTripUpdatedAt") || {},
  );

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

  const persistSharedTripCache = useCallback(
    (tripId: string, data: SharedTripData, updatedAt?: string) => {
      const nextSharedTripData = {
        ...sharedTripDataRef.current,
        [tripId]: data,
      };
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
      const nextUserTripData = {
        ...userTripDataRef.current,
        [tripId]: data,
      };
      userTripDataRef.current = nextUserTripData;
      storage.setItem("userTripData", nextUserTripData);
      if (updatedAt) {
        const nextUpdatedAt = {
          ...userTripUpdatedAtRef.current,
          [tripId]: updatedAt,
        };
        userTripUpdatedAtRef.current = nextUpdatedAt;
        storage.setItem("userTripUpdatedAt", nextUpdatedAt);
      }
    },
    [],
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

  // Subscribe to template, tips, favorites when user logs in
  useEffect(() => {
    if (!state.auth.currentUser || !dbRef.current) return;
    const db = dbRef.current;
    const userId = state.auth.currentUser.id;
    const unsub1 = subscribeToTemplate(db, userId, (template) => {
      if (template) {
        rawDispatch({ type: "SET_TEMPLATE", template });
        storage.setItem("template", template);
      } else {
        rawDispatch({ type: "SET_TEMPLATE", template: defaultTemplate });
        storage.setItem("template", defaultTemplate);
      }
    });
    const unsub2 = subscribeToTips(db, userId, (tips) => {
      rawDispatch({ type: "SET_TIPS", tips });
      storage.setItem("tips", tips);
    });
    const unsub3 = subscribeToFavorites(db, userId, (favorites) => {
      rawDispatch({ type: "SET_FAVORITES", favorites });
      storage.setItem("favorites", favorites);
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
      const currentUpdatedAt = sharedTripUpdatedAtRef.current[viewTripId];
      if (!shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)) {
        return;
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
      }
    }

    // Subscribe to new trips only — existing subscriptions stay untouched
    for (const tripId of currentTripIds) {
      if (!tripSubsRef.current[tripId]) {
        const unsub1 = subscribeToSharedTripData(db, tripId, (snapshot) => {
          const currentUpdatedAt = sharedTripUpdatedAtRef.current[tripId];
          if (
            !shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)
          ) {
            return;
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
            const currentUpdatedAt = userTripUpdatedAtRef.current[tripId];
            if (
              !shouldApplyIncomingSnapshot(currentUpdatedAt, snapshot.updatedAt)
            ) {
              return;
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

  // Save local cache for non-trip collections and sync tips/favorites to Firebase.
  const prevTipsRef = useRef(state.tips);
  const prevFavoritesRef = useRef(state.favorites);
  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    storage.setItem("users", state.users);
    storage.setItem("trips", state.trips);
    storage.setItem("template", state.template);
    storage.setItem("tips", state.tips);
    storage.setItem("favorites", state.favorites);

    // Sync tips/favorites to Firebase when they change
    if (firebaseConnected && dbRef.current && state.auth.currentUser) {
      if (state.tips !== prevTipsRef.current) {
        syncTips(dbRef.current, state.auth.currentUser.id, state.tips);
      }
      if (state.favorites !== prevFavoritesRef.current) {
        syncFavorites(
          dbRef.current,
          state.auth.currentUser.id,
          state.favorites,
        );
      }
    }
    prevTipsRef.current = state.tips;
    prevFavoritesRef.current = state.favorites;
  }, [
    state.users,
    state.trips,
    state.template,
    state.tips,
    state.favorites,
    state.auth.currentUser,
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
      if (fields) {
        dispatch({ type: "UPDATE_TRIP", trip: { ...trip, ...fields } });
        if (dbRef.current) syncTripPartial(dbRef.current, trip.id, fields);
      } else {
        dispatch({ type: "UPDATE_TRIP", trip });
        if (dbRef.current) syncTrip(dbRef.current, trip);
      }
    },
    [dispatch, firebaseConnected],
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
      sharedTripUpdatedAtRef.current = restSharedAt;
      userTripUpdatedAtRef.current = restUserAt;
      storage.setItem("sharedTripData", restShared);
      storage.setItem("userTripData", restUser);
      storage.setItem("sharedTripUpdatedAt", restSharedAt);
      storage.setItem("userTripUpdatedAt", restUserAt);
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
    const updatedAt = new Date().toISOString();
    sharedTripUpdatedAtRef.current = {
      ...sharedTripUpdatedAtRef.current,
      [tripId]: updatedAt,
    };
    dispatch({ type: "UPDATE_SHARED_TRIP_DATA", tripId, data });
    syncSharedTripData(dbRef.current, tripId, data, updatedAt);
  }

  function setUserTripData(tripId: string, data: Partial<UserTripData>) {
    if (!firebaseConnected || !dbRef.current || !state.auth.currentUser) return;
    const updatedAt = new Date().toISOString();
    userTripUpdatedAtRef.current = {
      ...userTripUpdatedAtRef.current,
      [tripId]: updatedAt,
    };
    dispatch({ type: "UPDATE_USER_TRIP_DATA", tripId, data });
    syncUserTripData(
      dbRef.current,
      tripId,
      state.auth.currentUser.id,
      data,
      updatedAt,
    );
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
        getUserName,
        getUserColor,
        isCurrentUserAdmin,
        isTripAdmin,
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
