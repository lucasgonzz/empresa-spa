<template>
	<!--
		Panel derecho de resumen de la venta.
		Siempre visible y fijo mientras el usuario edita el panel izquierdo.
		Muestra: total, descuento por método de pago, cliente, checklist, botones.
	-->
	<div class="vender-summary-panel">

		<!-- ── Bloque de total ── -->
		<div class="vender-summary-panel__total-block">
			<div class="vender-summary-panel__total-label">Total</div>
			<div class="vender-summary-panel__total-amount">
				{{ total | currency }}
			</div>

		<!-- Badge de descuento por método de pago si aplica -->
		<div
		v-if="payment_method_discount_label"
		class="vender-summary-panel__discount-badge">
			<i class="icon-list"></i>
			{{ payment_method_discount_label }}
		</div>
		</div>

		<!-- ── Mini card del cliente seleccionado ── -->
		<div
		v-if="client"
		class="vender-summary-panel__client-card">
			<i class="icon-user vender-summary-panel__client-icon"></i>
			<div class="vender-summary-panel__client-info">
				<span class="vender-summary-panel__client-name">{{ client.name }}</span>
				<span
				v-if="client.phone"
				class="vender-summary-panel__client-phone">{{ client.phone }}</span>
			</div>
		</div>

		<!-- ── Checklist de estado de la venta ── -->
		<div class="vender-summary-panel__checklist">
			<div class="vender-summary-panel__check-item">
				<i
				:class="has_address ? 'icon-check text-success' : 'icon-right text-muted'">
				</i>
				<span>Sucursal</span>
			</div>
			<div class="vender-summary-panel__check-item">
				<i
				:class="has_payment_method ? 'icon-check text-success' : 'icon-right text-muted'">
				</i>
				<span>Método de pago</span>
			</div>
			<div class="vender-summary-panel__check-item">
				<i
				:class="has_articles ? 'icon-check text-success' : 'icon-right text-muted'">
				</i>
				<span>Artículos ({{ items.length }})</span>
			</div>
			<div class="vender-summary-panel__check-item">
				<i class="icon-right text-muted"></i>
				<span>Cierre pendiente</span>
			</div>
		</div>

		<!-- ── Comprobantes de ventas previas ── -->
		<div class="vender-summary-panel__previus">
			<total-previus-sales></total-previus-sales>
		</div>

		<!-- ── Botones inferiores: imprimir y limpiar ── -->
		<div class="vender-summary-panel__actions">
			<print></print>
			<limpiar-vender></limpiar-vender>
		</div>

	</div>
</template>

<script>
export default {
	name: 'VenderSummaryPanel',
	components: {
		/* Total, btn guardar y alertas previas de venta */
		TotalPreviusSales: () => import('@/components/vender/components/remito/total-previus-sales/Index.vue'),
		/* Botón de imprimir (maneja F4 internamente) */
		Print: () => import('@/components/vender/components/remito/header-2/buttons/Print'),
		/* Botón de limpiar venta */
		LimpiarVender: () => import('@/components/vender/components/remito/header-2/buttons/LimpiarVender'),
	},
	filters: {
		/**
		 * Formatea un número como moneda con dos decimales.
		 *
		 * @param {number} value
		 * @returns {string}
		 */
		currency(value) {
			if (typeof value !== 'number') return '$ 0,00'
			return '$ ' + value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
		},
	},
	computed: {
		/**
		 * Total de la venta desde el store de vender.
		 *
		 * @returns {number}
		 */
		total() {
			return this.$store.state.vender.total || 0
		},

		/**
		 * Artículos del remito actual.
		 *
		 * @returns {Array}
		 */
		items() {
			return this.$store.state.vender.items || []
		},

		/**
		 * Cliente seleccionado para la venta.
		 *
		 * @returns {Object|null}
		 */
		client() {
			return this.$store.state.vender.client
		},

		/**
		 * Indica si hay una sucursal (address) seleccionada.
		 *
		 * @returns {boolean}
		 */
		has_address() {
			return !!this.$store.state.vender.address_id
		},

		/**
		 * Indica si hay un método de pago seleccionado.
		 *
		 * @returns {boolean}
		 */
		has_payment_method() {
			return !!this.$store.state.vender.payment_method_id
		},

		/**
		 * Indica si hay al menos un artículo en el remito.
		 *
		 * @returns {boolean}
		 */
		has_articles() {
			return this.items.length > 0
		},

		/**
		 * Método de pago principal seleccionado.
		 * Se usa para calcular el descuento aplicado y mostrarlo como badge.
		 *
		 * @returns {Object|null}
		 */
		selected_payment_method() {
			const pm_id = this.$store.state.vender.payment_method_id
			if (!pm_id) return null
			const methods = this.$store.state.payment_method.models || []
			return methods.find(m => m.id == pm_id) || null
		},

		/**
		 * Texto del descuento aplicado por el método de pago actual, si existe.
		 * Solo se muestra si el método tiene descuento mayor a 0.
		 *
		 * @returns {string|null}
		 */
		payment_method_discount_label() {
			const pm = this.selected_payment_method
			if (!pm) return null
			/* El modelo payment_method puede tener un campo discount o porcentaje */
			if (pm.discount && pm.discount > 0) {
				return pm.name + ' — ' + pm.discount + '% desc.'
			}
			return null
		},
	},
}
</script>

<style scoped lang="sass">
/* Panel derecho de resumen de venta */
.vender-summary-panel
	height: 100%
	display: flex
	flex-direction: column
	overflow-y: auto
	background: var(--bg-card, #fff)
	border-left: 1px solid var(--color-border-tertiary, #dee2e6)

/* Bloque de total en azul destacado */
.vender-summary-panel__total-block
	background: var(--color-primary, #007bff)
	color: #fff
	padding: 20px 16px 16px
	text-align: center
	flex-shrink: 0

.vender-summary-panel__total-label
	font-size: 0.8rem
	text-transform: uppercase
	letter-spacing: 0.08em
	opacity: 0.85
	margin-bottom: 4px

.vender-summary-panel__total-amount
	font-size: 2rem
	font-weight: 700
	line-height: 1.1

/* Badge de descuento por método de pago */
.vender-summary-panel__discount-badge
	display: inline-flex
	align-items: center
	gap: 4px
	margin-top: 8px
	padding: 3px 10px
	background: rgba(255, 255, 255, 0.2)
	border-radius: 20px
	font-size: 0.78rem

/* Mini card del cliente */
.vender-summary-panel__client-card
	display: flex
	align-items: center
	gap: 8px
	padding: 10px 14px
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	background: var(--bg-section, #f8f9fa)
	flex-shrink: 0

.vender-summary-panel__client-icon
	font-size: 1.5rem
	color: var(--color-primary, #007bff)
	flex-shrink: 0

.vender-summary-panel__client-info
	display: flex
	flex-direction: column

.vender-summary-panel__client-name
	font-weight: 600
	font-size: 0.85rem
	color: var(--color-text-primary, #212529)

.vender-summary-panel__client-phone
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)

/* Checklist de estado */
.vender-summary-panel__checklist
	padding: 12px 14px
	display: flex
	flex-direction: column
	gap: 6px
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	flex-shrink: 0

.vender-summary-panel__check-item
	display: flex
	align-items: center
	gap: 6px
	font-size: 0.82rem
	color: var(--color-text-primary, #212529)

/* Área de total previus sales (incluye BtnGuardar) */
.vender-summary-panel__previus
	padding: 10px 14px
	flex: 1

/* Botones inferiores (print + limpiar) */
.vender-summary-panel__actions
	padding: 10px 14px
	border-top: 1px solid var(--color-border-tertiary, #dee2e6)
	display: flex
	gap: 8px
	flex-wrap: wrap
	flex-shrink: 0
</style>
