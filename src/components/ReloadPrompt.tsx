import { useRegisterSW } from "virtual:pwa-register/react";
import "../reload-prompt.css";

type UpdateActionsProps = {
  onUpdate: () => void;
  onClose: () => void;
};

function UpdateActions({ onUpdate, onClose }: UpdateActionsProps) {
  return (
    <div className="reload-prompt-actions">
      <button type="button" className="reload-prompt-update" onClick={onUpdate}>Atualizar agora</button>
      <button type="button" className="reload-prompt-later" onClick={onClose}>Depois</button>
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
      <button type="button" className="reload-prompt-backdrop" aria-label="Fechar aviso de atualização" onClick={close} />
      <div className="reload-prompt" role="dialog" aria-modal="true" aria-labelledby="reload-prompt-title">
        <span className="reload-prompt-kicker">NOVA VERSÃO</span>
        <h2 id="reload-prompt-title">Atualize o muda</h2>
        <p>A versão mais recente está pronta para continuar seus cenários financeiros.</p>
        <div className="reload-prompt-detail"><span>STATUS</span><strong>Pronto para instalar</strong></div>
        <UpdateActions onUpdate={update} onClose={close} />
      </div>
    </>
  );
}
