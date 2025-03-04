<template>
	<b-button
	block
	:id="field.key+'_btn_filtrar'"
	@click="filtrar"
	variant="primary">
		Filtrar
	</b-button>
</template>
<script>
export default {
	props: {
		field: Object,
		model_name: String,
	},
	methods: {
		filtrar() {
			this.$emit('filtrar')
		}
	}
}
</script>