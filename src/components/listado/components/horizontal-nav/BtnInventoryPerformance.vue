<template>
	<b-button
	v-if="is_admin"
	class="m-l-15"
	v-b-modal="'inventory-performance'"
	size="sm"
	variant="success">
		<i class="bi bi-box-seam m-r-5"></i>
		Inventario
	</b-button>
</template>