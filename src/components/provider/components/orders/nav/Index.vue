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

	// ⚠️ Acá había un bloque `select` con `width: 300px` mas la metrica del control (altura, radio,
	// borde, fondo y color). Se fue entero en la mision 33: esos cinco valores ahora los declara
	// `.toolbar-select` en _toolbar_botones.sass, que es la clase compartida de los selects de barra
	// y que este select lleva desde entonces. Dejarlo habría sido peor que redundante --su selector
	// `.cont-nav-compras select` es (0,1,1) contra los (0,2,1) de la clase nueva, o sea que perdía
	// igual, y quedaba un comentario explicando una métrica que ya no aplicaba--.
	//
	// El `width: 300px` no se conserva a propósito: la clase nueva le da ancho de contenido, que es
	// lo que hace que se lea como pariente de los controles de la barra en vez de un campo estirado.

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
