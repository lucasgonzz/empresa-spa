<template>
	<b-button
	v-if="is_admin"
	v-b-tooltip.hover
	title="Rendimiento del inventario"
	aria-label="Rendimiento del inventario"
	class="m-l-15"
	v-b-modal="'inventory-performance'"
	size="sm"
	variant="success">
		<i class="bi bi-box-seam"></i>
	</b-button>
</template>