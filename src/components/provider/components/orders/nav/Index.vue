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

// 🔴 El tamano chico de la interfaz necesita SU PROPIA regla, y por dos motivos distintos que se
// suman (medido el 11/8/2026; sin esto el select se descolgaba de la barra con .ui-small):
//
// 1. ⚠️ Este motivo YA NO RIGE desde el 11/8/2026 (mision 27) y se deja escrito para que nadie lo
//    reponga: los 32px de .ui-small los declaraba `.ui-small .view-header-toolbar` --acotado a la
//    barra de encabezado-- y esta fila NO vive adentro de la barra, asi que
//    var(--toolbar-control-h) le resolvia siempre 36px desde :root. Ese selector paso a `.ui-small`
//    a secas, que se aplica sobre #app, de modo que ahora los dos tokens le llegan solos por
//    herencia y la redeclaracion de abajo quedo redundante (declara los mismos dos valores). Se
//    deja porque el motivo 2 sigue necesitando el bloque igual, y borrar los tokens de adentro no
//    ahorraria nada. Si algun dia cambian los valores en _toolbar_botones.sass, estos dos hay que
//    borrarlos, no actualizarlos.
// 2. _ui_sizes.sass declara `.ui-small select.custom-select { height: auto }` con (0,2,1), y
//    b-form-select renderiza justamente un select.custom-select. `.cont-nav-compras select` es
//    (0,1,1) y perdia: con .ui-small activo el select se quedaba sin altura del todo. El selector
//    de abajo es (0,3,1) y gana.
.ui-small .cont-nav-compras
	--toolbar-control-h: 32px
	--toolbar-btn-radius: 9px

	select.custom-select
		height: var(--toolbar-control-h)
</style>
