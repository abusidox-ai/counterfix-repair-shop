import { create } from "zustand";
import { sfx } from "./audio";
import * as R from "./sim/rules";

export type Panel = null | "dialogue" | "notepad" | "pc" | "police" | "log";
export interface Toast { id: number; kind: R.MsgKind; text: string }
export interface LogEntry { t: string; text: string }

const LOG_KEY = "counterfix.log.v2";
const SAVE_KEY = "counterfix.save.v2";

interface Store {
  game: R.GameState;
  panel: Panel;
  prompt: string | null;
  promptAlt: string | null;
  locked: boolean;
  started: boolean;
  toasts: Toast[];
  log: LogEntry[];
  save: R.SaveData | null;
  act: (f: (s: R.GameState) => R.Result) => boolean;
  tickClock: (minutes: number) => void;
  open: (p: Panel) => void;
  close: () => void;
  newGame: () => void;
  continueGame: () => void;
  nextDay: () => void;
  clearLog: () => void;
  load: () => void;
}

let toastId = 0;
const stamp = (s: R.GameState) => `D${s.day} ${R.fmtClock(s.clock)}`;

export const useGame = create<Store>((set, get) => ({
  game: R.createGame(),
  panel: null,
  prompt: null,
  promptAlt: null,
  locked: false,
  started: false,
  toasts: [],
  log: [],
  save: null,
  act: (f) => {
    const before = get().game;
    const { state, msgs } = f(before);
    const changed = state !== before;
    const toasts = msgs.map((m) => ({ id: ++toastId, kind: m.kind, text: m.text }));
    const logged = msgs.filter((m) => m.log).map((m) => ({ t: stamp(state), text: m.text }));
    let save = get().save;
    if (state.dayOver && !before.dayOver) {
      logged.push({ t: stamp(state), text: `Day ${state.day} over: $${state.cash}, ${state.rep} rep.` });
      save = R.saveData(state);
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage full */ }
    }
    const log = logged.length ? [...get().log, ...logged].slice(-200) : get().log;
    if (logged.length) try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch { /* ignore */ }
    if (msgs.some((m) => m.kind === "bad")) sfx.bad();
    set({ game: state, toasts: [...get().toasts, ...toasts].slice(-5), log, save });
    for (const t of toasts) setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== t.id) }), 4200);
    return changed;
  },
  tickClock: (minutes) => {
    const r = R.tick(get().game, minutes);
    if (r.msgs.length) get().act(() => r);
    else set({ game: r.state });
  },
  open: (panel) => set({ panel }),
  close: () => set({ panel: null }),
  newGame: () => set({ game: R.createGame(), panel: null, toasts: [], started: true }),
  continueGame: () => { const sv = get().save; set({ game: R.createGame(sv ?? undefined), panel: null, toasts: [], started: true }); },
  nextDay: () => {
    const g = R.nextDay(get().game);
    const save = R.saveData(g);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
    set({ game: g, panel: null, toasts: [], save });
  },
  clearLog: () => { localStorage.removeItem(LOG_KEY); set({ log: [] }); },
  load: () => {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (raw) set({ log: JSON.parse(raw) });
      const sv = localStorage.getItem(SAVE_KEY);
      if (sv) set({ save: JSON.parse(sv) });
    } catch { /* ignore corrupt storage */ }
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
export function openPanel(p: Exclude<Panel, null>) {
  useGame.getState().open(p);
  unlock();
}
export function closePanel() {
  useGame.getState().close();
  relock();
}
