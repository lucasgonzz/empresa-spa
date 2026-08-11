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
	// La fila estaba pegada a la barra de encabezado. 15px es el mismo valor que usan las
	// utilidades m-t-15 del sistema entre bloques, no un numero nuevo.
	margin-top: 15px

	select
		width: 300px
		// El select toma la metrica de los controles de la barra de arriba, para que se lea como
		// pariente de esos botones y no como un control de formulario de otra epoca. Los tokens
		// los declara _toolbar_botones.sass en :root, asi que valen aca aunque esta fila no viva
		// adentro de .view-header-toolbar.
		height: var(--toolbar-control-h)
		border-radius: var(--toolbar-btn-radius)
		border: 1px solid var(--color-border)
		background-color: var(--bg-card)
		color: var(--color-text-primary)
</style>
