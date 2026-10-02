<!-- Screen-print registration marks for the corners of a .plate -->
{#each ['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'] as pos (pos)}
	<svg viewBox="0 0 20 20" class={['reg-mark', pos]} aria-hidden="true">
		<circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="1.2" />
		<path d="M10 0V20M0 10H20" stroke="currentColor" stroke-width="1.2" />
	</svg>
{/each}
