import React from "react";
import DashboardLayout from "./components/DashboardLayout.tsx";
import ReloadPrompt from "./components/ReloadPrompt.tsx";

import { Agentation } from "agentation";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text font-sans">
      <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="w-full max-w-245 mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="m-0 text-sm font-semibold text-text-heading tracking-tight">
            <span className="text-accent text-4xl">muda</span>
            <span className="text-text-muted font-normal ml-2 text-xs">
              investimento + SAC
            </span>
          </h1>
        </div>
      </header>

      <div className="w-full max-w-245 mx-auto px-4">
        <main className="py-5 min-w-0">
          <DashboardLayout />
        </main>
      </div>

      <footer className="mt-auto py-4 px-4 border-t border-border text-text-muted text-[11px] text-center">
        <div className="w-full max-w-245 mx-auto">
          Próximo passo: usar a entrada como saldo projetado do investimento para
          simular "esperar N meses".
        </div>
      </footer>

      <ReloadPrompt />

      {process.env.NODE_ENV === "development" && <Agentation />}

    </div>

  );
}
