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

	    	<template #table_right_options="props">

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
		properties_to_show() {
			if (this.sub_view == 'recibido') {
				if (this.sub_sub_view == 'endosados') {
					return this.modelPropertiesFromName('cheque').filter(prop => prop.key != 'provider_id' && prop.key != 'endosado_desde_client_id')
				} 
				return this.modelPropertiesFromName('cheque').filter(prop => prop.key != 'provider_id' && prop.key != 'endosado_a_provider_id' && prop.key != 'endosado_desde_client_id')
			} else if (this.sub_view == 'emitido') {
				return this.modelPropertiesFromName('cheque').filter(prop => prop.key != 'client_id' && prop.key != 'endosado_a_provider_id')
			}
		}
	}
}
</script>