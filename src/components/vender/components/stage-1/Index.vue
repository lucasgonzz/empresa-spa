<template>
	<!--
		Etapa 1 — Configuración inicial.
		Arranca abierta en ventas nuevas y colapsada si ya hay datos.
		Index: orquesta el layout y el comportamiento de colapso;
		la lógica de cada campo vive en su propio subcomponente.
	-->
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
				<span class="vender-stage__sublabel">Sucursal, método de pago, lista de precios, cliente y AFIP</span>
			</div>
			<i
			:class="stage1_open ? 'icon-up' : 'icon-down'"
			class="vender-stage__chevron"></i>
		</div>

		<!-- Body colapsable — layout en grilla responsive -->
		<transition name="stage-collapse">
			<div
			v-show="stage1_open"
			class="vender-stage__body vender-stage__body--grid">

				<!-- Afip Punto de venta -->
				<div class="vender-stage__field">
					<afip-information></afip-information>
				</div>

				<!-- Método de pago -->
				<div ref="field_payment_method" class="vender-stage__field">
					<payment-method></payment-method>
				</div>

				<!-- Caja (se autocompleta según el método de pago) -->
				<div class="vender-stage__field">
					<caja></caja>
				</div>

				<!-- Sucursal — ayuda en append del input-group (show-help) -->
				<div ref="field_address" class="vender-stage__field">
					<select-address show-help></select-address>
				</div>

				<!-- Lista de precios -->
				<div ref="field_price_type" class="vender-stage__field">
					<price-type-selector></price-type-selector>
				</div>

				<!-- Tipo de venta -->
				<div class="vender-stage__field">
					<sale-type></sale-type>
				</div>

				<!-- Separador visual antes de los campos de cliente -->
				<hr class="vender-stage__separator" style="grid-column: 1 / -1">

				<!-- Cliente e información AFIP — misma fila -->
				<div class="vender-stage__field vender-stage__field--full vender-stage__field--row">
					<div ref="field_client" class="vender-stage__field-row-item">
						<select-client></select-client>
					</div>
					<div class="vender-stage__field-row-item">
						<guardar-como-presupuesto></guardar-como-presupuesto>
						<omitir-en-cuenta-corriente></omitir-en-cuenta-corriente>
					</div>
					<div class="vender-stage__field-row-item">
						<alertar-personalizado></alertar-personalizado>
					</div>
				</div>

				<!-- Opciones del cliente — columna alerta + columna checkboxes -->
				<div class="vender-stage__field vender-stage__field--full vender-stage__client-options">
					<!-- <div class="vender-stage__client-options-col vender-stage__client-options-col--stack">
						<guardar-como-presupuesto></guardar-como-presupuesto>
						<omitir-en-cuenta-corriente></omitir-en-cuenta-corriente>
					</div> -->
					<!-- <div class="vender-stage__client-options-col">
						<alertar-personalizado></alertar-personalizado>
					</div> -->
				</div>

			</div>
		</transition>
	</div>
</template>

<script>
/* Subcomponentes propios de la etapa 1 */
import SelectClient from './SelectClient'
import AlertarPersonalizado from './AlertarPersonalizado'
import OmitirEnCuentaCorriente from './OmitirEnCuentaCorriente'
import GuardarComoPresupuesto from './GuardarComoPresupuesto'

export default {
	name: 'VenderStage1',
	components: {
		/* Campos de configuración — cargados de forma lazy */
		SelectAddress: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Address'),
		PriceTypeSelector: () => import('@/components/vender/components/remito/total-previus-sales/price-type/Index'),
		PaymentMethod: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/PaymentMethod'),
		Caja: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Caja'),
		SaleType: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/SaleType'),
		AfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/Index'),
		/* Subcomponentes del cliente */
		SelectClient,
		AlertarPersonalizado,
		OmitirEnCuentaCorriente,
		GuardarComoPresupuesto,
	},
	data() {
		return {
			/* Estado de colapso: abierta si no hay datos previos (se calcula en created) */
			stage1_open: true,
		}
	},
	created() {
		/* Colapsar si ya hay datos de configuración seleccionados (ej: venta previa) */
		const has_config_data = !!(
			this.$store.state.vender.payment_method_id
			|| this.$store.state.vender.address_id
			|| this.$store.state.vender.client
		)
		this.stage1_open = !has_config_data
	},
	mounted() {
		/*
		 * Escuchar el evento global de expansión.
		 * Emitido por keyboard_shortcuts.js (F3, F5) y VenderStage1SummaryBar (chips con lápiz).
		 */
		this.$root.$on('vender:expand-stage1', this.onExpandStage1)
	},
	beforeDestroy() {
		this.$root.$off('vender:expand-stage1', this.onExpandStage1)
	},
	methods: {
		/**
		 * Alterna el estado abierto/cerrado de la etapa.
		 */
		toggleStage1() {
			this.stage1_open = !this.stage1_open
		},

		/**
		 * Abre la etapa y hace scroll + foco al campo indicado.
		 * Escucha el evento `vender:expand-stage1`.
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
