<template>

	<!--
		Raiz que separa DOS cosas distintas que antes convivian en el mismo contenedor flex: los
		controles, y los componentes que solo montan modales.

		Es un div comun (no flex) a proposito: los dos componentes de modales cuelgan de aca y no
		aportan nada al layout, porque un hijo de un bloque no genera gap.

		🔴 El `w-100` va ACA y no solo en el grupo de adentro, y no es de adorno. Antes el grupo era
		la raiz, o sea hijo directo de `.view-header__right`, y su `width: 100%` resolvia contra esa
		zona. Al meter este nivel, el `w-100` de adentro pasa a resolver contra ESTE div, que como
		flex item con `width: auto` mide su contenido: en telefono --donde la zona derecha va
		`justify-self: stretch; justify-content: center`-- los controles se corrian del borde
		derecho al centro. Con el `w-100` aca, el ancho vuelve a ser el de la zona y el `j-end` del
		grupo los deja donde estaban.
	-->
	<div class="w-100">

		<!-- view-header__group: la separacion entre estos botones la da el gap del contenedor, no un -->
		<!-- margen de cada hijo. Sin esta clase quedan pegados: el gap de .view-header__right separa -->
		<!-- este bloque entero de sus vecinos, pero este div es su unico hijo. -->
		<div class="j-end align-center w-100 view-header__group">

			<btn-update-article-list
			class="toolbar-btn--desde-md"></btn-update-article-list>

			<btn-inventory-performance
			class="toolbar-btn--desde-md"></btn-inventory-performance>

			<deposit-buttons
			class="toolbar-btn--desde-md"></deposit-buttons>

			<promociones-vinoteca></promociones-vinoteca>

			<article-pdf-personalizado></article-pdf-personalizado>
		</div>

		<!--
			🔴 Estos dos NO son controles y por eso viven FUERA del grupo (mision 35, 12/8/2026).
			Cada uno renderiza un `<div v-if="addresses.length">` cuyo `<modal-button>` esta
			comentado desde que sus dos acciones pasaron a ser items del dropdown de
			`DepositButtons`: adentro solo quedan modales. O sea que eran DOS items flex de ancho
			cero en medio de la fila, y el `gap` se aplica a los dos lados de cada item.

			Medido en la aplicacion corriendo, con depositos cargados: el hueco entre "rendimiento
			de inventario" y el dropdown de depositos daba 24px (8 + 8 + 8) contra los 8px de los
			demas. Era el hueco mas grande de la captura que reporto Lucas.

			La mision 27 midio "8px exactos entre los cinco controles" y no mintio: midio sobre una
			pagina sintetica que no tenia estos dos divs.

			No se resolvio con `display: contents` a proposito: esconde el elemento del arbol de
			layout pero arrastra problemas de accesibilidad, y aca la solucion es moverlos.

			`promociones-vinoteca` se queda arriba porque su wrapper SI contiene un boton.
		-->
		<stock-suggestion></stock-suggestion>

		<deposit-movements></deposit-movements>
	</div>
</template>
<script>
export default {
	components: {
		BtnUpdateArticleList: () => import('@/components/listado/components/horizontal-nav/BtnUpdateArticleList'),
		BtnInventoryPerformance: () => import('@/components/listado/components/horizontal-nav/BtnInventoryPerformance'),
		StockSuggestion: () => import('@/components/listado/components/horizontal-nav/stock-suggestion/Index'),
		DepositMovements: () => import('@/components/listado/components/horizontal-nav/deposit-movements/Index'),
		PromocionesVinoteca: () => import('@/components/listado/components/horizontal-nav/promociones-vinoteca/Index'),
		ArticlePdfPersonalizado: () => import('@/components/listado/components/horizontal-nav/ArticlePdfPersonalizado'),
		DepositButtons: () => import('@/components/listado/components/horizontal-nav/DepositButtons'),

	}
}
</script>