<template>
	<!--
		Contenedor de las 3 etapas del wizard de venta.
		Cada etapa tiene un header clickeable y un body colapsable con transición CSS.
		La Etapa 2 (artículos) no es colapsable — siempre está expandida.
	-->
	<div class="vender-stages">

		<!-- ══════════════════════════════════════════════════════════
		     ETAPA 1 — Configuración inicial
		     Arranca abierta en ventas nuevas y colapsada si ya hay datos.
		     ══════════════════════════════════════════════════════════ -->
		<div
		class="vender-stage"
		:class="{ 'vender-stage--open': stage1_open }">

			<!-- Header de la etapa 1 -->
			<div
			class="vender-stage__header"
			ref="stage1_header"
			@click="toggleStage1">
				<span class="vender-stage__number">1</span>
				<div class="vender-stage__header-text">
					<span class="vender-stage__label">Configuración inicial</span>
					<span class="vender-stage__sublabel">Sucursal, método de pago, lista de precios y cliente</span>
				</div>
				<i
				:class="stage1_open ? 'icon-up' : 'icon-down'"
				class="vender-stage__chevron"></i>
			</div>

			<!-- Body colapsable de la etapa 1 -->
			<transition name="stage-collapse">
				<div
				v-show="stage1_open"
				class="vender-stage__body">

					<!-- Sucursal — define el depósito de stock -->
					<div ref="field_address" class="vender-stage__field">
					<p class="vender-stage__field-hint">
						<i class="icon-info"></i>
						La sucursal define el depósito de stock utilizado para la venta.
					</p>
						<select-address></select-address>
					</div>

					<!-- Lista de precios -->
					<div ref="field_price_type" class="vender-stage__field">
						<price-type-selector></price-type-selector>
					</div>

					<!-- Método de pago -->
					<div ref="field_payment_method" class="vender-stage__field">
						<payment-method></payment-method>
					</div>

					<!-- Caja (se autocompleta según el método de pago) -->
					<div class="vender-stage__field">
						<caja></caja>
					</div>

					<!-- Tipo de venta -->
					<div class="vender-stage__field">
						<sale-type></sale-type>
					</div>

					<!-- Separador visual antes de los campos de cliente -->
					<hr class="vender-stage__separator">

					<!-- Cliente (opcional) -->
					<div ref="field_client" class="vender-stage__field">
						<select-client></select-client>
					</div>

					<!-- Alerta personalizada del cliente seleccionado -->
					<alertar-personalizado></alertar-personalizado>

					<!-- Omitir en cuenta corriente -->
					<omitir-en-cuenta-corriente></omitir-en-cuenta-corriente>

					<!-- Guardar como presupuesto -->
					<guardar-como-presupuesto></guardar-como-presupuesto>

				</div>
			</transition>
		</div><!-- /etapa 1 -->


		<!-- ══════════════════════════════════════════════════════════
		     ETAPA 2 — Artículos y servicios
		     Siempre expandida, no colapsable.
		     ══════════════════════════════════════════════════════════ -->
		<div class="vender-stage vender-stage--open vender-stage--no-collapse">

			<!-- Header informativo (sin toggle) -->
			<div class="vender-stage__header vender-stage__header--no-collapse">
				<span class="vender-stage__number">2</span>
				<div class="vender-stage__header-text">
					<span class="vender-stage__label">Artículos y servicios</span>
					<span class="vender-stage__sublabel">Buscar artículos, servicios, combos y promociones</span>
				</div>
			</div>

		<!-- Body siempre visible -->
		<div class="vender-stage__body vender-stage__body--always-open">

			<!-- Barra de contexto horizontal: total, cliente, método de pago y checklist -->
			<vender-context-bar></vender-context-bar>

			<!-- Buscadores de artículos -->
			<header-form></header-form>

				<!-- Indicador de ventas anteriores vinculadas -->
				<previus-sale-data></previus-sale-data>

				<!-- Tabla de artículos agregados -->
				<articles-table></articles-table>

			</div>
		</div><!-- /etapa 2 -->


		<!-- ══════════════════════════════════════════════════════════
		     ETAPA 3 — Cierre y opciones
		     Colapsada por defecto.
		     ══════════════════════════════════════════════════════════ -->
		<div
		class="vender-stage"
		:class="{ 'vender-stage--open': stage3_open }">

			<!-- Header de la etapa 3 -->
			<div
			class="vender-stage__header"
			@click="toggleStage3">
				<span class="vender-stage__number">3</span>
				<div class="vender-stage__header-text">
					<span class="vender-stage__label">Cierre y opciones</span>
					<span class="vender-stage__sublabel">AFIP, estado, empleado, descuentos y observaciones</span>
				</div>
				<i
				:class="stage3_open ? 'icon-up' : 'icon-down'"
				class="vender-stage__chevron"></i>
			</div>

			<!-- Body colapsable de la etapa 3 -->
			<transition name="stage-collapse">
				<div
				v-show="stage3_open"
				class="vender-stage__body">

					<!-- Punto de venta AFIP -->
					<div class="vender-stage__field">
						<afip-information></afip-information>
					</div>

					<!-- Estado de la venta -->
					<div class="vender-stage__field">
						<sale-status></sale-status>
					</div>

					<!-- Fecha de entrega -->
					<div class="vender-stage__field">
						<fecha-entrega></fecha-entrega>
					</div>

					<!-- Número de orden de compra -->
					<div class="vender-stage__field">
						<numero-orden-de-compra></numero-orden-de-compra>
					</div>

					<!-- Empleado y vendedor -->
					<div class="vender-stage__field">
						<employee></employee>
					</div>
					<div class="vender-stage__field">
						<seller></seller>
					</div>

					<!-- IVA aplicado y descuento de stock (solo si el usuario tiene permisos) -->
					<div
					v-if="show_iva_or_discount_stock_controls"
					class="vender-stage__field j-start">
						<iva-aplicado v-if="can_use_iva_aplicado"></iva-aplicado>
						<discount-stock v-if="can_use_discount_stock"></discount-stock>
					</div>

					<hr class="vender-stage__separator">

					<!-- Observaciones e internas -->
					<div class="vender-stage__field">
						<observations></observations>
					</div>

					<!-- Descuentos y recargos (antes en tab Cliente) -->
					<div class="vender-stage__field">
						<discounts></discounts>
					</div>
					<div class="vender-stage__field">
						<surchages></surchages>
					</div>

					<!-- Nota de crédito -->
					<div class="vender-stage__field">
						<nota-credito></nota-credito>
					</div>

				</div>
			</transition>
		</div><!-- /etapa 3 -->

	</div>
</template>

<script>
/* Componentes de Etapa 1 */
import HeaderForm from '@/components/vender/components/remito/header-form/Index.vue'
import PreviusSaleData from '@/components/vender/components/remito/PreviusSaleData.vue'
import ArticlesTable from '@/components/vender/components/remito/ArticlesTable.vue'

/* Componentes de Etapa 3 */
import Observations from '@/components/vender/components/remito/Observations'

/* Componentes de tab Cliente (ahora en Etapa 3) */
import Discounts from '@/components/vender/components/client/Discounts'
import Surchages from '@/components/vender/components/client/Surchages'
import NotaCredito from '@/components/vender/components/client/NotaCredito'

/* Componentes de Etapa 1 (lado cliente) */
import SelectClient from '@/components/vender/components/client/SelectClient'
import AlertarPersonalizado from '@/components/vender/components/client/AlertarPersonalizado'
import OmitirEnCuentaCorriente from '@/components/vender/components/client/OmitirEnCuentaCorriente'
import GuardarComoPresupuesto from '@/components/vender/components/client/GuardarComoPresupuesto'

export default {
	name: 'VenderStages',
	components: {
		/* Etapa 1 */
		SelectAddress: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Address'),
		PriceTypeSelector: () => import('@/components/vender/components/remito/total-previus-sales/price-type/Index'),
		PaymentMethod: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/PaymentMethod'),
		Caja: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Caja'),
		SaleType: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/SaleType'),
		SelectClient,
		AlertarPersonalizado,
		OmitirEnCuentaCorriente,
		GuardarComoPresupuesto,

		/* Etapa 2 */
		VenderContextBar: () => import('@/components/vender/components/VenderContextBar'),
		HeaderForm,
		PreviusSaleData,
		ArticlesTable,

		/* Etapa 3 */
		AfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/Index'),
		SaleStatus: () => import('@/components/vender/components/remito/header-2/buttons/SaleStatus'),
		FechaEntrega: () => import('@/components/vender/components/remito/header-2/buttons/FechaEntrega'),
		NumeroOrdenDeCompra: () => import('@/components/vender/components/remito/header-2/buttons/NumeroOrdenDeCompra'),
		Employee: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Employee'),
		Seller: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Seller'),
		IvaAplicado: () => import('@/components/vender/components/remito/header-2/buttons/IvaAplicado'),
		DiscountStock: () => import('@/components/vender/components/remito/header-2/buttons/DiscountStock'),
		Observations,
		Discounts,
		Surchages,
		NotaCredito,
	},
	data() {
		return {
			/* Etapa 1: abierta si no hay datos previos; se calcula en created() */
			stage1_open: true,

			/* Etapa 3: siempre colapsada por defecto */
			stage3_open: false,
		}
	},
	created() {
		/* Colapsar etapa 1 si ya hay datos de configuración seleccionados (ej: venta previa) */
		const has_config_data = !!(
			this.$store.state.vender.payment_method_id
			|| this.$store.state.vender.address_id
			|| this.$store.state.vender.client
		)
		this.stage1_open = !has_config_data
	},
	mounted() {
		/*
		 * Escuchar el evento global de expansión de etapa 1.
		 * Emitido por keyboard_shortcuts.js (F3, F5) y VenderSummaryBar (chips con lápiz).
		 */
		this.$root.$on('vender:expand-stage1', this.onExpandStage1)
	},
	beforeDestroy() {
		this.$root.$off('vender:expand-stage1', this.onExpandStage1)
	},
	computed: {
		/**
		 * Ocultar ambos controles si la extensión lo indica.
		 *
		 * @returns {boolean}
		 */
		hide_iva_and_discount_stock_in_vender() {
			return this.hasExtencion('hide_iva_and_discount_stock_in_vender')
		},

		/**
		 * Permiso para usar el checkbox "Precios con IVA".
		 *
		 * @returns {boolean}
		 */
		can_use_iva_aplicado() {
			return !this.hide_iva_and_discount_stock_in_vender
				&& this.can('vender.iva_aplicado')
		},

		/**
		 * Permiso para usar el checkbox "Descontar stock".
		 *
		 * @returns {boolean}
		 */
		can_use_discount_stock() {
			return !this.hide_iva_and_discount_stock_in_vender
				&& this.can('vender.discount_stock')
		},

		/**
		 * Muestra el contenedor de IVA/stock si al menos uno está habilitado.
		 *
		 * @returns {boolean}
		 */
		show_iva_or_discount_stock_controls() {
			return this.can_use_iva_aplicado || this.can_use_discount_stock
		},
	},
	methods: {
		/**
		 * Alterna el estado abierto/cerrado de la Etapa 1.
		 */
		toggleStage1() {
			this.stage1_open = !this.stage1_open
		},

		/**
		 * Alterna el estado abierto/cerrado de la Etapa 3.
		 */
		toggleStage3() {
			this.stage3_open = !this.stage3_open
		},

		/**
		 * Abre la Etapa 1 y hace scroll + foco al campo indicado.
		 * Escucha el evento `vender:expand-stage1` emitido por keyboard_shortcuts y VenderSummaryBar.
		 *
		 * @param {string} field - Campo a enfocar ('payment_method', 'client', 'address', 'price_type')
		 */
		onExpandStage1(field) {
			/* Abrir la etapa si estaba cerrada */
			this.stage1_open = true

			/* Después de que Vue renderice el body, hacer scroll al campo */
			this.$nextTick(() => {
				/* Mapeo de campo → ref del contenedor */
				const ref_map = {
					payment_method: 'field_payment_method',
					client: 'field_client',
					address: 'field_address',
					price_type: 'field_price_type',
				}
				const ref_name = ref_map[field]
				if (ref_name && this.$refs[ref_name]) {
					this.$refs[ref_name].scrollIntoView({ behavior: 'smooth', block: 'start' })

					/* Intentar enfocar el primer input dentro del contenedor */
					const input = this.$refs[ref_name].querySelector('input, select')
					if (input) {
						input.focus()
					}
				}
			})
		},
	},
}
</script>

<style scoped lang="sass">
/* Contenedor de todas las etapas del wizard */
.vender-stages
	height: 100%
	overflow-y: auto
	padding: 8px
	/* Espacio inferior para no quedar tapado por la barra de acciones fija */
	padding-bottom: 56px

/* Bloque de una etapa individual */
.vender-stage
	border: 1px solid var(--color-border-tertiary, #dee2e6)
	border-radius: 6px
	margin-bottom: 8px
	overflow: hidden
	background: var(--bg-card, #fff)

	/* Estado abierto: resalta el borde superior */
	&--open > .vender-stage__header
		border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)

/* Header de etapa: número + textos + chevron */
.vender-stage__header
	display: flex
	align-items: center
	gap: 10px
	padding: 10px 14px
	cursor: pointer
	user-select: none
	background: var(--bg-section, #f8f9fa)
	transition: background 0.15s

	&:hover
		background: var(--bg-hover, #e9ecef)

	/* Header de etapa 2 (no colapsable): sin pointer */
	&--no-collapse
		cursor: default
		&:hover
			background: var(--bg-section, #f8f9fa)

/* Número de etapa en círculo */
.vender-stage__number
	display: inline-flex
	align-items: center
	justify-content: center
	width: 24px
	height: 24px
	border-radius: 50%
	background: var(--color-primary, #007bff)
	color: #fff
	font-size: 0.75rem
	font-weight: 700
	flex-shrink: 0

/* Contenedor de label y sublabel */
.vender-stage__header-text
	flex: 1
	display: flex
	flex-direction: column

/* Título principal de la etapa */
.vender-stage__label
	font-weight: 600
	font-size: 0.88rem
	color: var(--color-text-primary, #212529)

/* Subtítulo descriptivo de la etapa */
.vender-stage__sublabel
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)
	margin-top: 1px

/* Ícono de chevron para indicar estado abierto/cerrado */
.vender-stage__chevron
	color: var(--color-text-secondary, #6c757d)
	font-size: 0.8rem
	flex-shrink: 0

/* Body de la etapa con padding */
.vender-stage__body
	padding: 12px 14px

	/* Body de etapa 2: sin padding extra */
	&--always-open
		padding: 8px 14px

/* Contenedor de un campo individual dentro de la etapa */
.vender-stage__field
	margin-bottom: 10px

	&:last-child
		margin-bottom: 0

/* Hint informativo dentro de la etapa */
.vender-stage__field-hint
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
	margin-bottom: 6px
	display: flex
	align-items: center
	gap: 4px

/* Separador visual dentro del body */
.vender-stage__separator
	margin: 12px 0
	border-color: var(--color-border-tertiary, #dee2e6)

/* Animación de colapso/expansión */
.stage-collapse-enter-active,
.stage-collapse-leave-active
	transition: opacity 0.2s ease, max-height 0.25s ease
	max-height: 2000px
	overflow: hidden

.stage-collapse-enter,
.stage-collapse-leave-to
	opacity: 0
	max-height: 0
</style>
