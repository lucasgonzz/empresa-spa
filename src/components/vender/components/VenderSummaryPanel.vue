<template>
	<!--
		Widget flotante de resumen de la venta.
		Posicionado en la esquina superior derecha, colapsable con persistencia en localStorage.
		Muestra: total, descuento por método de pago, cliente, checklist de estado.
	-->
	<div
	class="vender-summary-panel"
	:class="{ 'vender-summary-panel--collapsed': is_collapsed }">

		<!-- Header con botón de colapsar/expandir -->
		<div
		class="vender-summary-panel__header"
		@click="toggle_collapsed">
			<span class="vender-summary-panel__header-title">
				{{ is_collapsed ? '▶' : '▼' }} Resumen
			</span>
		</div>

		<!-- Contenido expandible -->
		<div
		v-show="!is_collapsed"
		class="vender-summary-panel__body">

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
				<div class="vender-summary-panel__check-item vender-summary-panel__check-item--payment">
					<i
					:class="has_payment_method ? 'icon-check text-success' : 'icon-right text-muted'">
					</i>
					<div class="vender-summary-panel__check-item-text">
						<span>Método de pago</span>
						<span
						v-if="selected_payment_method"
						class="vender-summary-panel__check-detail">
							{{ selected_payment_method.name }}
						</span>
						<span
						v-if="is_cuenta_corriente"
						class="vender-summary-panel__cuenta-corriente">
							· A cuenta corriente
						</span>
					</div>
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

		</div>
	</div>
</template>

<script>
/* Key de localStorage para persistir el estado colapsado/expandido del widget */
const STORAGE_KEY_COLLAPSED = 'vender_summary_collapsed'

export default {
	name: 'VenderSummaryPanel',
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
	data() {
		return {
			/* Estado colapsado del widget; se carga desde localStorage en created() */
			is_collapsed: false,
		}
	},
	created() {
		/* Restaurar preferencia de colapso desde localStorage */
		const saved = localStorage.getItem(STORAGE_KEY_COLLAPSED)
		if (saved === '1' || saved === 'true') {
			this.is_collapsed = true
		}
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

		/**
		 * Indica si la venta se guardará a cuenta corriente.
		 * Misma lógica que AdvertenciaCuentaCorriente.vue.
		 *
		 * @returns {boolean}
		 */
		is_cuenta_corriente() {
			return !!(
				this.$store.state.vender.client
				&& this.$store.state.vender.omitir_en_cuenta_corriente == 0
				&& this.$store.state.vender.budget === null
				&& !this.$store.state.vender.guardar_como_presupuesto
			)
		},
	},
	methods: {
		/**
		 * Alterna el estado colapsado/expandido y persiste en localStorage.
		 */
		toggle_collapsed() {
			this.is_collapsed = !this.is_collapsed
			localStorage.setItem(STORAGE_KEY_COLLAPSED, this.is_collapsed ? '1' : '0')
		},
	},
}
</script>

<style scoped lang="sass">
/* Widget flotante de resumen de venta */
.vender-summary-panel
	position: fixed
	top: 60px
	right: 16px
	width: 300px
	z-index: 100
	background: var(--color-bg, #fff)
	border: 1px solid #e0e0e0
	border-radius: 10px
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12)
	padding: 0
	overflow: hidden

	/* Estado colapsado: solo muestra el header */
	&--collapsed
		.vender-summary-panel__total-block
			display: none

/* Header clickeable para colapsar/expandir */
.vender-summary-panel__header
	padding: 10px 16px
	cursor: pointer
	user-select: none
	border-bottom: 1px solid var(--color-border-tertiary, #e0e0e0)
	background: var(--bg-section, #f8f9fa)
	transition: background 0.15s

	&:hover
		background: var(--bg-hover, #e9ecef)

.vender-summary-panel__header-title
	font-size: 0.82rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

/* Cuerpo del widget con padding interno */
.vender-summary-panel__body
	padding: 0 0 16px

/* Bloque de total en azul destacado */
.vender-summary-panel__total-block
	background: var(--color-primary, #007bff)
	color: #fff
	padding: 16px
	text-align: center

.vender-summary-panel__total-label
	font-size: 0.8rem
	text-transform: uppercase
	letter-spacing: 0.08em
	opacity: 0.85
	margin-bottom: 4px

.vender-summary-panel__total-amount
	font-size: 1.6rem
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
	padding: 10px 16px
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	background: var(--bg-section, #f8f9fa)

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
	padding: 12px 16px
	display: flex
	flex-direction: column
	gap: 6px

.vender-summary-panel__check-item
	display: flex
	align-items: flex-start
	gap: 6px
	font-size: 0.82rem
	color: var(--color-text-primary, #212529)

/* Ítem de método de pago con detalle en columna */
.vender-summary-panel__check-item--payment
	align-items: flex-start

.vender-summary-panel__check-item-text
	display: flex
	flex-direction: column
	gap: 1px

.vender-summary-panel__check-detail
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)

/* Subtexto de cuenta corriente */
.vender-summary-panel__cuenta-corriente
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
</style>
