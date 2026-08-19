<template>
	<!--
		Sin m-l-15 (mision 27, 11/8/2026): el espaciado de la barra lo da el gap de
		.view-header__group y este margen se le sumaba encima. Ver ArticlePdfPersonalizado.vue.
	-->
	<b-button
	dusk="btn_deposit_movements"
	@click="show_modal">
		<i class="icon-refresh"></i>
		Depositos
	</b-button>
</template>
<script>
export default {
	methods: {
		show_modal() {
			this.$store.dispatch('deposit_movement/getModels')
			this.$bvModal.show('deposit-movements')
		}
	}
}
</script>