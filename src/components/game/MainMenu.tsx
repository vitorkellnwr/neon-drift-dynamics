import { useRef, useState } from "react";
import {
  FINISH_LABELS,
  PAINT_SWATCHES,
  UNDERGLOW_SWATCHES,
  type CarCustomization,
  type Finish,
  type Model3D,
} from "@/lib/garage";
import type { ArduinoStatus } from "@/lib/arduino";

type Props = {
  cars: Model3D[];
  tracks: Model3D[];
  selectedCarId: string;
  selectedTrackId: string;
  onSelectCar: (id: string) => void;
  onSelectTrack: (id: string) => void;
  onUploadCars: (files: File[]) => void;
  onUploadTrack: (files: File[]) => void;
  onFullscreen: () => void;
  onStart: () => void;
  customization: CarCustomization;
  onCustomize: (patch: Partial<CarCustomization>) => void;
  onResetCustomization: () => void;
  bestScore: number;
  arduinoStatus: ArduinoStatus;
  arduinoMessage: string;
  onConnectArduino: () => void;
  onDisconnectArduino: () => void;
};

type Tab = "cars" | "tracks" | "custom";

const statusLabel: Record<ArduinoStatus, string> = {
  unsupported: "Não suportado",
  disconnected: "Desconectado",
  connecting: "Conectando…",
  connected: "Conectado",
  error: "Erro",
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "cars", label: "Carros" },
  { id: "tracks", label: "Mapas" },
  { id: "custom", label: "Customizar" },
];

function StatusDot({ status }: { status: ArduinoStatus }) {
  const tone =
    status === "connected"
      ? "bg-neon-green glow-green"
      : status === "connecting"
        ? "bg-accent"
        : status === "error"
          ? "bg-destructive"
          : "bg-muted-foreground";
  return <span className={`inline-block size-2 rounded-full ${tone}`} aria-hidden="true" />;
}

function ModelList({
  items,
  selectedId,
  onSelect,
}: {
  items: Model3D[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="max-h-[19rem] space-y-1.5 overflow-y-auto pr-1">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left transition-all ${
              active
                ? "border-l-primary bg-primary/15 text-foreground shadow-[var(--glow-primary)]"
                : "border-l-transparent bg-secondary/25 text-muted-foreground hover:border-l-accent/60 hover:bg-secondary/50"
            }`}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.paint ?? "currentColor" }}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{item.name}</span>
              {item.tagline && (
                <span className="block truncate text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                  {item.tagline}
                </span>
              )}
            </span>
            {item.builtIn && (
              <span className="ml-auto text-[0.55rem] tracking-[0.2em] text-accent uppercase">
                Padrão
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Swatches({
  colors,
  value,
  onSelect,
}: {
  colors: readonly string[];
  value: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Cor ${color}`}
          onClick={() => onSelect(color)}
          className={`size-7 rounded-full border transition-transform hover:scale-110 ${
            value.toLowerCase() === color.toLowerCase()
              ? "border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
              : "border-border"
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export default function MainMenu(props: Props) {
  const carInput = useRef<HTMLInputElement>(null);
  const trackInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("cars");

  const selectedCar = props.cars.find((car) => car.id === props.selectedCarId);
  const selectedTrack = props.tracks.find((track) => track.id === props.selectedTrackId);
  const custom = props.customization;

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Cinematic scrims so the car reads clearly against the UI */}
      <div className="absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-background via-background/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

      {/* Top bar */}
      <header className="pointer-events-auto absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-10">
        <div className="flex items-baseline gap-3">
          <span className="h-6 w-1 bg-primary shadow-[var(--glow-primary)]" />
          <div>
            <h1 className="text-gradient-neon font-display text-2xl leading-none font-black tracking-[0.08em] uppercase md:text-4xl">
              Drift Simulator
            </h1>
            <p className="mt-1 text-[0.6rem] tracking-[0.5em] text-muted-foreground uppercase">
              Neon Horizon · Arcade Drift
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {props.bestScore > 0 && (
            <div className="panel-glass rounded-lg px-3 py-2 text-right">
              <p className="text-[0.55rem] tracking-[0.3em] text-muted-foreground uppercase">
                Recorde
              </p>
              <p className="font-display text-sm font-black tabular-nums text-accent">
                {props.bestScore.toLocaleString()}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2 backdrop-blur-md">
            <StatusDot status={props.arduinoStatus} />
            <span className="text-[0.65rem] tracking-[0.24em] uppercase">
              Arduino · {statusLabel[props.arduinoStatus]}
            </span>
          </div>
          <button
            type="button"
            onClick={
              props.arduinoStatus === "connected"
                ? props.onDisconnectArduino
                : props.onConnectArduino
            }
            className="rounded-lg border border-primary/50 bg-primary/15 px-4 py-2 text-[0.65rem] font-bold tracking-[0.24em] text-primary uppercase transition-colors hover:bg-primary/30"
          >
            {props.arduinoStatus === "connected" ? "Desconectar" : "Conectar"}
          </button>
          <button
            type="button"
            onClick={props.onFullscreen}
            className="rounded-lg border border-border bg-card/70 px-4 py-2 text-[0.65rem] font-bold tracking-[0.24em] uppercase backdrop-blur-md transition-colors hover:bg-secondary/70"
          >
            Tela cheia
          </button>
        </div>
      </header>

      {/* Left command panel */}
      <div className="pointer-events-auto absolute top-1/2 left-6 w-[24rem] max-w-[calc(100%-3rem)] -translate-y-1/2 md:left-10">
        <div className="border-t border-b border-border/70 py-5">
          <p className="text-[0.6rem] tracking-[0.5em] text-accent uppercase">Garagem</p>
          <h2 className="font-display mt-1 truncate text-2xl font-black uppercase">
            {selectedCar?.name ?? "—"}
          </h2>
          <p className="mt-1 text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Pista: {selectedTrack?.name ?? "—"}
          </p>
        </div>

        <div className="mt-4 flex gap-1 rounded-lg border border-border bg-card/60 p-1 backdrop-blur-md">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-md px-3 py-2 text-[0.62rem] font-bold tracking-[0.2em] uppercase transition-colors ${
                tab === item.id
                  ? "bg-primary/20 text-primary shadow-[var(--glow-primary)]"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          ref={carInput}
          type="file"
          accept=".glb,.gltf"
          multiple
          hidden
          onChange={(event) => {
            props.onUploadCars(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <input
          ref={trackInput}
          type="file"
          accept=".glb,.gltf"
          multiple
          hidden
          onChange={(event) => {
            props.onUploadTrack(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />

        <div className="mt-4">
          {tab === "cars" && (
            <div className="space-y-3">
              <ModelList
                items={props.cars}
                selectedId={props.selectedCarId}
                onSelect={props.onSelectCar}
              />
              <button
                type="button"
                onClick={() => carInput.current?.click()}
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-[0.65rem] font-bold tracking-[0.2em] uppercase transition-colors hover:bg-secondary/70"
              >
                + Importar carro .glb
              </button>
            </div>
          )}

          {tab === "tracks" && (
            <div className="space-y-3">
              <ModelList
                items={props.tracks}
                selectedId={props.selectedTrackId}
                onSelect={props.onSelectTrack}
              />
              <button
                type="button"
                onClick={() => trackInput.current?.click()}
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-[0.65rem] font-bold tracking-[0.2em] uppercase transition-colors hover:bg-secondary/70"
              >
                + Importar mapa .glb
              </button>
            </div>
          )}

          {tab === "custom" && (
            <div className="max-h-[19rem] space-y-4 overflow-y-auto pr-1">
              <div>
                <p className="text-[0.6rem] tracking-[0.32em] text-muted-foreground uppercase">
                  Pintura
                </p>
                <div className="mt-2">
                  <Swatches
                    colors={PAINT_SWATCHES}
                    value={custom.paint}
                    onSelect={(paint) => props.onCustomize({ paint })}
                  />
                </div>
              </div>

              <div>
                <p className="text-[0.6rem] tracking-[0.32em] text-muted-foreground uppercase">
                  Acabamento
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(Object.keys(FINISH_LABELS) as Finish[]).map((finish) => (
                    <button
                      key={finish}
                      type="button"
                      onClick={() => props.onCustomize({ finish })}
                      className={`rounded-md border px-2 py-2 text-[0.6rem] font-bold tracking-[0.16em] uppercase transition-colors ${
                        custom.finish === finish
                          ? "border-primary/60 bg-primary/20 text-primary"
                          : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                      }`}
                    >
                      {FINISH_LABELS[finish]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[0.6rem] tracking-[0.32em] text-muted-foreground uppercase">
                  Neon inferior
                </p>
                <div className="mt-2">
                  <Swatches
                    colors={UNDERGLOW_SWATCHES}
                    value={custom.underglow}
                    onSelect={(underglow) => props.onCustomize({ underglow })}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[0.6rem] tracking-[0.32em] text-muted-foreground uppercase">
                    Setup de drift
                  </p>
                  <span className="font-display text-xs font-black text-accent tabular-nums">
                    {Math.round(custom.driftBias * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(custom.driftBias * 100)}
                  onChange={(event) =>
                    props.onCustomize({ driftBias: Number(event.target.value) / 100 })
                  }
                  className="mt-2 w-full accent-primary"
                  aria-label="Setup de drift"
                />
                <p className="mt-1 flex justify-between text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                  <span>Aderência</span>
                  <span>Traseira solta</span>
                </p>
              </div>

              <button
                type="button"
                onClick={props.onResetCustomization}
                className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-[0.6rem] font-bold tracking-[0.2em] uppercase transition-colors hover:bg-secondary/60"
              >
                Restaurar padrão
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={props.onStart}
          className="glow-green mt-4 flex w-full items-center justify-between rounded-lg bg-neon-green px-6 py-4 text-neon-green-foreground transition-transform hover:translate-x-1"
        >
          <span className="font-display text-lg font-black tracking-[0.24em] uppercase">
            Correr
          </span>
          <span aria-hidden="true" className="text-xl font-black">
            →
          </span>
        </button>
      </div>

      {/* Bottom hint */}
      <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-[0.6rem] tracking-[0.34em] text-muted-foreground uppercase">
        W/S · setas acelerar · A/D virar · Espaço drift · ESC menu · Arduino pinos 8–12
      </p>
    </div>
  );
}
