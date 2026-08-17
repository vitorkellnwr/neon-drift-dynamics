import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainMenu from "./MainMenu";
import GameHud from "./GameHud";
import { useArduino } from "@/lib/arduino";
import {
  BUILT_IN_CARS,
  BUILT_IN_TRACKS,
  DEFAULT_CAR,
  DEFAULT_TRACK,
  defaultCustomizationFor,
  filesToModels,
  loadBestScore,
  loadCars,
  loadCustomizations,
  loadTracks,
  saveCars,
  saveCustomizations,
  saveTracks,
  tuneForCar,
  type CarCustomization,
  type Model3D,
  type RaceTelemetry,
} from "@/lib/garage";

const CarShowroom = lazy(() => import("./CarShowroom"));
const RaceScene = lazy(() => import("./RaceScene"));

function Loading({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p className="animate-pulse text-sm tracking-[0.3em] text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}

export default function DriftSimulator() {
  const [cars, setCars] = useState<Model3D[]>(BUILT_IN_CARS);
  const [tracks, setTracks] = useState<Model3D[]>(BUILT_IN_TRACKS);
  const [selectedCarId, setSelectedCarId] = useState(DEFAULT_CAR.id);
  const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_TRACK.id);
  const [customizations, setCustomizations] = useState<Record<string, CarCustomization>>({});
  const [racing, setRacing] = useState(false);
  const [cameraLabel, setCameraLabel] = useState("Perseguição");
  const [telemetry, setTelemetry] = useState<RaceTelemetry>({
    speed: 0,
    score: 0,
    bestScore: 0,
    combo: 1,
    driftAngle: 0,
    isDrifting: false,
  });
  const shellRef = useRef<HTMLDivElement>(null);
  const arduino = useArduino();

  useEffect(() => {
    setCars([...BUILT_IN_CARS, ...loadCars()]);
    setTracks([...BUILT_IN_TRACKS, ...loadTracks()]);
    setCustomizations(loadCustomizations());
    setTelemetry((current) => ({ ...current, bestScore: loadBestScore() }));
  }, []);

  useEffect(() => {
    if (!racing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") setRacing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [racing]);

  const selectedCar = useMemo(
    () => cars.find((car) => car.id === selectedCarId) ?? cars[0] ?? DEFAULT_CAR,
    [cars, selectedCarId],
  );
  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? tracks[0] ?? DEFAULT_TRACK,
    [tracks, selectedTrackId],
  );

  const customization = useMemo(
    () => customizations[selectedCar.id] ?? defaultCustomizationFor(selectedCar),
    [customizations, selectedCar],
  );
  const tune = useMemo(() => tuneForCar(selectedCar, customization), [selectedCar, customization]);

  const handleCustomize = useCallback(
    (patch: Partial<CarCustomization>) => {
      setCustomizations((current) => {
        const base = current[selectedCar.id] ?? defaultCustomizationFor(selectedCar);
        const next = { ...current, [selectedCar.id]: { ...base, ...patch } };
        saveCustomizations(next);
        return next;
      });
    },
    [selectedCar],
  );

  const handleResetCustomization = useCallback(() => {
    setCustomizations((current) => {
      const next = { ...current, [selectedCar.id]: defaultCustomizationFor(selectedCar) };
      saveCustomizations(next);
      return next;
    });
  }, [selectedCar]);

  const handleUploadCars = useCallback(async (files: File[]) => {
    const models = await filesToModels(files);
    if (!models.length) return;
    setCars((current) => {
      const next = [...current, ...models];
      saveCars(next.filter((model) => !model.builtIn));
      return next;
    });
    setSelectedCarId(models[0]!.id);
  }, []);

  const handleUploadTracks = useCallback(async (files: File[]) => {
    const models = await filesToModels(files);
    if (!models.length) return;
    setTracks((current) => {
      const next = [...current, ...models];
      saveTracks(next.filter((model) => !model.builtIn));
      return next;
    });
    setSelectedTrackId(models[0]!.id);
  }, []);

  const handleTelemetry = useCallback((next: RaceTelemetry) => setTelemetry(next), []);

  const toggleFullscreen = useCallback(() => {
    const element = shellRef.current;
    if (!element) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void element.requestFullscreen?.();
  }, []);

  return (
    <div ref={shellRef} className="relative h-screen w-full overflow-hidden bg-background">
      <div className="absolute inset-0">
        <Suspense fallback={<Loading label="Carregando cena 3D…" />}>
          {racing ? (
            <RaceScene
              car={selectedCar}
              track={selectedTrack}
              customization={customization}
              tune={tune}
              arduinoRef={arduino.inputRef}
              onTelemetry={handleTelemetry}
              onCameraChange={setCameraLabel}
            />
          ) : (
            <div className="absolute inset-0">
              <CarShowroom url={selectedCar.url} offsetX={1.05} customization={customization} />
            </div>
          )}
        </Suspense>
      </div>

      {racing ? (
        <GameHud
          telemetry={telemetry}
          onOpenMenu={() => setRacing(false)}
          arduinoConnected={arduino.status === "connected"}
          cameraLabel={cameraLabel}
        />

      ) : (
        <MainMenu
          cars={cars}
          tracks={tracks}
          selectedCarId={selectedCar.id}
          selectedTrackId={selectedTrack.id}
          onSelectCar={setSelectedCarId}
          onSelectTrack={setSelectedTrackId}
          onUploadCars={handleUploadCars}
          onUploadTrack={handleUploadTracks}
          onFullscreen={toggleFullscreen}
          customization={customization}
          onCustomize={handleCustomize}
          onResetCustomization={handleResetCustomization}
          bestScore={telemetry.bestScore}
          onStart={() => {
            setTelemetry({
              speed: 0,
              score: 0,
              bestScore: loadBestScore(),
              combo: 1,
              driftAngle: 0,
              isDrifting: false,
            });
            setRacing(true);
          }}
          arduinoStatus={arduino.status}
          arduinoMessage={arduino.message}
          onConnectArduino={arduino.connect}
          onDisconnectArduino={arduino.disconnect}
        />
      )}
    </div>
  );
}
