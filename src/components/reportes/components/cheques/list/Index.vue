<template>
	<div>
		<cobrar-cheque></cobrar-cheque>
		<endozar-cheque></endozar-cheque>
		<rechazar-cheque></rechazar-cheque>

		<table-component
	    :loading="loading"
	    :models="cheques_to_show"
	    model_name="cheque"
	    :set_model_on_click="false"
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
		cheques_to_show() {
			console.log('aca:')
			console.log(this.sub_view)
			console.log(this.sub_sub_view.replaceAll('-', '_'))
			console.log(this.cheques[this.sub_view])
			return this.cheques[this.sub_view][this.sub_sub_view.replaceAll('-', '_')]
		}
	}
}
</script>