<template>
	<b-input-group
	class="m-b-10 m-b-md-0"
	prepend="Cant para mostrar:">
		<b-form-input
		type="number"
		placeholder="Cantidad de resultados para mostrar"
		v-model="cantidad_resultados"></b-form-input>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		cantidad_resultados: {
			get() {
				return this.$store.state.reportes.article_purchase.cantidad_resultados
			},
			set(value) {
				this.$store.commit('reportes/article_purchase/set_cantidad_resultados', value)
			},
		},
	},
}
</script>
<style lang="sass">
.article-purchase-filtros
	& > input 
		width: 200px
</style>