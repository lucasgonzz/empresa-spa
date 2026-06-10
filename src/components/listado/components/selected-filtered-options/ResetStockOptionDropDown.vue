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
import listado_articles_source from '@/mixins/listado/listado_articles_source'

export default {
	mixins: [listado_articles_source],
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	methods: {
		/**
		 * Guarda el origen del dropdown y abre confirmación de reseteo de stock.
		 *
		 * @return {void}
		 */
		resetStock() {
			this.remember_options_from_filter()
			this.$bvModal.show('confirm-reset-stock')
		}
	}
}
</script>
