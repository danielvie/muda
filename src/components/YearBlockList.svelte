<script lang="ts">
    import { brl } from "../format";
    import type { YearBlock } from "../sacSchedule";

    let { blocks }: { blocks: YearBlock[] } = $props();
</script>

<details class="mt-3">
    <summary
        class="cursor-pointer select-none py-2 px-3 rounded-md bg-surface border border-border text-xs font-semibold text-accent transition-colors hover:border-border-focus hover:bg-accent-soft"
    >
        Simulação de prestações por ano (blocos de 12 meses)
    </summary>

    <div class="mt-3 grid gap-3">
        {#each blocks as block (block.ano)}
            <details class="p-3 rounded-md bg-surface-alt border border-border">
                <summary
                    class="cursor-pointer flex items-center justify-between gap-3 py-2 px-2 rounded-sm transition-colors hover:bg-accent-soft"
                >
                    <div>
                        <div class="text-xs font-semibold text-text-heading">
                            Ano {block.ano}
                        </div>
                        <div class="text-[11px] text-text-muted">
                            Meses {block.mesInicio}-{block.mesFim}
                        </div>
                    </div>
                    <div
                        class="text-xs font-semibold whitespace-nowrap text-positive font-mono"
                    >
                        {brl(block.primeiraPrestacao)} -> {brl(
                            block.ultimaPrestacao,
                        )}
                    </div>
                </summary>

                <div class="mt-3 grid grid-cols-4 gap-2 min-w-0 max-md:grid-cols-2">
                    {#each block.meses as m (m.mes)}
                        <div
                            class="p-2 rounded-sm bg-surface border border-border transition-colors hover:border-border-focus"
                        >
                            <div class="text-[10px] text-text-muted mb-1">
                                M{m.mes}
                            </div>
                            <div
                                class="text-xs font-semibold text-text-heading font-mono"
                            >
                                {brl(m.prestacao)}
                            </div>
                        </div>
                    {/each}
                </div>
            </details>
        {/each}
    </div>
</details>

<style>
    details > summary {
        list-style: none;
    }

    details > summary::-webkit-details-marker {
        display: none;
    }
</style>
