<template>
	<!-- Boton que APLICA el filtro de una columna. Ver la nota de nombres en BtnFilter.vue. -->
	<b-button
	block
	:data-testid="'btn-aplicar-filtro-'+field.key"
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