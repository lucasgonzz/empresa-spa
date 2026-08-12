<template>
	<div
	v-if="view == 'planes-de-pago'">

		<!--
			El nav de cuotas y la barra de fechas COMPARTEN FILA (misión 33). Antes eran dos filas
			apiladas, y la barra estaba declarada dos veces: una en el slot #header de
			cuotas-pendientes y otra en el de cuotas-pagas, con el mismo model_name. Montarla acá
			arriba la unifica y de paso la sube.

			🔴 El `min-width: 0` del nav es lo que sostiene la fila: un ítem flex no baja de su ancho
			de contenido a menos que se lo declaren, y sin eso la barra de fechas vuelve a caer abajo.
			Es la misma línea de la que depende la cabecera de Ventas (misión 32).
		-->
		<div class="payment-plan-fila">
			<nav-component class="payment-plan-fila__nav"></nav-component>

			<menu-fechas
			class="payment-plan-fila__fechas"
			model_name="payment_plan_cuota"></menu-fechas>
		</div>

		<cuotas-pendientes></cuotas-pendientes>
		<cuotas-pagas></cuotas-pagas>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/client/components/payment-plan/NavComponent'),
		MenuFechas: () => import('@/common-vue/components/menu-fechas/Index'),
		CuotasPendientes: () => import('@/components/client/components/payment-plan/cuotas-pendientes/Index'),
		CuotasPagas: () => import('@/components/client/components/payment-plan/cuotas-pagas/Index'),
	},
}
</script>
<style lang="sass">
.payment-plan-fila
	display: flex
	flex-direction: row
	flex-wrap: nowrap
	align-items: center
	gap: var(--toolbar-group-gap)
	margin-bottom: 15px

	// El nav es el que cede espacio: tiene scroll horizontal propio para eso.
	&__nav
		flex: 1 1 auto
		min-width: 0

	&__fechas
		flex: 0 0 auto

	// En teléfono la barra de fechas baja completa, debajo del nav, y sigue siendo usable.
	@media screen and (max-width: 992px)
		flex-wrap: wrap

		&__nav,
		&__fechas
			flex: 1 1 100%

// Mismo caso que en la cabecera de Ventas: horizontal-nav le pone un margin-top de 15px a su pista,
// pensado para cuando el nav va solo en su fila. Adentro de esta, con align-items: center, ese margen
// entra en la caja y deja las pestañas ~7px mas abajo que la barra de fechas.
//
// 🔴 La clase va DUPLICADA a proposito, y la regla vive a nivel raiz y no anidada bajo `&__nav` --que
// la expandiria a `.payment-plan-fila__nav .payment-plan-fila__nav`, o sea pidiendo un descendiente
// con la misma clase, que no existe--. El motivo de duplicarla: la regla de horizontal-nav es scoped,
// `.cont-navs .cont-left > div[data-v-xxx]`, que es (0,3,1) -- exactamente lo mismo que este selector
// con la clase una sola vez. En un empate decide el orden de inyeccion, y horizontal-nav llega por un
// chunk async que se resuelve DESPUES de este modulo: ganaba el margen de 15px y el arreglo no hacia
// nada. Con la clase repetida esto es (0,4,1) y gana por especificidad, que no depende de en que
// orden bajen los chunks.
.payment-plan-fila__nav.payment-plan-fila__nav .cont-navs .cont-left > div
	margin-top: 0
</style>