<template>
	<!--
		Tarjeta Origen: de dónde sale la nota de crédito.
		- Venta: N° de venta (Enter) o un cliente para una nota sin venta.
		- Compra: N° de compra (Enter) o un proveedor para una nota sin compra.
		Con el comprobante cargado, debajo va su resumen (fecha, contraparte, total).
	-->
	<tarjeta
	:titulo="es_compra ? 'Compra' : 'Venta'"
	:subtitulo="subtitulo">

		<div class="dev-origen__campos">
			<input-numero></input-numero>

			<div
			v-if="!hay_comprobante"
			class="dev-origen__contraparte">
				<label class="dev-label">
					{{ es_compra ? 'Proveedor' : 'Cliente' }}
				</label>
				<buscador-proveedor
				v-if="es_compra"></buscador-proveedor>
				<buscador-cliente
				v-else></buscador-cliente>
			</div>
		</div>

		<resumen-comprobante></resumen-comprobante>
	</tarjeta>
</template>
<script>
export default {
	components: {
		Tarjeta: () => import('@/components/devoluciones/components/Tarjeta'),
		InputNumero: () => import('@/components/devoluciones/components/origen/InputNumero'),
		BuscadorCliente: () => import('@/components/devoluciones/components/origen/BuscadorCliente'),
		BuscadorProveedor: () => import('@/components/devoluciones/components/origen/BuscadorProveedor'),
		ResumenComprobante: () => import('@/components/devoluciones/components/origen/ResumenComprobante'),
	},
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
		/**
		 * ¿Hay una venta (o compra, según el modo) cargada? Con comprobante, la contraparte ya
		 * viene dada por él y el buscador se esconde (igual que antes en venta).
		 *
		 * @returns {Boolean}
		 */
		hay_comprobante() {
			let state = this.$store.state.devoluciones
			if (this.es_compra) {
				return !!state.provider_order
			}
			return !!state.sale
		},
		/**
		 * @returns {String} Bajada de la tarjeta según el modo.
		 */
		subtitulo() {
			if (this.es_compra) {
				return 'Buscá la compra por su número, o elegí un proveedor para una nota de crédito sin compra.'
			}
			return 'Buscá la venta por su número, o elegí un cliente para una nota de crédito sin venta.'
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	// Número angosto + buscador de contraparte a lo que quede. En teléfono, uno debajo del otro.
	.dev-origen__campos
		display: grid
		grid-template-columns: minmax(0, 1fr)
		gap: 16px

		@media screen and (min-width: 768px)
			grid-template-columns: 220px minmax(0, 1fr)
			align-items: start

	.dev-origen__contraparte
		min-width: 0
</style>
