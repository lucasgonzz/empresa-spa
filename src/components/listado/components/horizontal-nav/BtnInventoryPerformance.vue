<template>
	<b-button
	v-if="is_admin"
	class="m-r-10"
	v-b-modal="'inventory-performance'"
	variant="warning">
		<i class="icon-info"></i>
	</b-button>
</template>