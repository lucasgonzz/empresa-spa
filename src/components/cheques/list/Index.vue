<template>
	<div>
		<cobrar-cheque></cobrar-cheque>
		<pagar-cheque></pagar-cheque>
		<endozar-cheque></endozar-cheque>
		<rechazar-cheque></rechazar-cheque>
		<rechazado-por-proveedor></rechazado-por-proveedor>

		<table-component
	    :loading="loading"
	    :models="cheques_to_show"
	    :properties="properties_to_show"
	    model_name="cheque"
	    :show_actualizado="false"
	    :show_btn_edit="false">
	    	
	    	<template #table_left_options="props">
	    		<span
	    		v-if="props.model.es_echeq">
	    			<b-badge
	    			class="m-r-10"
	    			variant="primary">
	    				Echeq
	    			</b-badge>
	    		</span>

	    		<table-buttons
	    		:cheque="props.model"></table-buttons>
	    	</template>

	    	<template #table_right_options>

	    	</template>
	    </table-component>
	</div>
</template>
<script>
import { cheques_de_la_solapa, acotar_a_la_solapa } from '@/components/cheques/solapas'

export default {
	components: {
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
		TableButtons: () => import('@/components/cheques/list/TableButtons'),
		CobrarCheque: () => import('@/components/cheques/list/modals/CobrarCheque'),
		PagarCheque: () => import('@/components/cheques/list/modals/PagarCheque'),
		EndozarCheque: () => import('@/components/cheques/list/modals/EndozarCheque'),
		RechazarCheque: () => import('@/components/cheques/list/modals/RechazarCheque'),
		RechazadoPorProveedor: () => import('@/components/cheques/list/modals/RechazadoPorProveedor'),
	},
	computed: {
		loading() {
			return this.$store.state.cheque.loading 
		},
		cheques() {
			return this.$store.state.cheque.models 
		},
		filtered() {
			return this.$store.state.cheque.filtered
		},
		/**
		 * Hay una búsqueda de columnas puesta (filtro u orden): la tabla muestra `filtered`.
		 *
		 * Es `is_filtered` y NO `filtered.length`: un filtro que no encuentra nada deja
		 * `filtered = []`, y con el largo la tabla volvía a mostrar la lista completa de la
		 * solapa como si no hubiera filtro.
		 *
		 * @returns {Boolean}
		 */
		is_filtered() {
			return this.$store.state.cheque.is_filtered
		},
		/**
		 * Cheques de la solapa que marca la ruta (Recibido / Emitido + estado, o Endosado). La
		 * regla de qué lista corresponde a cada solapa vive en components/cheques/solapas.js, la
		 * misma que usan las pestañas y el filtro de ids.
		 *
		 * @returns {Array<Object>}
		 */
		cheques_de_esta_solapa() {
			return cheques_de_la_solapa(this.cheques, this.sub_view, this.sub_sub_view)
		},
		/**
		 * Filas de la tabla: los cheques de la solapa o, con una búsqueda de columnas puesta, el
		 * resultado de esa búsqueda.
		 *
		 * Misión cheques-solapa-endosados (2/10/2026): el resultado de la búsqueda sale de
		 * `POST global-search/cheque`, que se acota a la solapa con el filtro `in` de ids que
		 * escribe components/cheques/Index.vue. Igual se vuelve a acotar acá, antes de mostrarlo.
		 *
		 * 🔴 Es una red de seguridad contra una API vieja: la que corre en producción hasta el
		 * release ignora en silencio el operador `in` y devuelve cheques de TODAS las solapas.
		 * Sin este recorte, con SPA nueva y API vieja un filtro u orden mostraría cheques de otra
		 * solapa (por ejemplo, un endosado dentro de Recibido). Con la API nueva el recorte no
		 * saca nada. A lo sumo, con la API vieja, una página queda con menos filas.
		 *
		 * @returns {Array<Object>}
		 */
		cheques_to_show() {
			if (!this.is_filtered) {
				return this.cheques_de_esta_solapa
			}

			return acotar_a_la_solapa(this.filtered, this.cheques_de_esta_solapa)
		},
		/**
		 * Columnas permitidas para la tabla según la solapa (Recibido / Emitido / Endosado). Valen
		 * también con una búsqueda de columnas puesta: antes, con un filtro, se devolvían todas
		 * las columnas (también las que en esa solapa no tienen sentido).
		 * No incluye aún orden ni visibilidad personalizados (eso aplica `properties_to_show`).
		 *
		 * Este camino NO pasa por las preferencias de columnas (column_preferences_helper), así
		 * que las props con `not_show_on_table` --el select de banco del formulario, desde la
		 * misión cheques-endoso-y-bancos-- se sacan acá a mano; si no, aparecían como columna.
		 *
		 * Las dos columnas de endoso (`endosado_a_provider_id`: a un proveedor;
		 * `endosado_en_expense_id`: en un gasto, decisión 1 de Lucas) solo tienen sentido en la
		 * solapa Endosado: en el resto siempre están vacías.
		 *
		 * Por solapa:
		 *   - Recibido: sin Proveedor ni columnas de endoso ni "desde cliente".
		 *   - Emitido: sin Cliente ni las columnas de endoso a proveedor/gasto (queda "Endozado
		 *     desde cliente": la copia emitida guarda de qué cliente vino el cheque).
		 *   - Endosado: las de endoso, sin Proveedor ni "desde cliente".
		 *   - "Motivo del rechazo" (`rechazado_observaciones`, misión cheque-motivo-rechazo,
		 *     9/10/2026): solo en la segunda fila Rechazados, de Recibido y de Emitido. En
		 *     Endosado y en los otros estados siempre está vacía.
		 */
		base_properties_for_cheques_list() {
			let props = this.modelPropertiesFromName('cheque').filter(prop => !prop.not_show_on_table)

			// Endosado no tiene segunda fila (su sub_sub_view se ignora): se lo nombra igual, por
			// si la URL trae un "rechazados" que sobra antes de que se normalice.
			if (this.sub_view == 'endosado' || this.sub_sub_view != 'rechazados') {
				props = props.filter(prop => prop.key != 'rechazado_observaciones')
			}

			if (this.sub_view == 'recibido') {
				return props.filter(prop => prop.key != 'provider_id' && prop.key != 'endosado_a_provider_id' && prop.key != 'endosado_en_expense_id' && prop.key != 'endosado_desde_client_id')
			} else if (this.sub_view == 'emitido') {
				return props.filter(prop => prop.key != 'client_id' && prop.key != 'endosado_a_provider_id' && prop.key != 'endosado_en_expense_id')
			} else if (this.sub_view == 'endosado') {
				return props.filter(prop => prop.key != 'provider_id' && prop.key != 'endosado_desde_client_id')
			}

			return props
		},
		/**
		 * Propiedades finales para `table-component`: si hay preferencias en el store (cargadas
		 * por el modal de columnas), se respeta orden y columnas visibles; siempre acotado a
		 * `base_properties_for_cheques_list` para no mostrar columnas inválidas en cada pestaña.
		 */
		properties_to_show() {
			let baseProps = this.base_properties_for_cheques_list
			let preferencias = this.$store.state.cheque.props_to_show

			if (!preferencias || !preferencias.length) {
				return baseProps
			}

			return this.mergeChequePropsPreferencias(baseProps, preferencias)
		}
	},
	methods: {
		/**
		 * Combina la definición del modelo (incluye `v_if` y metadatos) con la fila guardada
		 * en preferencias (ancho de columna, wrap, orden).
		 *
		 * @param {Array<Object>} baseProps Propiedades del modelo ya filtradas por la vista actual.
		 * @param {Array<Object>} preferencias Lista ordenada desde `cheque.props_to_show` (solo visibles).
		 * @returns {Array<Object>} Columnas listas para la tabla, en el orden del usuario.
		 */
		mergeChequePropsPreferencias(baseProps, preferencias) {
			let basePorKey = {}
			baseProps.forEach(function (prop) {
				basePorKey[prop.key] = prop
			})

			let resultado = []
			preferencias.forEach(function (pref) {
				let base = basePorKey[pref.key]
				if (typeof base != 'undefined') {
					resultado.push(Object.assign({}, base, pref))
				}
			})

			return resultado
		},
	},
}
</script>