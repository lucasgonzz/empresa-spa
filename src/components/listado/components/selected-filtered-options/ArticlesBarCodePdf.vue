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

import alert_filtrados from '@/mixins/listado/alert_filtrados'

export default {

	components: {

		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
		EtiquetasConfigModal: () => import('@/components/listado/components/selected-filtered-options/EtiquetasConfigModal'),

	},

	mixins: [alert_filtrados],

	data() {

		return {

			articulos_para_etiquetas: [],

		}

	},

	computed: {

		selected() {

			return this.$store.state.article.selected 

		},

		filtered() {

			return this.$store.state.article.filtered 

		},

		total_filter_results() {

			return this.$store.state.article.total_filter_results 

		},

	},

	methods: {

		ticketsA4() {

			let ids = []

			let articles

			if (this.selected.length) {

				articles = this.selected

			} else if (this.filtered.length) {

				this.alert_filtrados()

				articles = this.filtered

			}

			articles.forEach(article => {

				ids.push(article.id)

			})

			let link = process.env.VUE_APP_API_URL+'/article/bar-codes-pdf/'+ids.join('-') 

			window.open(link)

		},

		/**
		 * Resuelve artículos seleccionados o filtrados y abre el modal de configuración.
		 */
		abrir_modal_etiquetas() {

			let articles = []

			if (this.selected.length) {

				articles = this.selected

			} else if (this.filtered.length) {

				this.alert_filtrados()

				articles = this.filtered

			}

			if (!articles.length) {

				this.$toast.warning('Seleccioná al menos un artículo')

				return

			}

			this.articulos_para_etiquetas = articles

			this.$bvModal.show('etiquetas-config-modal')

		},

	},

}

</script>
