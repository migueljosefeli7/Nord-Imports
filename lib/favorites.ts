"use client";

import { useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "nord-imports:favorites";
const EVENT_NAME = "nord-favorites-change";

function readSnapshot() {
  if (typeof window === "undefined") return "[]";
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return JSON.stringify(Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string"))].sort() : []);
  } catch {
    return "[]";
  }
}

function subscribe(callback: () => void) {
  const update = () => callback();
  window.addEventListener(EVENT_NAME, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(EVENT_NAME, update);
    window.removeEventListener("storage", update);
  };
}

export function useFavorites() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => "[]");
  const ids = useMemo(() => JSON.parse(snapshot) as string[], [snapshot]);
  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_NAME));
  }
  function clear() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(EVENT_NAME));
  }
  return { ids, count: ids.length, has: (id: string) => ids.includes(id), toggle, clear };
}
