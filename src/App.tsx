import React from "react";
import DashboardLayout from "./components/DashboardLayout.tsx";
import ReloadPrompt from "./components/ReloadPrompt.tsx";

import { Agentation } from "agentation";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="brand-header">
        <div className="brand-lockup">
          <img className="brand-logo" src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
          <div>
            <h1>muda</h1>
            <span className="brand-subtitle">investimento + SAC</span>
          </div>
        </div>
      </header>

      <div className="w-full mx-auto flex-1">
        <main className="py-3 px-4 max-sm:px-1 min-w-0">
          <DashboardLayout />
        </main>
      </div>

      <ReloadPrompt />

      {process.env.NODE_ENV === "development" && <Agentation />}
    </div>
  );
}
