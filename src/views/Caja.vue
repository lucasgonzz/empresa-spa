<template>
	<div>

		<resumen-caja></resumen-caja>	

		<movimientos-entre-cajas></movimientos-entre-cajas>	

		<aperturas></aperturas>

		<movimientos></movimientos>

		<liquidacion-config></liquidacion-config>

		<liquidacion-timeline></liquidacion-timeline>

		<sale-modal></sale-modal>

		<view-component
		:models_to_show="models_to_show"
		show_models_if_empty
		model_name="caja">

		<template #horizontal_nav_center>
			<horizontal-nav-center></horizontal-nav-center>
		</template>

			<template #table_left_options="props">
				<table-buttons
				:caja="props.model"></table-buttons>
			</template>

			<!--
				El doble ! no es cosmetico: el backend puede mandar `abierta` como 1/0 y la prop
				esta declarada Boolean, con lo cual Vue tira un warning de tipo por cada fila.
			-->
			<template #table-prop-abierta="props">
				<estado-caja
				:abierta="!!props.model.abierta"></estado-caja>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		HorizontalNavCenter: () => import('@/components/caja/components/horizontal-nav-center/Index'),
		TableButtons: () => import('@/components/caja/components/table-buttons/Index'),
		EstadoCaja: () => import('@/components/caja/components/EstadoCaja'),

		SaleModal: () => import('@/components/common/SaleModal'),
		MovimientosEntreCajas: () => import('@/components/caja/modals/movimientos-entre-cajas/Index'),
		Aperturas: () => import('@/components/caja/modals/aperturas/Index'),
		Movimientos: () => import('@/components/caja/modals/movimientos/Index'),
		ResumenCaja: () => import('@/components/caja/modals/resumen-caja/Index'),
		LiquidacionConfig: () => import('@/components/caja/modals/liquidacion-config/Index'),
		LiquidacionTimeline: () => import('@/components/caja/modals/liquidacion-timeline/Index'),
	},
	computed: {
		cajas() {
			return this.$store.state.caja.models 
		},
		models_to_show() {

			if (this.is_admin) {

				return this.cajas
			}

			const cajas = []

			this.cajas.forEach(caja => {

				if (this.user_can_view_caja_in_tesoreria(caja)) {

					cajas.push(caja)
				}
			})

			return cajas 
		}
	},
	methods: {
		/**
		 * Determina si el usuario logueado debe ver la fila de esta caja en el módulo de tesorería.
		 * Orden: si hay `treasury_users`, solo ellos ven; si no hay, se usa `users`; si ambas listas están vacías, todos ven.
		 *
		 * @param {Object} caja Modelo caja del store (con `treasury_users` y `users`).
		 * @returns {boolean}
		 */
		user_can_view_caja_in_tesoreria(caja) {
			const treasury_users = caja.treasury_users || []

			if (treasury_users.length) {
				return typeof treasury_users.find(user => user.id == this.user.id) !== 'undefined'
			}

			const users = caja.users || []

			if (users.length) {
				return typeof users.find(user => user.id == this.user.id) !== 'undefined'
			}

			return true
		},
	},
}
</script>
<style lang="sass">
// Estado de la caja en la fila. Tres senales suaves en vez de un bloque de color:
// (1) un tinte muy leve, (2) una barra de acento de 3px en el borde izquierdo y
// (3) la pildora de EstadoCaja.vue en la columna Estado. La paleta vive en
// src/sass/_dark_theme.sass, definida en modo claro y oscuro.
//
// El !important NO es decoracion: `.cont-table .common-table td` (en
// common-vue/components/display/table/Index.vue) pinta el fondo del td y pesa (0,2,1);
// `.caja-abierta td` pesa (0,1,1) y sin !important pierde siempre.
//
// La barra va como box-shadow inset y no como border-left: un border agrega 3px al ancho
// de la celda y corre el contenido de la primera columna respecto de las filas vecinas.
.caja-abierta
	td
		background: var(--caja-abierta-fondo) !important

	td:first-child
		box-shadow: inset 3px 0 0 0 var(--caja-abierta-acento)

	// El hover de la tabla (`.common-table tr:hover td`) es una declaracion normal, asi que
	// hoy el !important de arriba se lo come y las filas de cajas son las unicas de todo el
	// sistema que no responden al mouse. Con esta regla vuelve a responder.
	&:hover
		td
			background: var(--caja-abierta-fondo-hover) !important

.caja-cerrada
	td
		background: var(--caja-cerrada-fondo) !important

	td:first-child
		box-shadow: inset 3px 0 0 0 var(--caja-cerrada-acento)

	&:hover
		td
			background: var(--caja-cerrada-fondo-hover) !important
</style>
