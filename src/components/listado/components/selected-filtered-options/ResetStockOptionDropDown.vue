<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="Stock"
		icon="icon-refresh"></dropdown-section-title>

		<dropdown-option-item
		icon="icon-cancel"
		variant="danger"
		@click="resetStock">
			Resetear Stock a 0
		</dropdown-option-item>
	</div>
</template>
<script>
export default {
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	methods: {
		resetStock() {
			this.$bvModal.show('confirm-reset-stock')
		}
	}
}
</script>
