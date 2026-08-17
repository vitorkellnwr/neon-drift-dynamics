import type { RaceTelemetry } from "@/lib/garage";

export default function GameHud({
  telemetry,
  onOpenMenu,
  arduinoConnected,
}: {
  telemetry: RaceTelemetry;
  onOpenMenu: () => void;
  arduinoConnected: boolean;
}) {
  const clamped = Math.min(telemetry.speed, 240);
  const angle = -120 + (clamped / 240) * 240;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute top-5 right-5 flex items-center gap-3 md:top-7 md:right-7">
        {arduinoConnected && (
          <span className="panel-glass rounded-lg px-3 py-2 text-xs font-bold tracking-[0.18em] text-neon-green uppercase">
            🔌 Arduino
          </span>
        )}
        <span className="panel-glass rounded-lg px-3 py-2 text-xs font-bold tracking-[0.18em] text-primary uppercase">
          📷 Câmera (C)
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
          <div className="panel-glass glow-green rounded-xl bg-neon-green/12 px-4 py-2.5">
            <p className="text-[0.6rem] tracking-[0.3em] text-neon-green uppercase">Drift Combo</p>
            <p className="font-display text-2xl font-black tabular-nums text-neon-green">
              ×{telemetry.combo.toFixed(1)}
            </p>
            <p className="text-[0.65rem] tracking-[0.18em] text-neon-green/80 uppercase">
              {telemetry.driftAngle}°
            </p>
          </div>
        )}
      </div>

      <div className="absolute right-5 bottom-5 md:right-8 md:bottom-8">
        <div className="panel-glass relative grid size-40 place-items-center rounded-full md:size-48">
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth="5"
              strokeDasharray="176 264"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              className={telemetry.isDrifting ? "text-neon-magenta" : "text-primary"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(clamped / 240) * 176} 264`}
              style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
            />
          </svg>
          <div
            className={`absolute bottom-1/2 left-1/2 h-14 w-0.5 origin-bottom md:h-16 ${telemetry.isDrifting ? "bg-neon-magenta" : "bg-accent"}`}
            style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
          />
          <div className="z-10 text-center">
            <p className="font-display text-4xl font-black text-foreground tabular-nums md:text-5xl">
              {Math.round(telemetry.speed)}
            </p>
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">km/h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
