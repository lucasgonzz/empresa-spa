<template>
	<div class="cont-nav-compras">
		<total></total>	
		<select-facturacion></select-facturacion>
	</div>
</template>
<script>
export default {
	components: {
		Total: () => import('@/components/provider/components/orders/nav/Total'),
		SelectFacturacion: () => import('@/components/provider/components/orders/nav/SelectFacturacion'),
	}
}
</script>
<style lang="sass">
.cont-nav-compras
	display: flex 
	flex-direction: row 
	justify-content: space-between
	align-items: center 

	select 	
		width: 300px
</style>