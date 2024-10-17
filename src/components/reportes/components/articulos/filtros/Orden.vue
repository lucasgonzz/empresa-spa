<template>
	<b-input-group
	prepend="Ordenar de:">
		<b-form-select
		v-model="orden"
		:options="options"></b-form-select>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		orden: {
			get() {
				return this.$store.state.reportes.article_purchase.orden
			},
			set(value) {
				return this.$store.commit('reportes/article_purchase/set_orden', value)
			},
		},
		options() {
			return [
				{
					text: 'Mayor a menor',
					value: 'mayor-menor',	
				},
				{
					text: 'Menor a mayor',
					value: 'menor-mayor',	
				},
			]
		}
	}
}
</script>