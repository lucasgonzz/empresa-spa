<template>
	<b-button
	v-if="is_filtered && !listado_por_defecto && !papelera"
	v-b-tooltip.hover
	:title="tooltip_text"
	:aria-label="tooltip_text"
	@click="restartSearch"
	class="btn-header-action toolbar-btn--icono"
	data-testid="btn-reiniciar-filtros"
	id="btn_restart_filter"
	size="sm">
		<i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i>
	</b-button>
</template>
<script>
export default {
	props: {
		model_name: String,
		/** Si true, limpia solo el estado de resultados en papelera/{model} (no el is_filtered del listado). */
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Indica si hay filtros activos en el listado o en papelera según el modo.
		 *
		 * @returns {boolean}
		 */
		is_filtered() {
			if (this.papelera) {
				return this.$store.state.papelera[this.model_name].is_filtered
			}
			return this.$store.state[this.model_name].is_filtered
		},
		/**
		 * True cuando lo que hay en pantalla es el listado por defecto (prompts 02/03 del grupo
		 * 221), no un filtro puesto por el usuario. El store de papelera no tiene este flag (la
		 * papelera nunca arma listado por defecto, ver v-if de arriba que ya la excluye), por eso
		 * solo se lee del lado normal del modelo.
		 *
		 * @returns {Boolean}
		 */
		listado_por_defecto() {
			return !!this.$store.state[this.model_name].listado_por_defecto
		},
		/** Texto visible del botón. */
		button_label() {
			return 'Limpiar filtros'
		},
		/** Texto ampliado al pasar el mouse (accesibilidad y UX). */
		tooltip_text() {
			return 'Quitar todos los filtros y volver al listado completo'
		},
	},
	methods: {
		/**
		 * Reinicia el estado de filtrado en el store y vacía los valores de cada filtro. Al
		 * terminar dispatchea runListadoPorDefecto (prompt 04 del grupo 221) para volver al
		 * listado completo paginado, en vez de dejar la tabla con lo que haya quedado en memoria
		 * del filtro que se acaba de quitar. Este botón nunca se muestra en modo papelera (ver
		 * v-if de arriba), por eso el dispatch va directo con model_name, sin pasar por `prefix`.
		 */
		restartSearch() {
			this.limpiar_filtros()
			let prefix = this.papelera ? ('papelera/' + this.model_name + '/') : (this.model_name + '/')
			this.$store.commit(prefix + 'setIsFiltered', false)
			this.$store.commit(prefix + 'setFiltered', [])
			this.$store.commit(prefix + 'setFilterPage', 1)
			this.$store.commit(prefix + 'setTotalFilterPages', null)
			this.$store.commit(prefix + 'setTotalFilterResults', 0)

			// El botón "Quitar filtros" también debe apagar el estado del buscador general (si estaba
			// activo), para que su input y su botón "Limpiar búsqueda" queden consistentes. Estas dos
			// mutaciones no existen en el store de papelera — este botón nunca se muestra en modo
			// papelera (ver v-if de arriba), por eso van directo con model_name y no con `prefix`.
			this.$store.commit(this.model_name + '/set_filtered_without_filter_form', false)
			this.$store.commit(this.model_name + '/setGlobalSearchPayload', null)

			// Y los filtros que aporta un control SIEMPRE VISIBLE de la barra del módulo (hoy: el
			// select de sucursal del Listado). Sin esta línea el botón dejaba de cumplir lo que
			// promete su propio tooltip —"Quitar TODOS los filtros y volver al listado COMPLETO"—:
			// runListadoPorDefecto vuelve a leer estos filtros del state en cada request, así que
			// el "listado completo" seguía recortado por la sucursal elegida.
			//
			// Es una mutación del factory y arranca en `[]` para todos los modelos, así que en
			// cualquier módulo que no tenga control de barra esto es un no-op.
			this.$store.commit(this.model_name + '/set_extra_filters_de_barra', [])

			this.$store.dispatch(this.model_name + '/runListadoPorDefecto')
		},
		/**
		 * Restablece los campos de cada filtro del modelo a su valor inicial.
		 */
		limpiar_filtros() {
			this.$store.state[this.model_name].filters.forEach(filter => {
				filter.igual_que = filter.type == 'select' ? 0 : ''
				filter.mayor_que = ''
				filter.menor_que = ''
				filter.que_contenga = ''
				filter.checkbox = -1
				filter.ordenar_de = ''

				/*
					En blanco / No en blanco y value tambien se limpian, o el boton queda pegado:
					filter_has_value_criteria los cuenta como criterio activo, asi que despues de
					apretar "Quitar filtros" con un filtro "En blanco" puesto desde la lupa,
					runListadoPorDefecto no volvia a prender el flag y el boton seguia visible
					sin hacer nada al reapretarlo.
				*/
				filter.en_blanco = false
				filter.no_en_blanco = false

				if (typeof filter.value !== 'undefined') {
					filter.value = filter.type == 'select' || filter.type == 'search' ? 0 : ''
				}
			})
		},
	},
}
</script>
<style scoped>
/* Alineación con otros controles del header (icono + texto en una línea). */
.btn-header-action {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
}
</style>
