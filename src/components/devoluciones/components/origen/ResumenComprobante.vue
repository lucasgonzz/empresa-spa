<template>
	<div v-if="mostrar">

		<!-- Comprobante cargado: sus datos en una franja de "cifras". -->
		<div
		v-if="comprobante"
		class="dev-comprobante"
		:data-testid="es_compra ? 'devolucion-compra-resumen' : 'devolucion-venta-resumen'">

			<div class="dev-comprobante__datos">
				<div class="dev-comprobante__dato">
					<span class="dev-comprobante__etiqueta">
						{{ es_compra ? 'Compra' : 'Venta' }}
					</span>
					<span class="dev-comprobante__valor">
						N° {{ comprobante.num }}
					</span>
				</div>

				<div class="dev-comprobante__dato">
					<span class="dev-comprobante__etiqueta">
						Fecha
					</span>
					<span class="dev-comprobante__valor">
						{{ date(comprobante.created_at) }}
					</span>
				</div>

				<div class="dev-comprobante__dato">
					<span class="dev-comprobante__etiqueta">
						{{ es_compra ? 'Proveedor' : 'Cliente' }}
					</span>
					<span class="dev-comprobante__valor dev-comprobante__valor--texto">
						{{ nombre_contraparte }}
					</span>
				</div>

				<div class="dev-comprobante__dato">
					<span class="dev-comprobante__etiqueta">
						Total
					</span>
					<span class="dev-comprobante__valor">
						{{ price(comprobante.total) }}
						<small v-if="en_dolares">USD</small>
					</span>
				</div>
			</div>

			<div
			v-if="chips.length"
			class="dev-comprobante__chips">
				<span
				v-for="(chip, index) in chips"
				:key="index"
				class="dev-chip"
				:class="{'dev-chip--acento': chip.acento}">
					<i
					v-if="chip.icono"
					:class="chip.icono"></i>
					{{ chip.texto }}
				</span>
			</div>
		</div>

		<!-- Nota libre: hay contraparte pero no comprobante. -->
		<p
		v-else
		class="dev-comprobante__libre">
			<i class="bi bi-info-circle"></i>
			{{ es_compra ? 'Nota de crédito sin compra: agregá los artículos que le devolvés al proveedor.' : 'Nota de crédito sin venta: agregá los artículos que te devuelve el cliente.' }}
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
		 * Venta o compra cargada, según el modo.
		 *
		 * @returns {Object|null}
		 */
		comprobante() {
			if (this.es_compra) {
				return this.$store.state.devoluciones.provider_order
			}
			return this.$store.state.devoluciones.sale
		},
		/**
		 * Cliente o proveedor elegido, según el modo.
		 *
		 * @returns {Object|null}
		 */
		contraparte() {
			if (this.es_compra) {
				return this.$store.state.devoluciones.provider
			}
			return this.$store.state.devoluciones.client
		},
		/**
		 * Se muestra con un comprobante cargado, o con una contraparte elegida a mano (nota libre).
		 *
		 * @returns {Boolean}
		 */
		mostrar() {
			return !!(this.comprobante || this.contraparte)
		},
		/**
		 * @returns {String} Nombre del cliente/proveedor del comprobante, o "Sin cliente".
		 */
		nombre_contraparte() {
			if (this.es_compra) {
				// Del store y no de `comprobante.provider`: si el proveedor está borrado, la compra
				// lo trae null y el store tiene el de respaldo (set_from_provider_order.js).
				return this.contraparte ? this.contraparte.name : 'Sin proveedor'
			}
			return this.comprobante.client ? this.comprobante.client.name : 'Sin cliente'
		},
		/**
		 * Una compra en dólares tiene su total (y su nota de crédito) en dólares.
		 *
		 * @returns {Boolean}
		 */
		en_dolares() {
			return this.es_compra && this.comprobante && this.comprobante.moneda_id == 2
		},
		/**
		 * Datos extra del comprobante como chips: las facturas con CAE de la venta, y si la compra
		 * fue a cuenta corriente.
		 *
		 * @returns {Array} [{texto, icono, acento}]
		 */
		chips() {
			let chips = []

			if (!this.comprobante) {
				return chips
			}

			if (this.es_compra) {
				if (this.comprobante.generate_current_acount) {
					chips.push({
						texto: 'Fue a cuenta corriente',
						icono: 'bi bi-journal-text',
						acento: false,
					})
				}
				if (this.en_dolares) {
					chips.push({
						texto: 'En dólares',
						icono: 'bi bi-currency-dollar',
						acento: false,
					})
				}
				return chips
			}

			let afip_tickets = this.comprobante.afip_tickets || []
			afip_tickets.forEach(afip_ticket => {
				if (afip_ticket.cae) {
					chips.push({
						texto: 'Factura N° '+afip_ticket.cbte_numero,
						icono: 'bi bi-receipt',
						acento: true,
					})
				}
			})

			return chips
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-comprobante
		margin-top: 16px
		padding: 14px 16px
		border-radius: 10px
		background-color: var(--bg-section)

	.dev-comprobante__datos
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr))
		gap: 12px 20px

	.dev-comprobante__dato
		display: flex
		flex-direction: column
		min-width: 0

	.dev-comprobante__etiqueta
		font-size: 0.75rem
		color: var(--color-text-secondary)

	.dev-comprobante__valor
		font-size: 0.9375rem
		font-weight: 600
		color: var(--color-text-primary)
		font-variant-numeric: tabular-nums

		small
			font-weight: 500
			color: var(--color-text-secondary)

	// El nombre puede ser largo: se corta con puntos suspensivos en vez de empujar la grilla.
	.dev-comprobante__valor--texto
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	.dev-comprobante__chips
		display: flex
		flex-wrap: wrap
		gap: 6px
		margin-top: 12px

	.dev-comprobante__libre
		display: flex
		align-items: center
		gap: 8px
		margin: 16px 0 0
		font-size: 0.875rem
		color: var(--color-text-secondary)
</style>
