<template>
	<!--
		Etapa 3 — Cierre y opciones.
		Colapsada por defecto.
		Index: orquesta el layout y el colapso; la lógica vive en cada subcomponente.
	-->
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
				<span class="vender-stage__sublabel">Estado, empleado, descuentos y observaciones</span>
			</div>
			<i
			:class="stage3_open ? 'icon-up' : 'icon-down'"
			class="vender-stage__chevron"></i>
		</div>

		<!-- Body colapsable — layout en grilla responsive -->
		<transition name="stage-collapse">
			<div
			v-show="stage3_open"
			class="vender-stage__body vender-stage__body--grid">

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

				<!-- IVA aplicado y descuento de stock (lógica de permisos en IvaYStock) -->
				<div class="vender-stage__field vender-stage__field--full">
					<iva-y-stock></iva-y-stock>
				</div>

				<!-- Separador visual -->
				<hr class="vender-stage__separator">

				<!-- Observaciones — ocupa toda la fila -->
				<div class="vender-stage__field vender-stage__field--full">
					<observations></observations>
				</div>

				<!-- Descuentos y recargos — dos columnas en pantallas anchas -->
				<div class="vender-stage__field vender-stage__field--full vender-stage__client-panels">
					<discounts></discounts>
					<surchages></surchages>
				</div>

				<!-- Nota de crédito — ocupa toda la fila -->
				<div class="vender-stage__field vender-stage__field--full">
					<nota-credito></nota-credito>
				</div>

			</div>
		</transition>
	</div>
</template>

<script>
import Observations from '@/components/vender/components/remito/Observations'
/* Subcomponentes propios de la etapa 3 */
import IvaYStock from './IvaYStock'
import Discounts from './Discounts'
import Surchages from './Surchages'
import NotaCredito from './NotaCredito'

export default {
	name: 'VenderStage3',
	components: {
		SaleStatus: () => import('@/components/vender/components/remito/header-2/buttons/SaleStatus'),
		FechaEntrega: () => import('@/components/vender/components/remito/header-2/buttons/FechaEntrega'),
		NumeroOrdenDeCompra: () => import('@/components/vender/components/remito/header-2/buttons/NumeroOrdenDeCompra'),
		Employee: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Employee'),
		Seller: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Seller'),
		Observations,
		IvaYStock,
		Discounts,
		Surchages,
		NotaCredito,
	},
	data() {
		return {
			/* Estado de colapso: cerrada por defecto */
			stage3_open: false,
		}
	},
	methods: {
		/**
		 * Alterna el estado abierto/cerrado de la etapa.
		 */
		toggleStage3() {
			this.stage3_open = !this.stage3_open
		},
	},
}
</script>
