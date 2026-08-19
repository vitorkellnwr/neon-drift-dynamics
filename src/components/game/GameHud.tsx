import type { RaceTelemetry } from "@/lib/garage";

const MAX_SPEED = 240;
const START_ANGLE = -215;
const SWEEP = 250;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

export default function GameHud({
  telemetry,
  onOpenMenu,
  arduinoConnected,
  cameraLabel = "Perseguição",
}: {
  telemetry: RaceTelemetry;
  onOpenMenu: () => void;
  arduinoConnected: boolean;
  cameraLabel?: string;
}) {
  const clamped = Math.min(Math.max(telemetry.speed, 0), MAX_SPEED);
  const ratio = clamped / MAX_SPEED;
  const angle = START_ANGLE + ratio * SWEEP;
  const arcLen = (2 * Math.PI * 42 * SWEEP) / 360;
  const gear = Math.min(6, Math.max(1, Math.floor(clamped / 42) + 1));
  const redline = ratio > 0.86;
  const driftPct = Math.min(1, Math.abs(telemetry.driftAngle) / 60);

  const ticks = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const deg = START_ANGLE + t * SWEEP;
    const major = i % 4 === 0;
    const inner = polar(50, 50, major ? 30 : 33, deg);
    const outer = polar(50, 50, 36, deg);
    return { i, t, deg, major, inner, outer };
  });

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute top-5 right-5 flex items-center gap-3 md:top-7 md:right-7">
        {arduinoConnected && (
          <span className="panel-glass rounded-lg px-3 py-2 text-xs font-bold tracking-[0.18em] text-neon-green uppercase">
            🔌 Arduino
          </span>
        )}
        <span className="panel-glass rounded-lg px-3 py-2 text-xs font-bold tracking-[0.18em] text-primary uppercase">
          📷 {cameraLabel} (C)
        </span>
        <button
          type="button"
          onClick={onOpenMenu}
          className="panel-glass rounded-xl px-4 py-2.5 text-sm font-bold tracking-[0.12em] uppercase transition-colors hover:bg-primary/25"
        >
          ⚙️ Menu Inicial (ESC)
        </button>
      </div>

      <div className="pointer-events-auto absolute top-5 left-5 flex flex-col gap-2 md:top-7 md:left-7">
        <div className="panel-glass min-w-[8.5rem] rounded-xl px-4 py-3">
          <p className="text-[0.6rem] tracking-[0.3em] text-muted-foreground uppercase">Pontuação</p>
          <p className="font-display text-2xl font-black tabular-nums text-foreground">
            {telemetry.score.toLocaleString()}
          </p>
          {telemetry.bestScore > 0 && (
            <p className="mt-0.5 text-[0.6rem] tracking-[0.18em] text-accent uppercase">
              Recorde: {telemetry.bestScore.toLocaleString()}
            </p>
          )}
        </div>
        {telemetry.isDrifting && (
          <div className="panel-glass glow-green animate-scale-in rounded-xl bg-neon-green/12 px-4 py-2.5">
            <p className="text-[0.6rem] tracking-[0.3em] text-neon-green uppercase">Drift Combo</p>
            <p className="font-display text-2xl font-black tabular-nums text-neon-green">
              ×{telemetry.combo.toFixed(1)}
            </p>
            <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-neon-green/20">
              <div
                className="h-full rounded-full bg-neon-green transition-[width] duration-100"
                style={{ width: `${driftPct * 100}%`, boxShadow: "0 0 8px currentColor" }}
              />
            </div>
            <p className="mt-1 text-[0.65rem] tracking-[0.18em] text-neon-green/80 uppercase">
              {telemetry.driftAngle}°
            </p>
          </div>
        )}
      </div>

      <div className="absolute right-4 bottom-4 md:right-8 md:bottom-8">
        <div className="relative size-48 md:size-60">
          {/* outer glass ring */}
          <div
            className={`panel-glass absolute inset-0 rounded-full transition-shadow duration-200 ${
              redline ? "shadow-[0_0_36px_oklch(0.62_0.24_22_/_55%)]" : ""
            }`}
          />
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
            <defs>
              <linearGradient id="speedGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="60%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--neon-magenta)" />
              </linearGradient>
            </defs>

            {/* track arc */}
            <path
              d={arcPath(50, 50, 42, START_ANGLE, START_ANGLE + SWEEP)}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* redline zone */}
            <path
              d={arcPath(50, 50, 42, START_ANGLE + SWEEP * 0.86, START_ANGLE + SWEEP)}
              fill="none"
              stroke="currentColor"
              className="text-destructive/70"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* value arc */}
            <path
              d={arcPath(50, 50, 42, START_ANGLE, START_ANGLE + SWEEP)}
              fill="none"
              stroke="url(#speedGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={`${ratio * arcLen} ${arcLen}`}
              style={{ filter: "drop-shadow(0 0 5px var(--primary))" }}
            />

            {/* ticks */}
            {ticks.map((t) => (
              <line
                key={t.i}
                x1={t.inner.x}
                y1={t.inner.y}
                x2={t.outer.x}
                y2={t.outer.y}
                stroke="currentColor"
                strokeWidth={t.major ? 1.4 : 0.7}
                className={t.t <= ratio ? "text-accent" : "text-muted-foreground/45"}
              />
            ))}

            {/* needle */}
            <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50px 50px" }}>
              <line
                x1="50"
                y1="50"
                x2="84"
                y2="50"
                stroke="currentColor"
                className={
                  redline
                    ? "text-destructive"
                    : telemetry.isDrifting
                      ? "text-neon-magenta"
                      : "text-accent"
                }
                strokeWidth="1.8"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
              />
            </g>
            <circle cx="50" cy="50" r="3.2" className="fill-background stroke-border" strokeWidth="1" />
          </svg>

          <div className="absolute inset-0 grid place-items-center">
            <div className="mt-3 text-center">
              <p
                className={`font-display text-4xl leading-none font-black tabular-nums md:text-5xl ${
                  redline ? "text-destructive" : "text-foreground"
                }`}
                style={{ textShadow: "0 0 18px oklch(0.72 0.19 230 / 45%)" }}
              >
                {Math.round(telemetry.speed)}
              </p>
              <p className="mt-1 text-[0.6rem] tracking-[0.35em] text-muted-foreground uppercase">
                km/h
              </p>
            </div>
          </div>

          {/* gear badge */}
          <div className="panel-glass absolute -top-1 left-1/2 -translate-x-1/2 rounded-lg px-3 py-1">
            <span className="font-display text-sm font-black tracking-[0.1em] text-primary">
              M{gear}
            </span>
          </div>

          {/* shift lights */}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {[0.5, 0.65, 0.78, 0.86, 0.93].map((th) => (
              <span
                key={th}
                className={`size-1.5 rounded-full transition-colors ${
                  ratio >= th
                    ? th >= 0.86
                      ? "bg-destructive shadow-[0_0_6px_currentColor]"
                      : "bg-neon-green shadow-[0_0_6px_currentColor]"
                    : "bg-muted-foreground/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
