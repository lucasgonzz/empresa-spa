<template>
	<!--
		Sin m-l-15 (mision 27, 11/8/2026): el espaciado de la barra lo da el gap de
		.view-header__group y este margen se le sumaba encima. Ver ArticlePdfPersonalizado.vue.
	-->
	<b-button
	@click="show_modal">
		<i class="icon-refresh"></i>
		Sugerencias
	</b-button>
</template>
<script>
export default {
	methods: {
		show_modal() {
			this.$store.dispatch('stock_suggestion/getModels')
			this.$bvModal.show('stock-suggestions')
		}
	}
}
</script>