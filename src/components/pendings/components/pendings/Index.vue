<template> 
<view-component
v-if="view == 'por-realizar'"
:show_btn_save="show_model_buttons"
:show_btn_delete="show_model_buttons"
model_name="pending">
	<template #header>
		<fechas 
		model_name="pending" />
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
		BtnTerminado: () => import('@/components/pendings/components/pendings/BtnTerminado'),
	},
	computed: {
		model() {
			return this.$store.state.pending.model 
		},
		show_model_buttons() {
			if (this.model.id && this.model.es_recurrente) {
				return false
			} 
			return true
		},
	}
}
</script>