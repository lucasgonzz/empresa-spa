<template>
	<table-component
    :loading="false"
    :models="models"
    model_name="article_purchase"
    :set_model_on_click="false"
    :show_actualizado="false"
    :show_btn_edit="false"></table-component>
</template>
<script>
export default {
	components: {
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
	},
	computed: {
		models() {
			return this.$store.state.reportes.article_purchase.articles 
		},
	}
}
</script>