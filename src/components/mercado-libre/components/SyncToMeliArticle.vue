<template>
	<view-component
	v-if="view == 'sinc-articulo-salientes'"
	change_from_dates_option
	:show_btn_delete="false"
	:show_btn_create="false"
	model_name="sync_to_meli_article">
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	created() {
		// Entrando directo a la solapa (F5, un link) solo el click en la solapa pedía la lista: se
		// pide acá si esta es la solapa abierta y todavía no hay (ver Orders.vue).
		if (this.view == 'sinc-articulo-salientes' && !this.$store.state.sync_to_meli_article.models.length) {
			this.$store.dispatch('sync_to_meli_article/getModels')
		}
	},
}
</script>