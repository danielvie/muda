<script lang="ts">
    import { useRegisterSW } from "virtual:pwa-register/svelte";

    const { needRefresh, updateServiceWorker } = useRegisterSW({
        onRegistered(r) {
            console.log("SW Registered: ", r);
        },
        onRegisterError(error) {
            console.log("SW registration error", error);
        },
    });

    function close() {
        needRefresh.set(false);
    }
</script>

{#if $needRefresh}
    <div
        class="fixed bottom-4 right-4 z-50 p-4 bg-surface-alt border border-border rounded-lg shadow-xl flex flex-col gap-3 min-w-[250px]"
    >
        <span class="text-sm font-semibold text-text-heading"
            >Nova versão disponível!</span
        >
        <div class="flex gap-2">
            <button
                class="flex-1 px-3 py-2 bg-accent hover:bg-accent/80 transition-colors text-bg rounded text-xs font-semibold"
                onclick={() => updateServiceWorker(true)}
            >
                Atualizar
            </button>
            <button
                class="flex-1 px-3 py-2 bg-surface hover:bg-surface-alt transition-colors text-text rounded text-xs font-semibold border border-border"
                onclick={close}
            >
                Depois
            </button>
        </div>
    </div>
{/if}
