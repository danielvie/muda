import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log("SW Registered: ", r);
    },
    onRegisterError(error: any) {
      console.log("SW registration error", error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-surface-alt border border-border rounded-lg shadow-xl flex flex-col gap-3 min-w-[250px]">
      <span className="text-sm font-semibold text-text-heading">Nova versão disponível!</span>
      <div className="flex gap-2">
        <button
          className="flex-1 px-3 py-2 bg-accent hover:bg-accent/80 transition-colors text-bg rounded text-xs font-semibold"
          onClick={() => updateServiceWorker(true)}
        >
          Atualizar
        </button>
        <button
          className="flex-1 px-3 py-2 bg-surface hover:bg-surface-alt transition-colors text-text rounded text-xs font-semibold border border-border"
          onClick={close}
        >
          Depois
        </button>
      </div>
    </div>
  );
}
