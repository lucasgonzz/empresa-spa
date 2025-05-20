<template>
	<div>
		<div
		v-if="view == 'movimientos-de-depositos'">

			<view-component 
			model_name="deposit_movement"
			show_models_if_empty
			:show_btn_create="false"
			:show_btn_delete="false"
			:check_permissions="false"
			:models_to_show="models_to_show"
			@modelSaved="modelSaved"
			:show_previus_days="false">
				<template #modal_buttons>
					<pdf-button></pdf-button>		
				</template>
			</view-component>

		</div>
	</div>

</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PdfButton: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/PdfButton'),
	},
	computed: {
		models_to_show() {
			return this.$store.state.deposit_movement.en_curso.models 
		},
	},
	methods: {
		modelSaved() {
			this.$store.dispatch('deposit_movement/en_curso/getModels')
		}
	}
}
</script>