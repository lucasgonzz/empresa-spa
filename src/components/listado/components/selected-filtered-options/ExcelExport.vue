<template>

	<div>

		<b-dropdown-divider></b-dropdown-divider>



		<dropdown-section-title

		title="Documentos Excel"

		icon="icon-download"></dropdown-section-title>



		<dropdown-option-item

		icon="icon-download"

		@click="export_excel">

			Exportar Excel

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

		 * Encola exportación Excel según seleccionados o filtros del dropdown activo.

		 *

		 * @return {void}

		 */

		export_excel() {

			let link = '/article/excel/export'

			let query = ''



			if (this.use_filtered_source) {

				let active_filters = this.resolve_active_filters_for_export()

				if (!active_filters.length) {
					this.$toast.error('No hay filtros activos para exportar', { duration: 4000 })
					return
				}

				let json_data = JSON.stringify(active_filters)

				query = '?filters=' + encodeURIComponent(json_data)

			} else {

				let ids = this.resolve_article_ids()

				if (!ids.length) {

					this.$toast.error('No hay artículos para exportar', { duration: 4000 })

					return

				}

				query = '?articles_id=' + ids.join('-')

			}



			let export_url = link + query



			this.$api.get(export_url)

			.then(() => {

				this.$toast.success('La exportacion se esta procesando. Te avisaremos cuando el excel este listo.', {

					duration: 4000,

				})

			})

			.catch(() => {

				this.$toast.error('No se pudo iniciar la exportacion de excel', {

					duration: 4000,

				})

			})

		},

	}

}

</script>

