<template>
	<!--
		Misión cheques-solapa-endosados (2/10/2026): la raíz dejó de ser un `b-col` que
		REEMPLAZABA a las solapas. Ahora es un bloque que NavComponent dibuja DEBAJO de las dos
		filas de solapas mientras haya una búsqueda de columnas puesta, así que el usuario sigue
		viendo (y puede cambiar) la solapa sobre la que está filtrando.
	-->
	<div
	class="nav-filtrados j-start align-center"
	data-testid="cheques-filtrados">

		<b-button
		data-testid="cheques-limpiar-filtros"
		@click="limpiar_filtro">
			Limpiar filtros
		</b-button>

		<b-button
		variant="outline-success"
		@click="export_excel">
			<i class="icon-download"></i>
			Excel
		</b-button>

		<h4
		class="title">
			Total: {{ total }}
		</h4>

		<h4
		class="title"
		data-testid="cheques-cantidad-filtrados">
			| Filtrados: {{ cantidad_filtrados }}
		</h4>
	</div>
</template>
<script>
import { env } from '@/runtime_config'
import { cheques_de_la_solapa, acotar_a_la_solapa } from '@/components/cheques/solapas'
export default {
	computed: {
		/**
		 * Suma de los montos de los cheques que está mostrando la tabla (la página actual del
		 * resultado filtrado).
		 *
		 * @returns {String} Monto formateado como precio.
		 */
		total() {
			let total = 0
			this.filtered.forEach(cheque => {
				total += Number(cheque.amount)
			})
			return this.price(total)
		},
		/**
		 * El resultado filtrado, acotado a la solapa vigente: son las mismas filas que dibuja la
		 * tabla (list/Index.vue). Con la API nueva coincide con `state.cheque.filtered`; con una API
		 * vieja, que ignora el filtro de ids y devuelve cheques de todas las solapas, evita que el
		 * Total y el Excel incluyan cheques que la tabla no muestra.
		 *
		 * @returns {Array<Object>}
		 */
		filtered() {
			/** Cheques de la solapa que marca la ruta. */
			let cheques_de_esta_solapa = cheques_de_la_solapa(this.$store.state.cheque.models, this.sub_view, this.sub_sub_view)
			return acotar_a_la_solapa(this.$store.state.cheque.filtered, cheques_de_esta_solapa)
		},
		/**
		 * Cantidad de cheques que cumplen la búsqueda en TODA la solapa vigente, sin importar
		 * en qué página esté parado el usuario. Es `total_filter_results` (lo que informa la
		 * API) y no el largo de `filtered`, que es solo la página que se ve: con más de una
		 * página el "Filtrados" mostraba 50 aunque hubiera 120.
		 *
		 * @returns {Number}
		 */
		cantidad_filtrados() {
			return this.$store.state.cheque.total_filter_results
		},
	},
	methods: {
		/**
		 * Abre en una pestaña nueva la ruta web que genera y descarga el Excel de forma síncrona.
		 * Envía los IDs de las filas visibles en la tabla (el resultado filtrado, acotado a la solapa).
		 */
		export_excel() {
			let ids = []
			this.filtered.forEach(function (cheque) {
				ids.push(cheque.id)
			})

			if (!ids.length) {
				this.$toast.error('No hay cheques para exportar')
				return
			}

			let link = env('VUE_APP_API_URL') + '/cheque/excel/export?cheque_ids=' + ids.join('-')
			window.open(link)
		},
		/**
		 * "Limpiar filtros": vuelve a la lista de la solapa tal cual viene de GET cheque.
		 *
		 * Antes solo vaciaba los resultados y dejaba los criterios y la flecha de orden en
		 * `state.filters`, así que el próximo filtro u orden reenviaba los viejos. La acción del
		 * store limpia los tres (criterios, orden y resultados). La restricción a los ids de la
		 * solapa NO se toca: la mantiene components/cheques/Index.vue.
		 */
		limpiar_filtro() {
			this.$store.dispatch('cheque/reiniciar_busqueda_de_columnas')
		},
	}
}
</script>
<style lang="sass" scoped>
.nav-filtrados
	// En teléfono los dos botones y los dos totales no entran en una sola línea: se parten en
	// varias, con la misma separación entre renglones que entre elementos.
	flex-wrap: wrap
	gap: 8px 15px

	.title
		margin: 0
</style>
