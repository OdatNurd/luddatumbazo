<script>
  // One node of the location tree. The component renders itself recursively so
  // the nested DOM shape is the one Web Awesome's tree expects.
  export let node;
  export let childrenById;
  export let selectedId = null;
  export let expandedIds;

  $: children = childrenById.get(node.id) ?? [];
  $: count = Number(node.totalGameCount) || 0;
</script>


<wa-tree-item data-location-id={node.id}
              expanded={expandedIds.has(node.id)}
              selected={selectedId === node.id}>
  <span class="node-label">
    <span class="node-name">{node.name}</span>
    {#if count > 0}
      <span class="node-count">({count})</span>
    {/if}
  </span>

  {#each children as child (child.id)}
    <svelte:self node={child} {childrenById} {selectedId} {expandedIds} />
  {/each}
</wa-tree-item>


<style>
  .node-label {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  .node-name {
    overflow-wrap: anywhere;
  }

  .node-count {
    color: var(--wa-color-text-quiet);
    font-size: var(--wa-font-size-s);
    font-weight: var(--wa-font-weight-normal);
    white-space: nowrap;
  }
</style>
