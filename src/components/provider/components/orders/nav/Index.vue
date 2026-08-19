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

// ⚠️ Acá había un bloque `.ui-small .cont-nav-compras` que redeclaraba los dos tokens de tamaño
// chico y le devolvía la altura al select. Se fue entero en la misión 33 y no hay que reponerlo:
// los dos tokens ya llegan solos porque `.ui-small` a secas los declara desde la misión 27, y el
// `height: auto` de _ui_sizes lo resuelve `.toolbar-select`, que nombra `select.custom-select` y le
// empata en especificidad ganándole por orden. Su comentario, además, explicaba una regla
// `.cont-nav-compras select` que esta misma misión borró.
</style>
