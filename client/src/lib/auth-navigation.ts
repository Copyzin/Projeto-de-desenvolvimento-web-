const LOGIN_NAVIGATION_MARKER_KEY = "auth.login_navigation_marker";
const PANEL_ENTRY_TRANSITION_MARKER_KEY = "auth.panel_entry_transition_marker";
const MARKER_MAX_AGE_MS = 2 * 60 * 1000;
const LEGACY_REDIRECT_KEYS = [
  "returnTo",
  "lastVisitedRoute",
  "redirectAfterLogin",
  "lastRoute",
];

type AuthMarker = {
  userId: number;
  createdAt: number;
};

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function parseMarker(raw: string | null): AuthMarker | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthMarker>;
    if (!parsed || typeof parsed.userId !== "number" || typeof parsed.createdAt !== "number") {
      return null;
    }

    return {
      userId: parsed.userId,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

function markerIsFresh(marker: AuthMarker) {
  return Date.now() - marker.createdAt <= MARKER_MAX_AGE_MS;
}

export function clearAuthNavigationState() {
  const storage = getSessionStorage();
  if (!storage) return;

  storage.removeItem(LOGIN_NAVIGATION_MARKER_KEY);
  storage.removeItem(PANEL_ENTRY_TRANSITION_MARKER_KEY);

  for (const key of LEGACY_REDIRECT_KEYS) {
    storage.removeItem(key);
  }

  if (typeof window !== "undefined") {
    for (const key of LEGACY_REDIRECT_KEYS) {
      window.localStorage.removeItem(key);
    }
  }
}

export function markLoginNavigation(userId: number) {
  const storage = getSessionStorage();
  if (!storage) return;

  const marker: AuthMarker = {
    userId,
    createdAt: Date.now(),
  };

  storage.setItem(LOGIN_NAVIGATION_MARKER_KEY, JSON.stringify(marker));
}

export function consumeLoginNavigation(userId: number): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;

  const marker = parseMarker(storage.getItem(LOGIN_NAVIGATION_MARKER_KEY));
  storage.removeItem(LOGIN_NAVIGATION_MARKER_KEY);

  if (!marker) return false;
  if (!markerIsFresh(marker)) return false;

  return marker.userId === userId;
}

export function markPanelEntryTransition(userId: number) {
  const storage = getSessionStorage();
  if (!storage) return;

  const marker: AuthMarker = {
    userId,
    createdAt: Date.now(),
  };

  storage.setItem(PANEL_ENTRY_TRANSITION_MARKER_KEY, JSON.stringify(marker));
}

export function consumePanelEntryTransition(userId: number): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;

  const marker = parseMarker(storage.getItem(PANEL_ENTRY_TRANSITION_MARKER_KEY));
  storage.removeItem(PANEL_ENTRY_TRANSITION_MARKER_KEY);

  if (!marker) return false;
  if (!markerIsFresh(marker)) return false;

  return marker.userId === userId;
}
