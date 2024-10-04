<template>
	<b-modal
	title="Movimientos de Depositos"
	hide-footer
	size="lg"
	id="deposit-movements">
		<div>
			<view-component 
			model_name="deposit_movement"
			order_list_by="deposit_movement_status"
			change_from_dates_option
			:show_btn_save="se_puede_modificar"
			:show_btn_delete="se_puede_modificar"
			:show_previus_days="show_previus_days">

				<template #modal_buttons>
					<pdf-button></pdf-button>		
				</template>

			</view-component>
		</div>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PdfButton: () => import('@/components/listado/components/deposit-movements/modal/PdfButton'),
	},
	computed: {
		show_previus_days() {
			return this.$store.state.deposit_movement.from_dates
		},
		model() {
			return this.$store.state.deposit_movement.model
		},
		se_puede_modificar() {
			if (this.model.id && this.model.deposit_movement_status_id == 2) {
				return false
			}
			return true
		},
	},
}
</script>