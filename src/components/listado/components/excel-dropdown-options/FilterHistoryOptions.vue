<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<excel-dropdown-option-item
		icon="icon-search"
		@click="show">
			Historial de busquedas
		</excel-dropdown-option-item>
	</div>
</template>
<script>
export default {
	components: {
		ExcelDropdownOptionItem: () => import('@/common-vue/components/horizontal-nav/ExcelDropdownOptionItem'),
	},
	methods: {
		show() {
			this.$store.dispatch('filter_history/getModels')
			this.$bvModal.show('filter-history')
		}
	}
}
</script>
