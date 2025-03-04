<template>
<div>
    <sale-modal></sale-modal>
	
	<b-modal
	:title="'Movimientos de Stock de '+article.name+' | N° '+article.num"
	hide-footer
	size="lg"
	id="stock-movement-modal-info">
		<nav-component></nav-component>
		
		<table-component></table-component>
	</b-modal>
</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/listado/modals/stock-movement-modal-info/NavComponent'),
		TableComponent: () => import('@/components/listado/modals/stock-movement-modal-info/TableComponent'),
        SaleModal: () => import('@/components/common/SaleModal'),
	},
	computed: {
		article() {
			return this.$store.state.article.model 
		},
	}
}
</script>