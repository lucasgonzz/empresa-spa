<template>
	<div
	class="aperturas-acciones">
		<btn-excel
		:apertura_caja="apertura_caja"></btn-excel>

		<btn-reabrir
		:apertura_caja="apertura_caja"></btn-reabrir>
	</div>
</template>
<script>
export default {
	props: {
		apertura_caja: Object,
	},
	components: {
		BtnExcel: () => import('@/components/caja/modals/aperturas/table-buttons/BtnExcel'),
		BtnReabrir: () => import('@/components/caja/modals/aperturas/table-buttons/BtnReabrir'),
	}

}
</script>
<style scoped lang="sass">
// El espaciado entre botones lo pone el contenedor y no el m-l-10 de cada boton, igual que en
// la fila de Tesoreria. Reabrir tiene v-if: cuando no esta, renderiza un comentario vacio y no
// deja hueco de gap.
.aperturas-acciones
	display: flex
	flex-direction: row
	align-items: center
	justify-content: flex-end
	gap: 8px
</style>
