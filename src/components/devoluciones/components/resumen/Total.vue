<template>
	<!--
		Total de la devolución como número grande (antes era un botón verde que no hacía nada).

		🔴 `data-testid="devolucion-total"` con `data-monto` = el número crudo: el spec lee el
		atributo y no el texto, porque price() recorta los ",00" y del texto no siempre se puede
		sacar el número.
	-->
	<div class="dev-total">
		<span class="dev-total__etiqueta">
			{{ es_compra ? 'Total de la nota de crédito al proveedor' : 'Total de la devolución' }}
		</span>

		<div
		class="dev-total__monto"
		data-testid="devolucion-total"
		:data-monto="total_devolucion">
			{{ price(total_devolucion) }}
			<small v-if="en_dolares">USD</small>
		</div>

		<p
		v-if="items.length"
		class="dev-total__detalle">
			{{ numero_es(unidades) }} {{ unidades == 1 ? 'unidad' : 'unidades' }} a devolver
		</p>
		<p
		v-else
		class="dev-total__detalle">
			Cargá artículos para ver el total.
		</p>

		<p
		v-if="comprobante"
		class="dev-total__detalle">
			{{ es_compra ? 'Compra' : 'Venta' }} por {{ price(comprobante.total) }}
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
		/**
		 * @returns {Number} Total calculado por set_total.js.
		 */
		total_devolucion() {
			return this.$store.state.devoluciones.total_devolucion
		},
		/**
		 * @returns {Array} Renglones de la devolución.
		 */
		items() {
			return this.$store.state.devoluciones.items
		},
		/**
		 * @returns {Object|null} Venta o compra cargada, según el modo.
		 */
		comprobante() {
			if (this.es_compra) {
				return this.$store.state.devoluciones.provider_order
			}
			return this.$store.state.devoluciones.sale
		},
		/**
		 * La nota de crédito sobre una compra en dólares queda en dólares.
		 *
		 * @returns {Boolean}
		 */
		en_dolares() {
			return this.es_compra && this.comprobante && this.comprobante.moneda_id == 2
		},
		/**
		 * Unidades que se devuelven AHORA (la cantidad del renglón es acumulada: se le resta lo
		 * ya devuelto). Se calcula acá y no se lee `unidades_devueltas`, porque set_total.js la
		 * agrega al item después de creado y en Vue 2 esa propiedad no es reactiva.
		 *
		 * @returns {Number}
		 */
		unidades() {
			let total = 0
			this.items.forEach(item => {
				let unidades = Number(item.returned_amount) - Number(item.ya_devueltas || 0)
				if (unidades > 0) {
					total += unidades
				}
			})
			return total
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-total__etiqueta
		display: block
		font-size: 0.8125rem
		font-weight: 500
		color: var(--color-text-secondary)

	.dev-total__monto
		margin-top: 4px
		font-size: 2.25rem
		font-weight: 600
		line-height: 1.1
		letter-spacing: -0.02em
		font-variant-numeric: tabular-nums
		color: var(--color-text-primary)
		overflow-wrap: anywhere

		small
			font-size: 1rem
			font-weight: 500
			color: var(--color-text-secondary)

	.dev-total__detalle
		margin: 6px 0 0
		font-size: 0.8125rem
		color: var(--color-text-secondary)
</style>
