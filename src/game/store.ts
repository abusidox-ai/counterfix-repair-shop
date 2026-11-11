import { create } from "zustand";
import { sfx } from "./audio";
import * as R from "./sim/rules";
import type { Sku, ToolId } from "./sim/data";

export type Panel = null | "dialogue" | "inspect" | "shelf" | "choose" | "log";
export interface Toast { id: number; kind: R.MsgKind; text: string }
export interface LogEntry { t: string; text: string }

const LOG_KEY = "counterfix.log.v1";

interface Store {
  game: R.GameState;
  panel: Panel;
  prompt: string | null;
  locked: boolean;
  started: boolean;
  toasts: Toast[];
  log: LogEntry[];
  act: (f: (s: R.GameState) => R.Result) => boolean;
  open: (p: Panel) => void;
  close: () => void;
  equip: (t: ToolId) => void;
  take: (sku: Sku) => void;
  restart: () => void;
  clearLog: () => void;
  loadLog: () => void;
}

let toastId = 0;
const stamp = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export const useGame = create<Store>((set, get) => ({
  game: R.createGame(),
  panel: null,
  prompt: null,
  locked: false,
  started: false,
  toasts: [],
  log: [],
  act: (f) => {
    const before = get().game;
    const { state, msgs } = f(before);
    const changed = state !== before;
    const toasts = msgs.map((m) => ({ id: ++toastId, kind: m.kind, text: m.text }));
    const logged = msgs.filter((m) => m.log).map((m) => ({ t: stamp(), text: m.text }));
    if (state.dayOver && !before.dayOver) logged.push({ t: stamp(), text: `Day 01 over — $${state.cash}, ${state.rep} rep.` });
    const log = logged.length ? [...get().log, ...logged].slice(-200) : get().log;
    if (logged.length && typeof window !== "undefined") localStorage.setItem(LOG_KEY, JSON.stringify(log));
    if (msgs.some((m) => m.kind === "bad")) sfx.bad();
    set({ game: state, toasts: [...get().toasts, ...toasts].slice(-5), log });
    for (const t of toasts) setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== t.id) }), 3800);
    return changed;
  },
  open: (panel) => set({ panel }),
  close: () => set({ panel: null }),
  equip: (t) => { if (get().act((s) => R.equip(s, t))) sfx.click(); },
  take: (sku) => { if (get().act((s) => R.takeStock(s, sku))) sfx.pop(); },
  restart: () => set({ game: R.createGame(), panel: null, toasts: [] }),
  clearLog: () => { localStorage.removeItem(LOG_KEY); set({ log: [] }); },
  loadLog: () => {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (raw) set({ log: JSON.parse(raw) });
    } catch { /* ignore corrupt log */ }
  },
}));

// ------------------------------------------------------------- pointer lock
let lockEl: HTMLElement | null = null;
export const setLockElement = (el: HTMLElement | null) => { lockEl = el; };

/** Re-capture the mouse, retrying through the browser's ~1s cooldown after Esc. */
export function relock(tries = 6) {
  if (!lockEl || document.pointerLockElement === lockEl) return;
  const p = lockEl.requestPointerLock() as unknown as Promise<void> | undefined;
  if (p && typeof p.catch === "function") {
    p.catch(() => { if (tries > 0 && !useGame.getState().panel) setTimeout(() => relock(tries - 1), 350); });
  }
}
export function unlock() {
  if (typeof document !== "undefined" && document.pointerLockElement) document.exitPointerLock();
}
/** Open a panel: frees the mouse. */
export function openPanel(p: Exclude<Panel, null>) {
  useGame.getState().open(p);
  unlock();
}
/** Close the panel and go back to first-person. */
export function closePanel() {
  useGame.getState().close();
  relock();
}
