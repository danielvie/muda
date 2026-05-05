<script lang="ts">
    import AgentationMount from "./components/AgentationMount.svelte";
    import InvestmentProjection from "./components/InvestmentProjection.svelte";
    import SacFinancing from "./components/SacFinancing.svelte";
    import ReloadPrompt from "./components/ReloadPrompt.svelte";
    import { loadFieldMemory, saveFieldMemory } from "./memory.svelte";

    loadFieldMemory();

    $effect(() => {
        saveFieldMemory();
    });
</script>

<div class="min-h-screen flex flex-col bg-bg text-text font-sans">
    <header
        class="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-border"
    >
        <div
            class="w-full max-w-245 mx-auto px-4 py-3 flex items-center justify-between"
        >
            <h1
                class="m-0 text-sm font-semibold text-text-heading tracking-tight"
            >
                <span class="text-accent text-4xl">muda</span><span
                    class="text-text-muted font-normal ml-2 text-xs"
                    >investimento + SAC</span
                >
            </h1>
        </div>
    </header>

    <div class="w-full max-w-245 mx-auto px-4">
        <main class="py-5 grid gap-4 min-w-0">
            <InvestmentProjection />
            <SacFinancing />
        </main>
    </div>

    <footer
        class="mt-auto py-4 px-4 border-t border-border text-text-muted text-[11px] text-center"
    >
        <div class="w-full max-w-245 mx-auto">
            Próximo passo: usar a entrada como saldo projetado do investimento
            para simular "esperar N meses".
        </div>
    </footer>

    <AgentationMount />
    <ReloadPrompt />
</div>
