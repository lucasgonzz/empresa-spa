<template>
	<!-- Selector unico de moneda (Pesos/Dolares/Consolidado). Solo visible con la extension de ventas en dolares activa (tarea 05 del prompt): sin la extension, todo es pesos y no hay nada que elegir. Reemplaza el comportamiento anterior que duplicaba las tarjetas cuando la extension estaba activa. -->
	<div
	v-if="hasExtencion('ventas_en_dolares')"
	class="selector-moneda-row">
		<div class="horizontal-nav selector-moneda">
			<div
			class="item apretable"
			v-for="opcion in opciones"
			:key="opcion.value"
			:class="{ active: moneda == opcion.value }"
			@click="setMoneda(opcion.value)">
				{{ opcion.text }}
			</div>
		</div>

		<!-- Aclaracion discreta: en consolidado, las operaciones en USD se convierten con la cotizacion vigente al momento de la consulta, no con la del dia real de la operacion (tarea 05) -->
		<p
		v-if="moneda == 'consolidado' && cotizacion_estimada"
		class="selector-moneda__aviso">
			Hay operaciones convertidas con la cotización vigente, no con la del día de la operación.
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		/* Moneda unica aplicada a Estado de Resultados, Flujo de Caja y Posicion Fiscal */
		moneda() {
			return this.$store.state.reportes.moneda
		},
		opciones() {
			return [
				{text: 'Pesos', value: 'pesos'},
				{text: 'Dólares', value: 'dolares'},
				{text: 'Consolidado', value: 'consolidado'},
			]
		},
		/* true si alguno de los reportes ya cargados informo que el consolidado uso cotizacion estimada */
		cotizacion_estimada() {
			let estado_resultados = this.$store.state.reportes.estado_resultados
			let flujo_caja = this.$store.state.reportes.flujo_caja

			return !!(estado_resultados && estado_resultados.cotizacion_estimada)
				|| !!(flujo_caja && flujo_caja.cotizacion_estimada)
		},
	},
	methods: {
		/**
		 * Cambia la moneda unica y vuelve a pedir los 3 reportes contables con la nueva moneda
		 * (Posicion Fiscal no tiene dimension de moneda, pero se refresca igual para mantener el
		 * mismo rango de fechas activo).
		 *
		 * @param {String} value - 'pesos' | 'dolares' | 'consolidado'
		 */
		setMoneda(value) {
			this.$store.commit('reportes/setMoneda', value)
			this.$store.dispatch('reportes/getEstadoResultados')
			this.$store.dispatch('reportes/getFlujoCaja')
			this.$store.dispatch('reportes/getPosicionFiscal')
		},
	},
}
</script>
<style lang="sass">
.selector-moneda-row
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 8px
	margin: 16px 0 20px

.horizontal-nav.selector-moneda
	display: inline-flex
	width: fit-content
	gap: 6px
	padding: 4px
	background-color: #E3E3E3
	border-radius: 8px

	.item
		border: none
		border-radius: 6px
		padding: 8px 14px
		cursor: pointer
		font-size: 0.875rem
		font-weight: 500
		line-height: 1.25
		color: #6c757d
		background-color: transparent
		white-space: nowrap
		transition: color 0.12s ease, background-color 0.12s ease

		&:hover:not(.active)
			color: #0d6efd
			background-color: #e7f1ff

		&.active
			color: #fff
			background-color: #0d6efd
			font-weight: 600
			box-shadow: 0 1px 2px rgba(13, 110, 253, 0.28)

.selector-moneda__aviso
	font-size: 0.78rem
	color: #94a3b8
	font-style: italic
	margin: 0
</style>
