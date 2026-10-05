<template>
	<b-row>
		<b-col>
			<!--
				Misión cheques-solapa-endosados (2/10/2026): las dos filas de solapas están SIEMPRE
				visibles. Antes, con un filtro puesto (`filtered.length`), este bloque se reemplazaba
				entero por la barra de filtrados y el usuario perdía en qué solapa estaba parado.
				Ahora la barra de filtrados se muestra DEBAJO, mientras haya una búsqueda de
				columnas (`is_filtered`), y el filtro se aplica sobre la solapa vigente (ver
				components/cheques/Index.vue).
			-->

			<!-- Fila 1: Recibido / Emitido / Endosado -->
			<horizontal-nav
			set_sub_view
			:show_display="false"
			:items="items"></horizontal-nav>

			<!-- Fila 2: estados. Endosado es una sola lista y no tiene segunda fila. -->
			<horizontal-nav
			v-if="sub_items.length"
			set_sub_sub_view
			:show_display="false"
			:items="sub_items"></horizontal-nav>

			<!-- Resumen y acciones de la búsqueda de columnas puesta -->
			<nav-filtrados
			v-if="is_filtered"
			class="m-t-15"></nav-filtrados>
		</b-col>
	</b-row>
</template>
<script>
import { cheques_de_la_solapa, es_solapa_de_primer_nivel, ESTADOS_POR_SOLAPA } from '@/components/cheques/solapas'

export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
		NavFiltrados: () => import('@/components/cheques/NavFiltrados'),
	},
	data() {
		return {
			selected_item: {name: 'Recibidos'},
		}
	},
	computed: {
		/**
		 * Hay una búsqueda de columnas puesta (filtro u orden de una columna de la tabla).
		 *
		 * Es `is_filtered` y NO `filtered.length`: un filtro que no encuentra nada deja
		 * `filtered = []`, y con el largo la barra de filtrados desaparecía y la tabla volvía a
		 * mostrar la lista completa de la solapa como si no hubiera filtro.
		 *
		 * @returns {Boolean}
		 */
		is_filtered() {
			return this.$store.state.cheque.is_filtered
		},
		cheques() {
			return this.$store.state.cheque.models
		},
		/**
		 * Fila 1 de solapas. Los nombres, pasados por `routeString()`, son los valores de
		 * `sub_view` de la ruta (recibido | emitido | endosado).
		 *
		 * Endosado lleva el mismo contador rojo que antes tenía el estado "Endosados" de Recibido.
		 *
		 * @returns {Array<Object>}
		 */
		items() {
			return [
				{
					name: 'Recibido',
				},
				{
					name: 'Emitido',
				},
				{
					name: 'Endosado',
					alert: cheques_de_la_solapa(this.cheques, 'endosado').length,
				},
			]
		},
		/**
		 * Fila 2 de solapas: los estados de la solapa de primer nivel vigente, con la cantidad
		 * de cheques de cada uno. Vacía para Endosado, que no se desglosa (el template no dibuja
		 * la fila).
		 *
		 * Los estados salen de `ESTADOS_POR_SOLAPA` (components/cheques/solapas.js), que debe
		 * reflejar las mismas claves que devuelve la API en `models.recibido` y `models.emitido`
		 * (ChequeController@index). Una vez faltaron «Pronto a vencerse» y «Vencidos» en
		 * Emitido: los cheques en esos buckets existían en la respuesta pero no había pestaña
		 * ni badge, y al sumar «total de cheques» desde la barra parecía faltar uno. Tener una
		 * sola lista evita que Recibido y Emitido se desincronicen entre sí.
		 *
		 * @returns {Array<Object>}
		 */
		sub_items() {
			if (!es_solapa_de_primer_nivel(this.sub_view)) {
				return []
			}

			/** Pestañas que se van armando: {name, alert}. */
			let sub_items = []
			/** Estados de la solapa vigente (lista vacía para endosado). */
			let estados = ESTADOS_POR_SOLAPA[this.sub_view]

			estados.forEach(estado => {
				sub_items.push({
					name: estado.nombre,
					alert: cheques_de_la_solapa(this.cheques, this.sub_view, estado.ruta).length,
				})
			})

			return sub_items
		},
	},
	methods: {
		setSelected(item) {
			console.log(item)
			this.selected_item = item
			return
			if (item.name == 'graficos') {
				console.log('sobree escibiendo sub_view con ingresos')
				this.$router.push({params: {sub_view: 'ingresos'}})
			}
		},
	}
}
</script>