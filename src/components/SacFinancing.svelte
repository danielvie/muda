<script lang="ts">
    import { commitExprString, formatMoneyOnBlur } from "../mathInput";
    import { fieldMemory } from "../memory.svelte";
    import { buildSacProjection } from "../sacProjection";
    import YearBlockList from "./YearBlockList.svelte";

    const projection = $derived.by(() => buildSacProjection(fieldMemory));
</script>

<section
    class="bg-surface border border-border rounded-lg p-4"
    aria-labelledby="sac-title"
>
    <h2
        id="sac-title"
        class="m-0 text-sm font-semibold text-text-heading tracking-tight"
    >
        Financiamento SAC (resumo)
    </h2>

    <div class="mt-3 grid grid-cols-2 gap-3 min-w-0 max-md:grid-cols-1">
        <label class="field">
            <span class="field-label">Valor do imóvel (R$)</span>
            <input
                class="input-field"
                type="text"
                bind:value={fieldMemory.valorImovel}
                onblur={() =>
                    formatMoneyOnBlur(
                        fieldMemory.valorImovel,
                        (v) => (fieldMemory.valorImovel = v),
                    )}
            />
        </label>

        <label class="field">
            <span class="field-label">Entrada (R$)</span>
            <input
                class="input-field"
                type="text"
                bind:value={fieldMemory.entrada}
                onblur={() =>
                    formatMoneyOnBlur(
                        fieldMemory.entrada,
                        (v) => (fieldMemory.entrada = v),
                    )}
            />
        </label>

        <label class="field">
            <span class="field-label">Taxa anual (%)</span>
            <input
                class="input-field"
                type="number"
                step="0.1"
                bind:value={fieldMemory.taxaFinAnual}
            />
        </label>

        <label class="field">
            <span class="field-label">Prazo (meses)</span>
            <input
                class="input-field"
                type="text"
                bind:value={fieldMemory.prazoMeses}
                onblur={() =>
                    commitExprString(
                        fieldMemory.prazoMeses,
                        (v) => (fieldMemory.prazoMeses = v),
                        { int: true, min: 1 },
                    )}
                onkeydown={(e) =>
                    e.key === "Enter" &&
                    (e.currentTarget as HTMLInputElement).blur()}
            />
        </label>
    </div>

    <div class="mt-3 p-3 rounded-md bg-surface-alt border border-border">
        {#if projection}
            <div class="grid grid-cols-2 gap-2.5 min-w-0 max-md:grid-cols-1">
                <div class="metric">
                    <div class="metric-label">Financiado (PV)</div>
                    <div class="metric-value">{projection.metrics.pv}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Amortização</div>
                    <div class="metric-value">
                        {projection.metrics.amortizacao}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Prestação mês 1</div>
                    <div class="metric-value text-warm">
                        {projection.metrics.prestacaoMes1}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Última prestação</div>
                    <div class="metric-value text-positive">
                        {projection.metrics.prestacaoUltima}
                    </div>
                </div>
            </div>

            <YearBlockList blocks={projection.yearBlocks} />
        {:else}
            <div class="text-xs text-text-muted">
                Preencha os campos com números.
            </div>
        {/if}
    </div>
</section>

<style>
    .field {
        display: grid;
        gap: 6px;
    }

    .field-label {
        font-size: 12px;
        color: var(--color-text-muted);
    }

    .input-field {
        width: 100%;
        padding: 10px 12px;
        border-radius: var(--radius-md);
        background: var(--color-surface-alt);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        outline: none;
        font-family: var(--font-mono);
        font-size: 16px;
        transition: border-color 150ms ease;
    }

    .input-field:hover {
        border-color: var(--color-border-focus);
    }

    .input-field:focus {
        border-color: var(--color-accent);
    }

    .metric {
        padding: 8px 10px;
        border-radius: var(--radius-md);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
    }

    .metric-label {
        margin-bottom: 4px;
        font-size: 11px;
        color: var(--color-text-muted);
    }

    .metric-value {
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-heading);
    }
</style>
