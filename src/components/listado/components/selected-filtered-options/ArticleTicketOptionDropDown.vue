<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<dropdown-section-title
		title="Documentos PDF"
		icon="icon-pdf"></dropdown-section-title>

		<!--
			Con Diseños de etiquetas (mision disenos-etiquetas-gondola, 29/9/2026): una opcion por diseño,
			que imprime con ese diseño, y al final el acceso al ABM para armarlos.
		-->
		<template v-if="disenos.length">
			<dropdown-option-item
			v-for="diseno in disenos"
			:key="'diseno-' + diseno.id"
			icon="icon-tag"
			@click="tickets_con_diseno(diseno.id)">
				{{ diseno.name }}
			</dropdown-option-item>

			<!--
				Decision de Lucas: nadie pierde la opcion que hoy aparece sola por cada lista. Una lista sin
				ningun diseño propio (existia antes de prender las listas, o se acaba de crear y su diseño
				todavia no llego) sigue imprimiendo la etiqueta de siempre con su precio.
			-->
			<dropdown-option-item
			v-for="price_type in listas_sin_diseno"
			:key="'lista-' + price_type.id"
			icon="icon-tag"
			@click="tickets(price_type.id)">
				{{ price_type.name }}
			</dropdown-option-item>

			<!-- El cliente con formato especial (golonorte) conserva su etiqueta de siempre -->
			<dropdown-option-item
			v-if="tiene_formato_especial"
			icon="icon-print"
			@click="tickets(null)">
				Etiquetas gondolas (formato especial)
			</dropdown-option-item>

			<dropdown-option-item
			v-if="puede_disenar"
			icon="icon-edit"
			@click="ir_a_disenar">
				Diseñar etiquetas
			</dropdown-option-item>
		</template>

		<!--
			Sin diseños (una API que todavia no los tiene, o el store vacio): exactamente lo de antes.
		-->
		<template v-else>
			<dropdown-option-item
			v-if="!owner_uses_listas_de_precio"
			icon="icon-print"
			@click="tickets(null)">
				Etiquetas gondolas
			</dropdown-option-item>

			<dropdown-option-item
			v-else
			v-for="price_type in price_types"
			:key="price_type.id"
			icon="icon-tag"
			@click="tickets(price_type.id)">
				{{ price_type.name }}
			</dropdown-option-item>
		</template>
	</div>
</template>
<script>
import listado_articles_source from '@/mixins/listado/listado_articles_source'
import generals from '@/mixins/generals'
import { env } from '@/runtime_config'

export default {
	mixins: [listado_articles_source, generals],
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	computed: {
		/**
		 * Indica si el dueño trabaja con listas de precios.
		 *
		 * @return {boolean}
		 */
		owner_uses_listas_de_precio() {
			return this.ownerUsesListasDePrecio()
		},
		/**
		 * Listas de precios disponibles en store.
		 *
		 * @return {Array}
		 */
		price_types() {
			return this.$store.state.price_type ? this.$store.state.price_type.models : []
		},
		/**
		 * Diseños de etiquetas del negocio, en el orden del ABM (position y despues id). Vacio si la
		 * API todavia no los tiene: en ese caso el menu queda como antes.
		 *
		 * @return {Array}
		 */
		disenos() {
			let modulo = this.$store.state.article_ticket_design
			if (!modulo || !Array.isArray(modulo.models)) {
				return []
			}
			return modulo.models.slice().sort(function (a, b) {
				let posicion = (Number(a.position) || 0) - (Number(b.position) || 0)
				return posicion !== 0 ? posicion : Number(a.id) - Number(b.id)
			})
		},
		/**
		 * Con listas de precios: las listas que no tienen ningun diseño generado para ellas
		 * (article_ticket_design.price_type_id). Cada una conserva su opcion de siempre.
		 *
		 * @return {Array}
		 */
		listas_sin_diseno() {
			if (!this.owner_uses_listas_de_precio) {
				return []
			}
			let disenos = this.disenos
			return this.price_types.filter(function (price_type) {
				return !disenos.some(function (diseno) {
					return diseno.price_type_id && Number(diseno.price_type_id) === Number(price_type.id)
				})
			})
		},
		/**
		 * Si el negocio tiene una etiqueta con formato especial (users.article_ticket_print_function,
		 * p. ej. golonorte): esa etiqueta sale solo por el camino de siempre, sin diseño.
		 *
		 * @return {boolean}
		 */
		tiene_formato_especial() {
			return !!(this.owner && this.owner.article_ticket_print_function)
		},
		/**
		 * Si el usuario puede entrar al ABM para armar los diseños.
		 *
		 * @return {boolean}
		 */
		puede_disenar() {
			return this.can('abm')
		},
	},
	methods: {
		/**
		 * Abre el PDF de etiquetas para seleccionados o filtrados según el dropdown activo.
		 *
		 * @param {number|null} price_type_id
		 * @return {void}
		 */
		tickets(price_type_id) {
			let ids = this.resolve_article_ids()
			if (!ids.length) {
				return
			}

			let link = env('VUE_APP_API_URL') + '/article/tickets-pdf/' + ids.join('-')
			if (price_type_id) {
				link += '?price_type_id=' + price_type_id
			}
			window.open(link)
		},
		/**
		 * Abre el PDF de etiquetas con un Diseño de etiqueta. Una API que todavia no conoce el
		 * parametro lo ignora y saca la etiqueta de siempre (contrato de la mision, §3.5).
		 *
		 * @param {number} article_ticket_design_id
		 * @return {void}
		 */
		tickets_con_diseno(article_ticket_design_id) {
			let ids = this.resolve_article_ids()
			if (!ids.length) {
				return
			}

			window.open(env('VUE_APP_API_URL') + '/article/tickets-pdf/' + ids.join('-') + '?article_ticket_design_id=' + article_ticket_design_id)
		},
		/**
		 * Lleva a ABM -> Artículos -> Diseños de etiquetas.
		 *
		 * @return {void}
		 */
		ir_a_disenar() {
			this.$router.push({
				name: 'abm',
				params: {
					view: 'articulos',
					sub_view: this.routeString(this.plural('article_ticket_design')),
				},
			})
		},
	}
}
</script>
