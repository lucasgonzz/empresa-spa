<template>
	<div
	class="caja-acciones">

		<btn-aperturas
		:caja="caja"></btn-aperturas>

		<btn-movimientos
		:caja="caja"></btn-movimientos>

		<btn-abrir
		:caja="caja"></btn-abrir>

		<btn-liquidacion-config
		:caja="caja"></btn-liquidacion-config>
	</div>
</template>
<script>
export default {
	props: {
		caja: Object,
	},
	components: {
		BtnAperturas: () => import('@/components/caja/components/table-buttons/BtnAperturas'),
		BtnMovimientos: () => import('@/components/caja/components/table-buttons/BtnMovimientos'),
		BtnAbrir: () => import('@/components/caja/components/table-buttons/BtnAbrir'),
		BtnLiquidacionConfig: () => import('@/components/caja/components/table-buttons/BtnLiquidacionConfig'),
	}
}
</script>
<style scoped lang="sass">
// El espaciado entre botones lo pone el contenedor y no cada boton con su propio m-l-10:
// asi el primero no queda pegado al borde de la celda y los margenes no se suman de forma
// dispareja. Un hijo con v-if falso renderiza un comentario vacio, no un elemento, asi que
// no deja un hueco de gap cuando falta (caso: caja cerrada, sin boton "Movimientos").
.caja-acciones
	display: flex
	flex-direction: row
	align-items: center
	gap: 8px
</style>
