<template>
	<!--
		Cabecera del modal «Nuevo plan de pago»: qué venta se está financiando y cuánto falta saldar.
		Los tres importes salen de GET payment-plan/saldo-de-venta/{id}; mientras carga se muestra
		el total que ya trae la venta de la lista.
	-->
	<div
	v-if="sale"
	class="plan-resumen-venta"
	data-testid="plan-resumen-venta">

		<div class="plan-resumen-venta__encabezado">
			<div class="plan-resumen-venta__venta">
				<span class="plan-resumen-venta__numero">Venta N° {{ sale.num }}</span>
				<span
				v-if="sale.client"
				class="plan-resumen-venta__cliente">
					{{ sale.client.name }}
				</span>
			</div>

			<span
			class="plan-resumen-venta__moneda"
			:class="{ 'plan-resumen-venta__moneda--usd': moneda_id == 2 }"
			data-testid="plan-moneda">
				{{ moneda_id == 2 ? 'En dólares' : 'En pesos' }}
			</span>
		</div>

		<div class="plan-resumen-venta__cifras">
			<div class="plan-resumen-venta__cifra">
				<span class="plan-resumen-venta__rotulo">Total de la venta</span>
				<span class="plan-resumen-venta__valor">{{ formatear(saldo ? saldo.total : sale.total) }}</span>
			</div>

			<!--
				Una venta que no está en la cuenta corriente (cobrada en el momento, o con la cuenta
				omitida) no tiene de dónde leer lo pagado: decir "Pagado $0 / Falta saldar = total"
				sería falso. Se dice eso en vez de inventar las dos cifras.
			-->
			<div
			v-if="fuera_de_la_cuenta"
			class="plan-resumen-venta__cifra plan-resumen-venta__cifra--doble"
			data-testid="plan-fuera-de-la-cuenta">
				<span class="plan-resumen-venta__rotulo">Cuenta corriente</span>
				<span class="plan-resumen-venta__texto">La venta no está en la cuenta corriente del cliente</span>
			</div>

			<template v-else>
			<div class="plan-resumen-venta__cifra">
				<span class="plan-resumen-venta__rotulo">Pagado</span>
				<span class="plan-resumen-venta__valor">
					<b-spinner
					v-if="cargando"
					small></b-spinner>
					<template v-else>{{ saldo ? formatear(saldo.pagado) : '-' }}</template>
				</span>
			</div>

			<div class="plan-resumen-venta__cifra plan-resumen-venta__cifra--destacada">
				<span class="plan-resumen-venta__rotulo">Falta saldar</span>
				<span
				class="plan-resumen-venta__valor"
				data-testid="plan-falta-saldar">
					<b-spinner
					v-if="cargando"
					small></b-spinner>
					<template v-else>{{ saldo ? formatear(saldo.saldo_pendiente) : '-' }}</template>
				</span>
			</div>
			</template>
		</div>
	</div>
</template>
<script>
import { con_moneda } from '@/components/common/payment-plan/cuotas_del_plan'

export default {
	props: {
		/* La venta del store (store.sale.model). */
		sale: Object,
		/* Respuesta de payment-plan/saldo-de-venta, o null. */
		saldo: Object,
		cargando: Boolean,
		/* 1 pesos, 2 dólares. */
		moneda_id: Number,
	},
	computed: {
		/* La API ya contestó y la venta no tiene débito en la cuenta corriente. */
		fuera_de_la_cuenta() {
			return !!this.saldo && !this.saldo.en_cuenta_corriente
		},
	},
	methods: {
		/**
		 * Importe con el símbolo de la moneda de la venta.
		 *
		 * @param {Number} importe
		 * @returns {String}
		 */
		formatear(importe) {
			return con_moneda(this.price(Number(importe)), this.moneda_id)
		},
	},
}
</script>
<style lang="sass">
.plan-resumen-venta
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 10px
	background: var(--bg-section, #f8f9fa)
	padding: 14px 16px
	margin-bottom: 20px

	&__encabezado
		display: flex
		align-items: center
		justify-content: space-between
		gap: 10px
		margin-bottom: 12px

	&__venta
		display: flex
		flex-direction: column
		min-width: 0

	&__numero
		font-weight: 600
		color: var(--color-text-primary, #212529)

	&__cliente
		font-size: 0.85rem
		color: var(--color-text-secondary, #6c757d)
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	&__moneda
		flex: 0 0 auto
		font-size: 0.75rem
		font-weight: 600
		padding: 3px 10px
		border-radius: 999px
		border: 1px solid var(--color-border, #dee2e6)
		color: var(--color-text-secondary, #6c757d)

		&--usd
			border-color: rgba(40, 167, 69, 0.45)
			color: var(--color-text-success-strong, #1e7e34)
			background: rgba(40, 167, 69, 0.08)

	&__cifras
		display: grid
		grid-template-columns: repeat(3, minmax(0, 1fr))
		gap: 10px

		@media screen and (max-width: 576px)
			grid-template-columns: minmax(0, 1fr)

	&__cifra
		display: flex
		flex-direction: column
		padding: 10px 12px
		border-radius: 8px
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border-secondary, #e9ecef)

		@media screen and (max-width: 576px)
			flex-direction: row
			align-items: baseline
			justify-content: space-between

		// Ocupa el lugar de "Pagado" y "Falta saldar" juntos.
		&--doble
			grid-column: span 2

			@media screen and (max-width: 576px)
				grid-column: auto
				flex-direction: column
				align-items: flex-start

		&--destacada
			border-color: var(--color-primary, #007bff)

			.plan-resumen-venta__valor
				color: var(--color-primary, #007bff)

	&__rotulo
		font-size: 0.75rem
		color: var(--color-text-secondary, #6c757d)

	&__texto
		font-size: 0.9rem
		font-weight: 500
		color: var(--color-text-secondary, #6c757d)
		margin-top: 2px

	&__valor
		font-size: 1.1rem
		font-weight: 600
		color: var(--color-text-primary, #212529)
		font-variant-numeric: tabular-nums
</style>
