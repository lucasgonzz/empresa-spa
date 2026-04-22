<template>
	<div>
		<cobrar-cheque></cobrar-cheque>
		<pagar-cheque></pagar-cheque>
		<endozar-cheque></endozar-cheque>
		<rechazar-cheque></rechazar-cheque>

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
export default {
	components: {
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
		TableButtons: () => import('@/components/reportes/components/cheques/list/TableButtons'),
		CobrarCheque: () => import('@/components/reportes/components/cheques/list/modals/CobrarCheque'),
		PagarCheque: () => import('@/components/reportes/components/cheques/list/modals/PagarCheque'),
		EndozarCheque: () => import('@/components/reportes/components/cheques/list/modals/EndozarCheque'),
		RechazarCheque: () => import('@/components/reportes/components/cheques/list/modals/RechazarCheque'),
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
		cheques_to_show() {
			if (this.filtered.length) {
				return this.filtered
			}
			return this.cheques[this.sub_view][this.sub_sub_view.replaceAll('-', '_')]
		},
		/**
		 * Columnas permitidas para la tabla según recibido/emitido/endosados o resultados filtrados.
		 * No incluye aún orden ni visibilidad personalizados (eso aplica `properties_to_show`).
		 */
		base_properties_for_cheques_list() {
			if (this.filtered.length == 0) {

				if (this.sub_view == 'recibido') {
					if (this.sub_sub_view == 'endosados') {
						return this.modelPropertiesFromName('cheque').filter(prop => prop.key != 'provider_id' && prop.key != 'endosado_desde_client_id')
					} 
					return this.modelPropertiesFromName('cheque').filter(prop => prop.key != 'provider_id' && prop.key != 'endosado_a_provider_id' && prop.key != 'endosado_desde_client_id')
				} else if (this.sub_view == 'emitido') {
					return this.modelPropertiesFromName('cheque').filter(prop => prop.key != 'client_id' && prop.key != 'endosado_a_provider_id')
				}
			} 
			
			return this.modelPropertiesFromName('cheque')
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