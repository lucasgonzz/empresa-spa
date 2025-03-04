<template>
	<div 
	class="devoluciones-nav p-t-15 align-start">
		
		<div class="j-start align-start">
			
			<input-sale-num></input-sale-num>

			<search-client></search-client>
		</div>

		<div class="j-end">

			<btn-marcar-todo-devuelto></btn-marcar-todo-devuelto>
			
			<btn-cancel></btn-cancel>
		</div>

	</div>
</template>
<script>
export default {
	components: {
		InputSaleNum: () => import('@/components/devoluciones/components/nav/InputSaleNum'),
		SearchClient: () => import('@/components/devoluciones/components/nav/SearchClient'),
		BtnMarcarTodoDevuelto: () => import('@/components/devoluciones/components/nav/BtnMarcarTodoDevuelto'),
		BtnCancel: () => import('@/components/devoluciones/components/nav/BtnCancel'),
	}
}
</script>
<style lang="sass">
.devoluciones-nav
	display: flex  
	flex-direction: row
	justify-content: space-between
	.input-group
		width: 200px
</style>