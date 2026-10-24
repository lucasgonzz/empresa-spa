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
	watch: {
		/**
		 * Deja el store alineado con la solapa de la URL (cuotas pendientes / cuotas pagas).
		 *
		 * El `route_prefix` ('pendiente' | 'pagado') lo escribe NavComponent solo al CLICKEAR una
		 * solapa: si se llega directo por la URL (o desde otra seccion de Clientes) queda vacio, el
		 * listado pide `payment-plan-cuota/from-date/...` sin estado y viene vacio, y el filtro de
		 * columna (global-search, que restringe por `route_prefix`, ver store/payment_plan_cuota.js)
		 * no sabria en que solapa esta parado. Si ya coincide no hace nada, asi que el camino del
		 * click no pide dos veces.
		 */
		sub_view: {
			immediate: true,
			handler(sub_view) {
				let estado = null
				if (sub_view == 'cuotas-pendientes') {
					estado = 'pendiente'
				} else if (sub_view == 'cuotas-pagas') {
					estado = 'pagado'
				}
				if (estado && this.$store.state.payment_plan_cuota.route_prefix != estado) {
					this.$store.commit('payment_plan_cuota/set_route_prefix', estado)
					// Mismo criterio que NavComponent: los criterios de la otra solapa no se arrastran.
					this.$store.commit('payment_plan_cuota/limpiar_criterios_de_columna')
					this.$store.dispatch('payment_plan_cuota/getModels')
				}
			},
		},
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
	// 🔴 Este margen iguala la separacion con el nav de secciones de Clientes a la que tienen las
	// otras dos secciones (mision 40, 12/8/2026). Medido antes, del borde de abajo de la pista de
	// secciones al primer control de cada seccion: clientes 15px, vendedores 15px, planes de pago
	// 0px.
	//
	// La causa de la diferencia es una sola y conviene tenerla escrita: en clientes y en vendedores
	// el aire NO lo pone nadie a proposito, lo hereda el `p-t-15` del `.view-header-toolbar` que
	// monta el `view-component` de cada una. Esta seccion no monta `view-component` --tiene su
	// propia fila desde la mision 33-- asi que no heredaba nada.
	//
	// Va como margen de esta fila y no como `margin-bottom` del nav de secciones, que seria lo
	// estructuralmente correcto, por una razon concreta: ese margen se sumaria al padding que las
	// otras dos ya heredan y las dejaria en 30px. Arreglar eso de raiz es sacarle el padding al
	// `view-header-toolbar`, que lo monta todo el sistema y excede a esta mision. Queda como
	// hallazgo.
	margin-top: 15px
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