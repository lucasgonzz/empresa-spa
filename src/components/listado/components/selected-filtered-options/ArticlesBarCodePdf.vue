<template>

	<div>


		<dropdown-option-item
		icon="icon-barcode"
		@click="ticketsA4">
			Codigos de barra (A4)
		</dropdown-option-item>

		<dropdown-option-item
		icon="icon-tag"
		@click="abrir_modal_etiquetas">
			Etiquetas individuales
		</dropdown-option-item>



		<etiquetas-config-modal
		:articulos_seleccionados="articulos_para_etiquetas">
		</etiquetas-config-modal>

	</div>

</template>

<script>

import listado_articles_source from '@/mixins/listado/listado_articles_source'

export default {

	mixins: [listado_articles_source],

	components: {

		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
		EtiquetasConfigModal: () => import('@/components/listado/components/selected-filtered-options/EtiquetasConfigModal'),

	},

	data() {

		return {

			articulos_para_etiquetas: [],

		}

	},

	methods: {

		/**
		 * Abre PDF A4 de códigos de barra según el dropdown activo.
		 *
		 * @return {void}
		 */
		ticketsA4() {

			let ids = this.resolve_article_ids()
			if (!ids.length) {
				return
			}

			let link = process.env.VUE_APP_API_URL + '/article/bar-codes-pdf/' + ids.join('-')
			window.open(link)

		},

		/**
		 * Resuelve artículos según el dropdown activo y abre el modal de configuración.
		 *
		 * @return {void}
		 */
		abrir_modal_etiquetas() {

			let articles = this.resolve_articles()

			if (!articles || !articles.length) {

				this.$toast.warning('Seleccioná al menos un artículo')

				return

			}

			this.articulos_para_etiquetas = articles

			this.$bvModal.show('etiquetas-config-modal')

		},

	},

}

</script>
