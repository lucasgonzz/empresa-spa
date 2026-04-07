<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<b-dropdown-item
		v-if="!owner_uses_listas_de_precio"
		@click="tickets(null)">
			<i class="icon-tag"></i>
			Etiquetas
		</b-dropdown-item>
		<b-dropdown-item
		v-else
		v-for="price_type in price_types"
		:key="price_type.id"
		@click="tickets(price_type.id)">
			<i class="icon-tag"></i>
			{{ price_type.name }}
		</b-dropdown-item>
	</div>
</template>
<script>
import alert_filtrados from '@/mixins/listado/alert_filtrados'
import generals from '@/mixins/generals'
export default {
	mixins: [alert_filtrados, generals],
	computed: {
		/*
			* Indica si el dueño (owner) trabaja con listas de precios.
			* Se usa para definir si el dropdown debe mostrar una opción única o una opción por lista.
		*/
		owner_uses_listas_de_precio() {
			return this.ownerUsesListasDePrecio()
		},
		/*
			* Listas de precios disponibles (price types) cargadas en store.
			* Se iteran para mostrar una opción por cada lista cuando el dueño usa listas.
		*/
		price_types() {
			return this.$store.state.price_type ? this.$store.state.price_type.models : []
		},
		selected() {
			return this.$store.state.article.selected 
		},
		filtered() {
			return this.$store.state.article.filtered 
		},
	},
	methods: {
		/*
			* Abre el PDF de etiquetas para los artículos seleccionados/filtrados.
			* Si se recibe `price_type_id`, se envía como query param para que el backend tome el final_price de esa lista.
			*
			* @param {number|null} price_type_id
		*/
		tickets(price_type_id) {
			// IDs de artículos a imprimir en etiquetas.
			let ids = []
			// Colección de artículos a procesar (seleccionados o filtrados).
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
			// Link al endpoint del PDF de tickets, con `price_type_id` opcional.
			let link = process.env.VUE_APP_API_URL+'/article/tickets-pdf/'+ids.join('-')
			if (price_type_id) {
				link += '?price_type_id='+price_type_id
			}
			window.open(link)
		}
	}
}
</script>