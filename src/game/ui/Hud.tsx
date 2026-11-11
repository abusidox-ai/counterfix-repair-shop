import { useEffect, useState, type ReactNode } from "react";
import { Coins, Hand, Package, ScrollText, Siren, Star, Undo2, Users, Wrench, X } from "lucide-react";
import { sfx } from "../audio";
import { closePanel, relock, useGame, openPanel } from "../store";
import * as R from "../sim/rules";
import { CUSTOMERS_PER_DAY, DEVICE_LABEL, PART_LABEL, PART_ORDER, PARTS, STOLEN_REWARD, verdict, type Sku, type ToolId } from "../sim/data";
import { resetPose } from "../scene/Player";

function ScrewdriverIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 9.5 21 3" />
      <path d="M3 21l4.5-4.5" />
      <rect x="5.2" y="11.3" width="5" height="9" rx="1.5" transform="rotate(45 7.7 15.8)" />
    </svg>
  );
}

const TOOL_META: Record<ToolId, { key: string; label: string; icon: (p: { className?: string }) => ReactNode }> = {
  screwdriver: { key: "1", label: "Screwdriver", icon: ScrewdriverIcon },
  wrench: { key: "2", label: "Wrench", icon: Wrench },
  hands: { key: "3", label: "Hands", icon: Hand },
};

function Btn({ children, onClick, variant = "primary", disabled, title }: { children: ReactNode; onClick: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; title?: string }) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_3px_0_var(--ink)]",
    secondary: "bg-secondary text-secondary-foreground hover:brightness-110 shadow-[0_3px_0_var(--ink)]",
    danger: "bg-destructive text-destructive-foreground hover:brightness-110 shadow-[0_3px_0_var(--ink)]",
    ghost: "bg-transparent text-ink border-2 border-ink/25 hover:border-ink/60",
  }[variant];
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => { sfx.click(); onClick(); }}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 font-display text-[15px] font-semibold transition active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

function Ticket({ children, title, tag, onClose, wide }: { children: ReactNode; title: ReactNode; tag?: string; onClose?: () => void; wide?: boolean }) {
  useEffect(() => {
    if (!onClose) return;
    const k = (e: KeyboardEvent) => { if (e.code === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-background/40 p-4 backdrop-blur-[2px]">
      <div className={`ticket relative w-full ${wide ? "max-w-2xl" : "max-w-xl"} rounded-md`}>
        <div className="perforated absolute inset-x-0 -top-[6px] h-3" />
        <div className="flex items-start justify-between gap-4 border-b-2 border-dashed border-ink/20 px-6 pb-3 pt-5">
          <div>
            {tag && <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{tag}</div>}
            <div className="font-display text-2xl font-extrabold leading-tight text-ink">{title}</div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded p-1 text-ink/60 hover:bg-ink/10 hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

function useTypewriter(text: string, speed = 18) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}

function Portrait({ name, accent }: { name: string; accent: string }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-ink font-display text-3xl font-extrabold text-paper" style={{ background: accent }}>
      {name.replace("Big ", "").replace("Old ", "")[0]}
    </div>
  );
}

// ------------------------------------------------------------- panels
function Dialogue() {
  const job = useGame((s) => s.game.job);
  const act = useGame((s) => s.act);
  const c = job?.customer;
  const dev = c ? DEVICE_LABEL[c.device] : "";
  const text = !job || !c ? "" : !job.accepted
    ? c.intro
    : job.repaired ? `Is that my ${dev}? Looks great — hand it over!` : `Any luck with my ${dev} yet? I'll wait right here.`;
  const tw = useTypewriter(text);
  if (!job || !c) return null;
  return (
    <Ticket tag={`Customer ${useGame.getState().game.index + 1} of ${CUSTOMERS_PER_DAY}`} title={c.name} onClose={closePanel}>
      <div className="flex gap-4" onClick={tw.skip}>
        <Portrait name={c.name} accent={c.accent} />
        <div className="min-h-[96px] flex-1">
          <div className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {dev} · {PART_LABEL[c.fault]} · pays ${c.fee}
          </div>
          <p className="font-display text-lg leading-snug text-ink">
            “{tw.shown}<span className={tw.done ? "opacity-0" : "animate-pulse"}>▍</span>”
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {!job.accepted ? (
          <>
            <Btn onClick={() => { act(R.accept); closePanel(); }}>Accept job</Btn>
            <Btn variant="secondary" onClick={() => { act(R.inspect); openPanel("inspect"); }}>Inspect item</Btn>
            <Btn variant="ghost" onClick={() => { act(R.decline); sfx.door(); closePanel(); }}>Decline</Btn>
          </>
        ) : (
          <>
            {job.where === "counter" && !job.inspected && <Btn variant="secondary" onClick={() => { act(R.inspect); openPanel("inspect"); }}>Inspect item</Btn>}
            {job.where === "counter" && job.inspected && c.stolen && <Btn variant="secondary" onClick={() => openPanel("inspect")}>Inspection report</Btn>}
            <Btn onClick={closePanel}>Back to work</Btn>
          </>
        )}
      </div>
    </Ticket>
  );
}

function Inspect() {
  const job = useGame((s) => s.game.job);
  const act = useGame((s) => s.act);
  if (!job) return null;
  const c = job.customer;
  const back = () => openPanel("dialogue");
  return (
    <Ticket tag="Inspection report" title={`${c.name}'s ${DEVICE_LABEL[c.device]}`} onClose={back}>
      <div className="flex items-start gap-4">
        <div className={`rotate-[-6deg] rounded border-[3px] px-3 py-1 font-mono text-lg font-bold tracking-widest ${c.stolen ? "border-destructive text-destructive" : "border-success text-success"}`}>
          {c.stolen ? "STOLEN" : "LEGIT"}
        </div>
        <p className="flex-1 font-display text-lg leading-snug text-ink">{c.inspectNote}</p>
      </div>
      {c.stolen && (
        <p className="mt-3 text-sm text-muted-foreground">
          You decide. Repairing it anyway pays less, and people talk.
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {c.stolen ? (
          <>
            <Btn variant="danger" onClick={() => { act((s) => R.resolveStolen(s, "police")); sfx.register(); closePanel(); }}>
              <Siren className="h-4 w-4" /> Report to police · +${STOLEN_REWARD.police.cash}
            </Btn>
            <Btn variant="secondary" onClick={() => { act((s) => R.resolveStolen(s, "return")); sfx.register(); closePanel(); }}>
              <Undo2 className="h-4 w-4" /> Return to owner · +${STOLEN_REWARD.return.cash}
            </Btn>
            <Btn variant="ghost" onClick={() => { if (!job.accepted) act(R.accept); closePanel(); }}>Repair anyway</Btn>
          </>
        ) : (
          <Btn onClick={back}>Back to {c.name}</Btn>
        )}
      </div>
    </Ticket>
  );
}

function PartRow({ sku, action }: { sku: Sku; action: ReactNode }) {
  const p = PARTS[sku];
  const stock = useGame((s) => s.game.stock[sku]);
  return (
    <div className="flex items-center gap-3 border-b border-ink/10 py-2 last:border-0" title={`${p.name}: costs $${p.price} when fitted, +${p.rep} rep.`}>
      <div className="flex-1">
        <div className="font-display text-[15px] font-semibold text-ink">
          {p.name} {p.tier === "premium" && <span className="ml-1 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-foreground">Premium</span>}
        </div>
        <div className="font-mono text-xs text-muted-foreground">${p.price} when fitted · +{p.rep} rep</div>
      </div>
      <div className="w-16 text-right font-mono text-sm text-ink">
        <span className={stock ? "" : "text-destructive"}>{stock}</span> held
      </div>
      {action}
    </div>
  );
}

function Shelf() {
  const take = useGame((s) => s.take);
  return (
    <Ticket tag="Parts shelf" title="Grab what you need" onClose={closePanel} wide>
      <p className="mb-2 text-sm text-muted-foreground">Taking parts is free. You pay when you fit one into a device.</p>
      <div className="grid gap-x-6 sm:grid-cols-2">
        {PART_ORDER.map((sku) => (
          <PartRow key={sku} sku={sku} action={<Btn variant="secondary" onClick={() => take(sku)}>+1</Btn>} />
        ))}
      </div>
      <div className="mt-4 flex justify-end"><Btn onClick={closePanel}>Done</Btn></div>
    </Ticket>
  );
}

function Choose() {
  const job = useGame((s) => s.game.job);
  const stock = useGame((s) => s.game.stock);
  const act = useGame((s) => s.act);
  if (!job) return null;
  const options = PART_ORDER.filter((sku) => PARTS[sku].kind === job.customer.fault);
  return (
    <Ticket tag="Replacement part" title={`Replace the ${PART_LABEL[job.customer.fault]}`} onClose={closePanel}>
      {options.map((sku) => (
        <PartRow key={sku} sku={sku} action={
          <Btn disabled={!stock[sku]} title={stock[sku] ? "" : "Out of stock — visit the parts shelf"} onClick={() => { if (act((s) => R.chooseReplacement(s, sku))) closePanel(); }}>
            Use
          </Btn>
        } />
      ))}
      {options.every((s) => !stock[s]) && (
        <p className="mt-3 text-sm text-destructive">Out of stock. Grab one from the parts shelf on the east wall.</p>
      )}
    </Ticket>
  );
}

function Log() {
  const log = useGame((s) => s.log);
  const clear = useGame((s) => s.clearLog);
  return (
    <Ticket tag="Shop log" title="Today at the counter" onClose={closePanel}>
      <div className="max-h-[50vh] overflow-y-auto pr-2">
        {log.length === 0 && <p className="text-muted-foreground">Nothing yet. Go serve someone!</p>}
        {[...log].reverse().map((l, i) => (
          <div key={i} className="flex gap-3 border-b border-ink/10 py-1.5 text-sm text-ink last:border-0">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{l.t}</span>
            <span>{l.text}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <Btn variant="ghost" onClick={clear}>Clear log</Btn>
        <Btn onClick={closePanel}>Close</Btn>
      </div>
    </Ticket>
  );
}

function Summary() {
  const g = useGame((s) => s.game);
  const restart = useGame((s) => s.restart);
  const v = verdict(g.rep);
  const rows: [string, string][] = [
    ["Final cash", `$${g.cash}`], ["Reputation", `${g.rep}`], ["Repairs done", `${g.stats.repaired}`],
    ["Stolen goods reported", `${g.stats.reported}`], ["Returned to owners", `${g.stats.returned}`],
    ["Turned away", `${g.stats.declined}`], ["Spent on parts", `$${g.stats.spent}`],
  ];
  return (
    <Ticket tag="Day 01 · Closing time" title={v.title}>
      <p className="mb-4 font-display text-lg text-ink">{v.line}</p>
      <div className="rounded border-2 border-dashed border-ink/25 px-4 py-2 font-mono text-sm">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between py-1 text-ink"><span>{k}</span><span className="font-semibold">{val}</span></div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Btn onClick={() => { restart(); resetPose(); relock(); }}>Play again</Btn>
      </div>
    </Ticket>
  );
}

function Start() {
  const start = () => { useGame.setState({ started: true }); sfx.door(); relock(); };
  const controls: [string, string][] = [
    ["W A S D", "Walk"], ["Mouse", "Look"], ["Shift", "Hurry"], ["E", "Talk · pick up · use"],
    ["1 · 2 · 3", "Screwdriver · wrench · hands"], ["L", "Shop log"], ["Esc", "Free the mouse"],
  ];
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="ticket w-full max-w-lg rounded-md px-8 pb-8 pt-7">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-primary">Day 01 · 10 customers</div>
        <h1 className="mt-1 font-display text-6xl font-extrabold leading-none tracking-tight text-ink">Counterfix</h1>
        <p className="mt-3 font-display text-lg leading-snug text-ink/80">
          Your own little repair counter. Take the job, carry it to the repair desk, unscrew it, swap the part, and hand it back.
          Watch out for stolen goods.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[13px] text-ink">
          {controls.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2"><span className="rounded bg-ink px-1.5 py-0.5 text-[11px] text-paper">{k}</span><span className="text-ink/75">{v}</span></div>
          ))}
        </div>
        <div className="mt-7"><Btn onClick={start}>Open the shop</Btn></div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- HUD
function Stats() {
  const cash = useGame((s) => s.game.cash);
  const rep = useGame((s) => s.game.rep);
  const index = useGame((s) => s.game.index);
  const item = (icon: ReactNode, label: string, value: string) => (
    <div className="flex items-center gap-2 rounded-md bg-hud px-3 py-1.5 text-hud-foreground">
      {icon}
      <div className="leading-none">
        <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">{label}</div>
        <div className="font-display text-lg font-bold">{value}</div>
      </div>
    </div>
  );
  return (
    <div className="absolute left-4 top-4 flex gap-2">
      {item(<Coins className="h-5 w-5 text-accent" />, "Cash", `$${cash}`)}
      {item(<Star className="h-5 w-5 text-accent" />, "Rep", `${rep}`)}
      {item(<Users className="h-5 w-5 text-accent" />, "Served", `${Math.min(index, CUSTOMERS_PER_DAY)}/${CUSTOMERS_PER_DAY}`)}
    </div>
  );
}

function Objective() {
  const text = useGame((s) => R.objective(s.game));
  if (!text) return null;
  return (
    <div className="absolute left-1/2 top-4 max-w-[46vw] -translate-x-1/2 rounded-md bg-paper px-4 py-2 text-center text-ink shadow-ticket">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Next</div>
      <div className="font-display text-[15px] font-semibold leading-tight">{text}</div>
    </div>
  );
}

function Crosshair() {
  const prompt = useGame((s) => s.prompt);
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className={`mx-auto rounded-full transition-all ${prompt ? "h-3 w-3 border-2 border-primary" : "h-1.5 w-1.5 bg-hud-foreground/80"}`} />
      {prompt && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded bg-hud px-2.5 py-1 font-display text-sm text-hud-foreground">
          <span className="mr-2 rounded bg-primary px-1.5 font-mono text-xs font-bold text-primary-foreground">E</span>
          {prompt}
        </div>
      )}
    </div>
  );
}

function ToolBelt() {
  const equipped = useGame((s) => s.game.equipped);
  const tools = useGame((s) => s.game.tools);
  const job = useGame((s) => s.game.job);
  const equip = useGame((s) => s.equip);
  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-end gap-3">
      {job?.where === "hands" && (
        <div className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground">
          <Package className="h-5 w-5" />
          <div className="leading-none">
            <div className="font-mono text-[10px] uppercase tracking-widest opacity-80">Carrying</div>
            <div className="font-display text-sm font-bold">{job.customer.name}'s {DEVICE_LABEL[job.customer.device]}{job.repaired ? " ✓" : ""}</div>
          </div>
        </div>
      )}
      <div className="flex gap-1.5 rounded-lg bg-hud p-1.5">
        {(Object.keys(TOOL_META) as ToolId[]).map((t) => {
          const m = TOOL_META[t];
          const owned = t === "hands" || tools[t];
          const Icon = m.icon;
          return (
            <button
              key={t}
              type="button"
              onClick={() => equip(t)}
              title={owned ? m.label : `${m.label} — pick it up from the repair desk`}
              className={`relative flex h-14 w-16 flex-col items-center justify-center rounded-md border-2 text-hud-foreground transition ${equipped === t ? "border-primary bg-primary/25" : "border-transparent hover:bg-hud-foreground/10"} ${owned ? "" : "opacity-35"}`}
            >
              <span className="absolute left-1 top-0.5 font-mono text-[10px] opacity-70">{m.key}</span>
              <Icon className="h-6 w-6" />
              <span className="mt-0.5 font-display text-[11px]">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="absolute right-4 top-4 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`animate-toast-in rounded-md border-l-4 bg-paper px-3 py-2 font-display text-sm text-ink shadow-ticket ${t.kind === "good" ? "border-success" : t.kind === "bad" ? "border-destructive" : "border-secondary"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Corner() {
  return (
    <div className="pointer-events-auto absolute bottom-6 right-4 flex gap-2">
      <button type="button" onClick={() => openPanel("log")} className="flex items-center gap-1.5 rounded-md bg-hud px-3 py-2 font-display text-sm text-hud-foreground hover:brightness-125">
        <ScrollText className="h-4 w-4" /> Log <span className="font-mono text-[10px] opacity-60">L</span>
      </button>
    </div>
  );
}

function Paused() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/30">
      <div className="rounded-md bg-hud px-5 py-3 text-center text-hud-foreground">
        <div className="font-display text-xl font-bold">Paused</div>
        <div className="font-mono text-xs opacity-75">Click anywhere to keep working</div>
      </div>
    </div>
  );
}

export function Hud() {
  const panel = useGame((s) => s.panel);
  const started = useGame((s) => s.started);
  const locked = useGame((s) => s.locked);
  const dayOver = useGame((s) => s.game.dayOver);
  const loadLog = useGame((s) => s.loadLog);
  useEffect(() => loadLog(), [loadLog]);
  return (
    <div className="pointer-events-none absolute inset-0 select-none font-display">
      {started && (
        <>
          <Stats />
          <Objective />
          {!panel && <Crosshair />}
          <ToolBelt />
          <Corner />
          <Toasts />
          {!locked && !panel && !dayOver && <Paused />}
        </>
      )}
      {panel === "dialogue" && <Dialogue />}
      {panel === "inspect" && <Inspect />}
      {panel === "shelf" && <Shelf />}
      {panel === "choose" && <Choose />}
      {panel === "log" && <Log />}
      {dayOver && !panel && <Summary />}
      {!started && <Start />}
    </div>
  );
}
