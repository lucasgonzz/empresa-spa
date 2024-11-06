<template>
	<b-button
	block
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