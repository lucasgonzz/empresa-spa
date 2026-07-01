<template>
	<!--
		Barra de contexto horizontal compacta dentro de la Etapa 2 del wizard de venta.
		Muestra en una sola fila: total, cliente, método de pago (con vuelto) y checklist de estado.
		Permanece visible mientras el usuario trabaja con artículos.
	-->
	<div class="vender-context-bar">

		<!-- ── Bloque 1: Total ── -->
		<div class="vender-context-bar__block vender-context-bar__block--total">
			<span class="vender-context-bar__total-value">{{ total | currency }}</span>
			<span class="vender-context-bar__sub-value">
				{{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }} · {{ total_unidades }} {{ total_unidades === 1 ? 'unidad' : 'unidades' }}
			</span>
		</div>

		<!-- ── Bloque 2: Cliente ── -->
		<div class="vender-context-bar__block">
			<div
			v-if="client"
			class="vender-context-bar__client">
				<i class="icon-user vender-context-bar__client-icon"></i>
				<span class="vender-context-bar__main-value">{{ client.name }}</span>
				<!-- Badge "A cuenta corriente" si aplica -->
				<span
				v-if="is_cuenta_corriente"
				class="vender-context-bar__badge vender-context-bar__badge--cc">
					A cuenta corriente
				</span>
			</div>
			<span
			v-else
			class="vender-context-bar__muted">
				Sin cliente
			</span>
		</div>

		<!-- ── Bloque 3: Método de pago y vuelto efectivo ── -->
		<div class="vender-context-bar__block vender-context-bar__block--payment">
			<div class="vender-context-bar__payment-row">
				<span
				v-if="selected_payment_method"
				class="vender-context-bar__main-value">
					{{ selected_payment_method.name }}
				</span>
				<span
				v-else
				class="vender-context-bar__muted">
					Sin método de pago
				</span>
			</div>

			<!-- Vuelto efectivo inline: solo cuando monto_efectivo > 0 y no hay presupuesto -->
			<div
			v-if="monto_efectivo > 0 && !budget"
			class="vender-context-bar__vuelto-row">
				<span class="vender-context-bar__vuelto-label">
					Vuelto ({{ format_price(monto_efectivo) }}):
				</span>
				<b-form-input
				v-model="pago_del_cliente"
				type="number"
				size="sm"
				placeholder="Ingrese monto"
				class="vender-context-bar__vuelto-input"
				@keyup.enter.native="calcular_vuelto">
				</b-form-input>
				<span
				v-if="vuelto_calculado !== ''"
				class="vender-context-bar__vuelto-result text-success">
					= {{ format_price(vuelto_calculado) }}
				</span>
			</div>
		</div>

		<!-- ── Bloque 4: Checklist de estado ── -->
		<div class="vender-context-bar__block vender-context-bar__block--checklist">
			<div class="vender-context-bar__check-item">
				<i :class="has_address ? 'icon-check text-success' : 'icon-right text-muted'"></i>
				<span :class="has_address ? '' : 'vender-context-bar__muted'">Sucursal</span>
			</div>
			<div class="vender-context-bar__check-item">
				<i :class="has_payment_method ? 'icon-check text-success' : 'icon-right text-muted'"></i>
				<span :class="has_payment_method ? '' : 'vender-context-bar__muted'">Pago</span>
			</div>
			<div class="vender-context-bar__check-item">
				<i :class="has_articles ? 'icon-check text-success' : 'icon-right text-muted'"></i>
				<span :class="has_articles ? '' : 'vender-context-bar__muted'">Artículos</span>
			</div>
		</div>

	</div>
</template>

<script>
export default {
	name: 'ContextBar',
	filters: {
		/**
		 * Formatea un número como moneda con dos decimales y separadores de miles.
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
			/* Monto ingresado por el operador para calcular vuelto */
			pago_del_cliente: '',
			/* Resultado del cálculo de vuelto; cadena vacía = sin calcular */
			vuelto_calculado: '',
		}
	},
	watch: {
		/* Limpiar el cálculo de vuelto cada vez que cambia el total */
		total() {
			this.pago_del_cliente = ''
			this.vuelto_calculado = ''
		},
	},
	computed: {
		/**
		 * Total de la venta desde el store.
		 *
		 * @returns {number}
		 */
		total() {
			return this.$store.state.vender.total || 0
		},

		/**
		 * Lista de ítems del remito actual.
		 *
		 * @returns {Array}
		 */
		items() {
			return this.$store.state.vender.items || []
		},

		/**
		 * Suma de unidades (amount) de todos los ítems del remito.
		 *
		 * @returns {number}
		 */
		total_unidades() {
			let suma = 0
			this.items.forEach(item => {
				suma += Number(item.amount) || 1
			})
			return suma
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
		 * Indica si la venta irá a cuenta corriente del cliente.
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

		/**
		 * Método de pago seleccionado; buscado en el store de payment_method.
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
		 * Indica si hay una sucursal seleccionada.
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
		 * Indica si hay al menos un artículo cargado.
		 *
		 * @returns {boolean}
		 */
		has_articles() {
			return this.items.length > 0
		},

		/**
		 * Presupuesto activo; si existe, no se muestra el vuelto.
		 *
		 * @returns {Object|null}
		 */
		budget() {
			return this.$store.state.vender.budget
		},

		/**
		 * Estado del flag omitir_en_cuenta_corriente.
		 *
		 * @returns {number} 0 o 1
		 */
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente
		},

		/**
		 * ID del método de pago efectivo.
		 *
		 * @returns {number|null}
		 */
		payment_method_id_efectivo() {
			return this.$store.state.vender.current_acount_payment_method_id
		},

		/**
		 * Métodos de pago seleccionados (múltiples, para ventas con método combinado).
		 *
		 * @returns {Array}
		 */
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods || []
		},

		/**
		 * Monto en efectivo que el cliente debe pagar.
		 *
		 * @returns {number}
		 */
		monto_efectivo() {
			/* Si hay cliente en cuenta corriente, no se cobra en efectivo */
			if (this.client && !this.omitir_en_cuenta_corriente) {
				return 0
			}

			/* Método de pago ID 3 = efectivo */
			if (this.payment_method_id_efectivo != 0) {
				if (this.payment_method_id_efectivo == 3) {
					return this.total
				}
			}

			/* Buscar efectivo dentro de los métodos de pago seleccionados */
			let efectivo = this.selected_payment_methods.find(pm => pm.id == 3)
			if (typeof efectivo != 'undefined') {
				return efectivo.amount
			}

			return 0
		},
	},
	methods: {
		/**
		 * Formatea un número como precio con separadores de miles y decimales.
		 *
		 * @param {number} value
		 * @returns {string}
		 */
		format_price(value) {
			if (typeof value !== 'number') return '$ 0,00'
			return '$ ' + value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
		},

		/**
		 * Calcula el vuelto a partir del monto ingresado por el operador.
		 * Si el monto es insuficiente muestra un toast de error.
		 */
		calcular_vuelto() {
			const vuelto = Number(this.pago_del_cliente) - Number(this.monto_efectivo)
			if (vuelto > 0) {
				this.vuelto_calculado = vuelto
			} else {
				this.$toast.error('Dinero insuficiente')
				this.vuelto_calculado = ''
			}
		},
	},
}
</script>

<style scoped lang="sass">
/* Barra de contexto horizontal dentro de la Etapa 2 */
.vender-context-bar
	display: flex
	align-items: center
	min-height: 48px
	background: var(--bg-section, #f8f9fa)
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	margin: -8px -14px 10px
	overflow-x: auto

/* Bloque individual dentro de la barra */
.vender-context-bar__block
	display: flex
	flex-direction: column
	justify-content: center
	padding: 6px 16px
	border-right: 1px solid var(--color-border-tertiary, #dee2e6)
	min-width: 0
	flex-shrink: 0

	/* Último bloque: sin borde derecho */
	&:last-child
		border-right: none

	/* Bloque de método de pago: más ancho para albergar el input de vuelto */
	&--payment
		flex: 1
		min-width: 160px

	/* Bloque de checklist: fila horizontal */
	&--checklist
		flex-direction: row
		align-items: center
		gap: 12px
		flex-shrink: 0

	/* Bloque del total: un poco más de aire vertical */
	&--total
		padding-top: 8px
		padding-bottom: 8px

/* Valor principal (grande) de cada bloque */
.vender-context-bar__main-value
	font-size: 1.5rem
	font-weight: 700
	color: var(--color-text-primary, #212529)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

/* Total de la venta: más grande y en verde (acento de la etapa 2) */
.vender-context-bar__total-value
	font-size: 1.85rem
	font-weight: 700
	color: #198754
	letter-spacing: -0.01em
	line-height: 1.1
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

/* Subtexto secundario (cantidad de artículos) */
.vender-context-bar__sub-value
	font-size: 0.72rem
	color: var(--color-text-secondary, #6c757d)
	margin-top: 1px
	white-space: nowrap

/* Texto muted cuando no hay dato */
.vender-context-bar__muted
	font-size: 0.82rem
	color: var(--color-text-secondary, #6c757d)

/* Fila del cliente con ícono y badge */
.vender-context-bar__client
	display: flex
	align-items: center
	gap: 6px
	flex-wrap: wrap

.vender-context-bar__client-icon
	font-size: 0.85rem
	color: var(--color-primary, #007bff)
	flex-shrink: 0

/* Badge genérico pequeño */
.vender-context-bar__badge
	display: inline-block
	padding: 1px 7px
	border-radius: 20px
	font-size: 0.7rem
	white-space: nowrap
	font-weight: 500

	/* Variante cuenta corriente: borde azul suave */
	&--cc
		border: 1px solid var(--color-primary, #007bff)
		color: var(--color-primary, #007bff)
		background: rgba(0, 123, 255, 0.06)

/* Fila del método de pago */
.vender-context-bar__payment-row
	display: flex
	align-items: center

/* Fila del vuelto efectivo inline */
.vender-context-bar__vuelto-row
	display: flex
	align-items: center
	gap: 6px
	margin-top: 4px
	flex-wrap: wrap

.vender-context-bar__vuelto-label
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)
	white-space: nowrap

/* Input de vuelto compacto */
.vender-context-bar__vuelto-input
	width: 110px
	height: 26px
	font-size: 0.8rem
	padding: 2px 6px

.vender-context-bar__vuelto-result
	font-size: 0.85rem
	font-weight: 700
	white-space: nowrap

/* Ítem del checklist horizontal */
.vender-context-bar__check-item
	display: flex
	align-items: center
	gap: 3px
	font-size: 0.78rem
	white-space: nowrap
	color: var(--color-text-primary, #212529)
</style>
