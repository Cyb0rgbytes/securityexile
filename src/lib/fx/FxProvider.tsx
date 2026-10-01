"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  FX_STORAGE_KEY,
  resolveFxLevel,
  type FxLevel,
  type FxPreference,
  type FxSignals,
} from "./resolve";

interface FxContextValue {
  /** null until the client has resolved it; render the static fallback meanwhile. */
  level: FxLevel | null;
  preference: FxPreference;
  setPreference: (pref: FxPreference) => void;
}

const FxContext = createContext<FxContextValue | null>(null);

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const PREF_EVENT = "se-fx-change";

// ---- external store: localStorage preference + media query + device signals ----

function readPreference(): FxPreference {
  try {
    const v = localStorage.getItem(FX_STORAGE_KEY);
    return v === "full" || v === "low" ? v : "auto";
  } catch {
    return "auto";
  }
}

function writePreference(pref: FxPreference) {
  try {
    if (pref === "auto") localStorage.removeItem(FX_STORAGE_KEY);
    else localStorage.setItem(FX_STORAGE_KEY, pref);
  } catch {
    // storage blocked (private mode etc.) - the choice just won't persist
  }
}

let webglCache: boolean | undefined;
function hasWebGL(): boolean {
  if (webglCache !== undefined) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

function readSignals(): FxSignals {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    reducedMotion: window.matchMedia(REDUCED_MOTION).matches,
    deviceMemory: nav.deviceMemory,
    cpuCores: nav.hardwareConcurrency || undefined,
    viewportWidth: window.innerWidth,
    webgl: hasWebGL(),
  };
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  window.addEventListener(PREF_EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(PREF_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getLevel = (): FxLevel => resolveFxLevel(readPreference(), readSignals());
const getServerLevel = (): FxLevel | null => null;
const getServerPreference = (): FxPreference => "auto";

// ---- provider ----

export function FxProvider({ children }: { children: ReactNode }) {
  const level = useSyncExternalStore<FxLevel | null>(subscribe, getLevel, getServerLevel);
  const preference = useSyncExternalStore(subscribe, readPreference, getServerPreference);

  // Keep the CSS hook in sync with the resolved level.
  useEffect(() => {
    if (level) document.documentElement.dataset.fx = level;
  }, [level]);

  const setPreference = useCallback((pref: FxPreference) => {
    writePreference(pref);
    window.dispatchEvent(new Event(PREF_EVENT));
  }, []);

  const value = useMemo(
    () => ({ level, preference, setPreference }),
    [level, preference, setPreference],
  );

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
}

export function useFx(): FxContextValue {
  const ctx = useContext(FxContext);
  if (!ctx) throw new Error("useFx must be used inside <FxProvider>");
  return ctx;
}
