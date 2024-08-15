<template>
	
	<display
	:models="recurrentes"
	mostrar_models_que_vinienen_por_prop_siempre
	:model_name="model_name"
	:loading="loading"
	:properties="modelPropertiesFromName(model_name)">
	</display>
</template>
<script>
export default {
	props: {
		recurrentes: Array,
		loading: Boolean,
	},
	components: {
		Display: () => import('@/common-vue/components/display/Index'),
	},
	computed: {
		model_name() {
			return 'pending'
		},
		models_to_show() {
			return this.$store.state.pending.models 
		},
	}
}
</script>