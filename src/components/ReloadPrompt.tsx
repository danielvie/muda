import { useRegisterSW } from "virtual:pwa-register/react";

type UpdateActionsProps = {
  onUpdate: () => void;
  onClose: () => void;
};

function UpdateActions({ onUpdate, onClose }: UpdateActionsProps) {
  return (
    <div className="mt-1.75 flex gap-2">
      <button
        type="button"
        className="flex-1 min-h-10 rounded-sm border border-[#147a8f] px-3 py-0 font-black font-mono text-[10px] text-white cursor-pointer active:transform-[translateY(1px)] focus-visible:[outline:2px_solid_#147a8f] focus-visible:outline-offset-2 hover:border-[#126b7b] hover:bg-[#126b7b] focus-visible:border-[#126b7b] focus-visible:bg-[#126b7b] [transition:transform_0.15s_ease,background_0.15s_ease,border-color_0.15s_ease] bg-[#147a8f]"
        onClick={onUpdate}
      >
        Atualizar agora
      </button>
      <button
        type="button"
        className="flex-1 min-h-10 rounded-sm border border-[#cfe1e8] px-3 py-0 font-black font-mono text-[10px] text-[#49312a] cursor-pointer active:transform-[translateY(1px)] focus-visible:[outline:2px_solid_#147a8f] focus-visible:outline-offset-2 hover:border-[#147a8f] focus-visible:border-[#147a8f] [transition:transform_0.15s_ease,background_0.15s_ease,border-color_0.15s_ease] bg-[#f9d6c5]"
        onClick={onClose}
      >
        Depois
      </button>
    </div>
  );
}

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

  const close = () => setNeedRefresh(false);
  const update = () => void updateServiceWorker(true);

  if (!needRefresh) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-80 box-border h-full w-full cursor-default border-0 bg-[rgba(23,53,59,0.22)] p-0 backdrop-blur-[2px]"
        aria-label="Fechar aviso de atualização"
        onClick={close}
      />
      <div
        className="fixed left-1/2 top-1/2 z-90 box-border grid w-[min(390px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-2.25 rounded-[20px] border border-[#cfe1e8] bg-[#fffdfb] p-6 font-sans text-[#17353b] shadow-[0_24px_70px_rgba(23,53,59,0.28)] max-[560px]:w-[calc(100vw-24px)] max-[560px]:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reload-prompt-title"
      >
        <span className="font-mono text-[8px] font-black tracking-[0.14em] text-[#147a8f]">NOVA VERSÃO</span>
        <h2 className="m-0 text-[27px] font-black leading-none tracking-[-0.055em] text-[#126b7b]" id="reload-prompt-title">Atualize o muda</h2>
        <p className="m-0 text-[11px] leading-[1.4] text-[#5e777c]">A versão mais recente está pronta para continuar seus cenários financeiros.</p>
        <div className="mt-1.25 flex items-center justify-between gap-3 rounded-sm border border-[#cfe1e8] bg-[color-mix(in_srgb,#147a8f_7%,#fffdfb)] p-[10px_11px] font-mono text-[8px]"><span className="tracking-widest text-[#5e777c]">STATUS</span><strong className="text-[9px] text-[#22865f]">Pronto para instalar</strong></div>
        <UpdateActions onUpdate={update} onClose={close} />
      </div>
    </>
  );
}
