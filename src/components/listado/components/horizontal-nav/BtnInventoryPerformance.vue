<template>
	<b-button
	v-if="is_admin"
	v-b-tooltip.hover
	title="Rendimiento del inventario"
	aria-label="Rendimiento del inventario"
	class="toolbar-btn--icono"
	v-b-modal="'inventory-performance'"
	size="sm">
		<i class="bi bi-box-seam"></i>
	</b-button>
</template>