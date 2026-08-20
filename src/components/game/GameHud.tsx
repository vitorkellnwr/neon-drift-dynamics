import { useEffect, useRef, useState } from "react";
import type { RaceTelemetry } from "@/lib/garage";

const MAX_SPEED = 240;

type Skill = { id: number; label: string; points: number };

const SKILL_TIERS: { min: number; label: string }[] = [
  { min: 5, label: "Drift" },
  { min: 12, label: "Bom Drift" },
  { min: 25, label: "Ótimo Drift!" },
  { min: 45, label: "Drift Insano!" },
  { min: 80, label: "Lendário!!" },
];

function tierFor(points: number) {
  let label = SKILL_TIERS[0]!.label;
  for (const tier of SKILL_TIERS) if (points >= tier.min) label = tier.label;
  return label;
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
  const gear = Math.min(6, Math.max(1, Math.floor(clamped / 42) + 1));
  const rpm = Math.min(1, (clamped % 42) / 42 + ratio * 0.25 + 0.12);
  const redline = rpm > 0.88;
  const driftPct = Math.min(1, Math.abs(telemetry.driftAngle) / 60);

  // Forza-style skill chain: accumulates while drifting, banks on exit.
  const [skills, setSkills] = useState<Skill[]>([]);
  const [chain, setChain] = useState(0);
  const prevScore = useRef(telemetry.score);
  const chainRef = useRef(0);
  const wasDrifting = useRef(false);
  const idRef = useRef(0);

  useEffect(() => {
    const delta = Math.max(0, telemetry.score - prevScore.current);
    prevScore.current = telemetry.score;

    if (telemetry.isDrifting) {
      chainRef.current += delta;
      setChain(chainRef.current);
      wasDrifting.current = true;
      return;
    }

    if (wasDrifting.current) {
      wasDrifting.current = false;
      const banked = Math.round(chainRef.current);
      chainRef.current = 0;
      setChain(0);
      if (banked >= 5) {
        const id = ++idRef.current;
        setSkills((current) => [...current.slice(-3), { id, label: tierFor(banked), points: banked }]);
        window.setTimeout(() => setSkills((c) => c.filter((s) => s.id !== id)), 2600);
      }
    }
  }, [telemetry.score, telemetry.isDrifting]);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 md:p-6">
        <div className="panel-glass flex items-center gap-5 rounded-2xl px-5 py-3">
          <div>
            <p className="text-[0.55rem] tracking-[0.32em] text-muted-foreground uppercase">Pontos</p>
            <p className="font-display text-2xl leading-none font-black tabular-nums text-foreground md:text-3xl">
              {telemetry.score.toLocaleString()}
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-[0.55rem] tracking-[0.32em] text-muted-foreground uppercase">Recorde</p>
            <p className="font-display text-lg leading-none font-black tabular-nums text-accent">
              {telemetry.bestScore.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {arduinoConnected && (
            <span className="panel-glass rounded-xl px-3 py-2 text-[0.65rem] font-bold tracking-[0.18em] text-neon-green uppercase">
              🔌 Arduino
            </span>
          )}
          <span className="panel-glass rounded-xl px-3 py-2 text-[0.65rem] font-bold tracking-[0.18em] text-primary uppercase">
            📷 {cameraLabel} (C)
          </span>
          <button
            type="button"
            onClick={onOpenMenu}
            className="panel-glass rounded-xl px-4 py-2 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition-colors hover:bg-primary/25"
          >
            ⚙️ Menu (ESC)
          </button>
        </div>
      </div>

      {/* skill feed (Forza style, right side) */}
      <div className="absolute top-1/3 right-4 flex w-56 flex-col items-end gap-2 md:right-8">
        {telemetry.isDrifting && (
          <div className="panel-glass glow-green animate-scale-in w-full rounded-xl bg-neon-green/10 px-4 py-3 text-right">
            <p className="text-[0.55rem] tracking-[0.3em] text-neon-green uppercase">Drift</p>
            <p className="font-display text-3xl leading-none font-black tabular-nums text-neon-green">
              {Math.round(chain).toLocaleString()}
            </p>
            <p className="mt-1 text-[0.7rem] font-bold tracking-[0.2em] text-neon-green/85 uppercase">
              ×{telemetry.combo.toFixed(1)} · {telemetry.driftAngle}°
            </p>
            <div className="mt-2 ml-auto h-1 w-full overflow-hidden rounded-full bg-neon-green/20">
              <div
                className="h-full rounded-full bg-neon-green transition-[width] duration-100"
                style={{ width: `${driftPct * 100}%`, boxShadow: "0 0 8px currentColor" }}
              />
            </div>
          </div>
        )}
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="panel-glass animate-scale-in w-full rounded-xl bg-neon-magenta/12 px-4 py-2 text-right"
          >
            <p className="font-display text-sm font-black tracking-[0.14em] text-neon-magenta uppercase">
              {skill.label}
            </p>
            <p className="font-display text-xl leading-none font-black tabular-nums text-foreground">
              +{skill.points.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* bottom center cluster */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 md:p-7">
        {/* shift lights */}
        <div className="flex gap-1.5">
          {[0.35, 0.5, 0.62, 0.72, 0.8, 0.88, 0.94].map((th) => (
            <span
              key={th}
              className={`h-1.5 w-6 rounded-full transition-colors duration-75 ${
                rpm >= th
                  ? th >= 0.88
                    ? "bg-destructive shadow-[0_0_10px_currentColor]"
                    : th >= 0.72
                      ? "bg-accent shadow-[0_0_8px_currentColor]"
                      : "bg-neon-green shadow-[0_0_8px_currentColor]"
                  : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <div className="panel-glass flex items-end gap-5 rounded-2xl px-6 py-3 md:gap-7 md:px-8">
          {/* gear */}
          <div className="text-center">
            <p className="text-[0.5rem] tracking-[0.3em] text-muted-foreground uppercase">Marcha</p>
            <p
              className={`font-display text-4xl leading-none font-black md:text-5xl ${
                redline ? "text-destructive" : "text-primary"
              }`}
              style={{ textShadow: "0 0 18px currentColor" }}
            >
              {gear}
            </p>
          </div>

          <div className="h-12 w-px bg-border" />

          {/* rpm + speed bar */}
          <div className="w-44 md:w-72">
            <div className="relative h-3 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full transition-[width] duration-75"
                style={{
                  width: `${rpm * 100}%`,
                  background: redline
                    ? "linear-gradient(90deg, var(--destructive), var(--neon-magenta))"
                    : "linear-gradient(90deg, var(--accent), var(--primary), var(--neon-magenta))",
                  boxShadow: "0 0 12px var(--primary)",
                }}
              />
              <div className="absolute inset-y-0 right-[12%] w-px bg-destructive/70" />
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/30">
              <div
                className="h-full rounded-full bg-foreground/70 transition-[width] duration-150"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[0.5rem] tracking-[0.25em] text-muted-foreground uppercase">
              <span>rpm</span>
              <span>{MAX_SPEED} km/h</span>
            </div>
          </div>

          <div className="h-12 w-px bg-border" />

          {/* speed */}
          <div className="flex items-baseline gap-1.5">
            <p
              className={`font-display text-5xl leading-none font-black tabular-nums md:text-6xl ${
                redline ? "text-destructive" : "text-foreground"
              }`}
              style={{ textShadow: "0 0 22px oklch(0.72 0.19 230 / 55%)" }}
            >
              {Math.round(telemetry.speed)}
            </p>
            <span className="text-[0.6rem] tracking-[0.3em] text-muted-foreground uppercase">km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
