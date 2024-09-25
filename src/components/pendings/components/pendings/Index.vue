<template> 
<view-component
v-if="view == 'por-realizar'"
:show_btn_save="show_model_buttons"
:show_btn_delete="show_model_buttons"
:check_permissions="false"
:show_previus_days="false"
model_name="pending">

	<template #modals>
		<recurrentes-modal></recurrentes-modal>
	</template>

	<template #header>
		<fechas 
		model_name="pending" />
	</template>

	<template #horizontal_nav_center>
		<set-dias-restantes-en-amarillo></set-dias-restantes-en-amarillo>

		<btn-recurrentes></btn-recurrentes>
	</template>

	<template #model_modal_header>
		
		<btn-terminado></btn-terminado>

	</template>
</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		Fechas: () => import('@/components/pendings/components/nav/Fechas'),
		SetDiasRestantesEnAmarillo: () => import('@/components/pendings/components/pendings/SetDiasRestantesEnAmarillo'),
		BtnRecurrentes: () => import('@/components/pendings/components/pendings/BtnRecurrentes'),
		BtnTerminado: () => import('@/components/pendings/components/pendings/BtnTerminado'),

		RecurrentesModal: () => import('@/components/pendings/modals/pendings/recurrentes/Index'),
	},
	computed: {
		model() {
			return this.$store.state.pending.model 
		},
		modal_recurrente_abierto() {
			return this.$store.state.pending.modal_recurrente_abierto
		},
		show_model_buttons() {
			if (this.modal_recurrente_abierto) {
				return true
			}

			if (this.model.id && this.model.es_recurrente) {
				return false
			} 
			return true
		},
	}
}
</script>
<style lang="sass">
.pending-vencida
	td
		font-weight: bold 
		background: red !important

.pending-amarillo
	td
		font-weight: bold 
		background: yellow !important

	
</style>