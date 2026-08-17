import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const DriftSimulator = lazy(() => import("@/components/game/DriftSimulator"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drift Simulator 3D — Corrida Neon com Arduino" },
      {
        name: "description",
        content:
          "Simulador de drift 3D no navegador: pistas e carros .glb personalizados, HUD com velocímetro e controle por teclado ou Arduino via Web Serial.",
      },
      { property: "og:title", content: "Drift Simulator 3D — Corrida Neon com Arduino" },
      {
        property: "og:description",
        content:
          "Pilote em pistas 3D com estilo neon, faça upload dos seus modelos .glb e controle o carro pelo teclado ou por um Arduino.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Splash() {
  return (
    <div className="grid h-screen w-full place-items-center bg-background">
      <p className="text-gradient-neon font-display text-2xl font-black tracking-[0.3em] uppercase">
        Drift Simulator 3D
      </p>
    </div>
  );
}

function Index() {
  return (
    <main>
      <h1 className="sr-only">Drift Simulator 3D</h1>
      <ClientOnly fallback={<Splash />}>
        <Suspense fallback={<Splash />}>
          <DriftSimulator />
        </Suspense>
      </ClientOnly>
    </main>
  );
}
