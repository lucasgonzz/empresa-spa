<template>
	<div>
        <b-dropdown-divider></b-dropdown-divider>
		
		<b-dropdown-item
		@click="pdf">
			<i class="icon-pdf"></i>
			PDF
		</b-dropdown-item>
	</div>
</template>
<script>
import selected_filtered_source from '@/common-vue/mixins/selected_filtered_source'

export default {
	mixins: [selected_filtered_source],
	computed: {
		resolved_model_name() {
			return 'client'
		},
	},
	methods: {
		/**
		 * Abre PDF de clientes según el dropdown activo (seleccionados o filtrados).
		 *
		 * @return {void}
		 */
		pdf() {
			let link = process.env.VUE_APP_API_URL + '/client/pdf'

			if (this.use_filtered_source) {
				let active_filters = this.resolve_active_filters_for_export()
				if (!active_filters.length) {
					this.$toast.error('No hay filtros activos para exportar', { duration: 4000 })
					return
				}
				link += '?filters=' + encodeURIComponent(JSON.stringify(active_filters))
			} else {
				let ids = this.resolve_model_ids()
				if (!ids.length) {
					this.$toast.error('No hay clientes seleccionados', { duration: 4000 })
					return
				}
				link += '?clients_id=' + ids.join('-')
			}

			window.open(link)
		}
	}
}
</script>
