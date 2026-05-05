<script lang="ts">
    import { onMount, type Component } from "svelte";

    const enabled = typeof window !== "undefined" && import.meta.env.DEV;
    const workspaceRoot = enabled ? __AGENTATION_WORKSPACE_ROOT__ : null;
    let Agentation = $state<Component | null>(null);

    onMount(() => {
        if (!enabled) return;

        import("sv-agentation").then((module) => {
            Agentation = module.Agentation;
        });
    });
</script>

{#if enabled && Agentation}
    <Agentation
        workspaceRoot={workspaceRoot}
        openSourceOnClick
        toolbarPosition="bottom-right"
        outputMode="standard"
        includeComponentContext
    />
{/if}
