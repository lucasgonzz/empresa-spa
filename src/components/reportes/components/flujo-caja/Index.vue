<template>
	<!-- Flujo de Caja percibido: ingresos, egresos y flujo neto, con desglose por caja/metodo (tarea 03) -->
	<div
	v-if="view == 'flujo-de-caja'"
	class="flujo-caja m-t-20 p-b-100">

		<div
		v-if="loading"
		class="all-center p-t-30 p-b-30">
			<b-spinner variant="primary"></b-spinner>
		</div>

		<template v-else>
			<div class="cascada-card">

				<h6 class="cascada-card__titulo">Ingresos</h6>

				<div class="cascada-renglon">
					<span class="cascada-renglon__label">Cobros en mostrador</span>
					<span class="cascada-renglon__monto">{{ formatear(model.cobros_mostrador) }}</span>
				</div>
				<div class="cascada-renglon">
					<span class="cascada-renglon__label">Cobranzas de cuenta corriente</span>
					<span class="cascada-renglon__monto">{{ formatear(model.cobranzas_cuenta_corriente) }}</span>
				</div>
				<div
				class="cascada-renglon cascada-renglon--subtotal apretable"
				@click="abrirDetalle('cobranzas')">
					<span class="cascada-renglon__label">Total ingresos</span>
					<span class="cascada-renglon__monto">{{ formatear(model.total_ingresos) }}</span>
				</div>

				<div
				v-if="model.ingresos_por_caja_metodo && model.ingresos_por_caja_metodo.length"
				class="cascada-desglose">
					<p class="cascada-desglose__titulo">Desglose por caja / método</p>
					<div
					v-for="(fila, i) in model.ingresos_por_caja_metodo"
					:key="'ingreso-'+i"
					class="cascada-desglose__item">
						<span>Caja #{{ fila.caja_id }} · método #{{ fila.current_acount_payment_method_id }}</span>
						<span>{{ formatear(fila.total) }}</span>
					</div>
				</div>
			</div>

			<div class="cascada-card m-t-20">

				<h6 class="cascada-card__titulo">Egresos</h6>

				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('pagos_proveedores')">
					<span class="cascada-renglon__label">Pagos a proveedores</span>
					<span class="cascada-renglon__monto">{{ formatear(model.pagos_a_proveedores) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('gastos')">
					<span class="cascada-renglon__label">Gastos pagados</span>
					<span class="cascada-renglon__monto">{{ formatear(model.gastos_pagados) }}</span>
				</div>
				<div
				v-if="model.gastos_pagados_por_categoria && model.gastos_pagados_por_categoria.length"
				class="cascada-desglose">
					<div
					v-for="categoria in model.gastos_pagados_por_categoria"
					:key="categoria.expense_concept_id"
					class="cascada-desglose__item">
						<span>{{ categoria.concepto }}</span>
						<span>{{ formatear(categoria.total) }}</span>
					</div>
				</div>

				<div class="cascada-renglon cascada-renglon--subtotal">
					<span class="cascada-renglon__label">Total egresos</span>
					<span class="cascada-renglon__monto">{{ formatear(model.total_egresos) }}</span>
				</div>

				<div
				v-if="model.egresos_por_caja_metodo && model.egresos_por_caja_metodo.length"
				class="cascada-desglose">
					<p class="cascada-desglose__titulo">Desglose por caja / método</p>
					<div
					v-for="(fila, i) in model.egresos_por_caja_metodo"
					:key="'egreso-'+i"
					class="cascada-desglose__item">
						<span>Caja #{{ fila.caja_id }} · método #{{ fila.current_acount_payment_method_id }}</span>
						<span>{{ formatear(fila.total) }}</span>
					</div>
				</div>
			</div>

			<div class="cascada-card m-t-20">
				<div class="cascada-renglon cascada-renglon--subtotal cascada-renglon--final">
					<span class="cascada-renglon__label">Flujo neto del período</span>
					<span class="cascada-renglon__monto">{{ formatear(model.flujo_neto) }}</span>
				</div>
			</div>

			<!-- Plata en transito: bloque separado, no suma al flujo neto del periodo (tarea 03) -->
			<div
			v-if="model.plata_en_transito"
			class="cascada-card cascada-card--transito m-t-20">
				<h6 class="cascada-card__titulo">Todavía no lo tenés, pero está en camino</h6>
				<p class="cascada-nota">
					Este monto no forma parte del flujo neto del período: son cobros que todavía no impactaron en la caja.
				</p>

				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('liquidaciones_pendientes')">
					<span class="cascada-renglon__label">Liquidaciones pendientes</span>
					<span class="cascada-renglon__monto">{{ formatear(total_liquidaciones_pendientes) }}</span>
				</div>
				<div
				class="cascada-renglon apretable"
				@click="abrirDetalle('cheques_en_cartera')">
					<span class="cascada-renglon__label">Cheques diferidos en cartera</span>
					<span class="cascada-renglon__monto">{{ formatear(total_cheques_diferidos) }}</span>
				</div>
				<div class="cascada-renglon cascada-renglon--subtotal">
					<span class="cascada-renglon__label">Total en camino</span>
					<span class="cascada-renglon__monto">{{ formatear(model.plata_en_transito.total_estimado) }}</span>
				</div>
			</div>
		</template>
	</div>
</template>
<script>
import detalle_drilldown from '@/mixins/reportes/detalle_drilldown'

export default {
	mixins: [detalle_drilldown],
	created() {
		this.$store.dispatch('reportes/getFlujoCaja')
	},
	computed: {
		model() {
			return this.$store.state.reportes.flujo_caja
		},
		loading() {
			return this.$store.state.reportes.flujo_caja_loading
		},
		/* Suma de las liquidaciones pendientes (plata en transito), para mostrar el mismo total que abre el drill-down */
		total_liquidaciones_pendientes() {
			if (!this.model.plata_en_transito || !this.model.plata_en_transito.liquidaciones_pendientes) {
				return 0
			}
			let total = 0
			this.model.plata_en_transito.liquidaciones_pendientes.forEach(fila => {
				total += Number(fila.total)
			})
			return total
		},
		/* Suma de los cheques diferidos en cartera (plata en transito) */
		total_cheques_diferidos() {
			if (!this.model.plata_en_transito || !this.model.plata_en_transito.cheques_diferidos) {
				return 0
			}
			let total = 0
			this.model.plata_en_transito.cheques_diferidos.forEach(fila => {
				total += Number(fila.total)
			})
			return total
		},
	},
	methods: {
		formatear(valor) {
			return this.price(valor, false, false)
		},
	},
}
</script>
<style lang="sass">
.flujo-caja
	.cascada-card
		background: #fff
		border: 1px solid #e2e8f0
		border-radius: 12px
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		padding: 8px 24px
		max-width: 720px
		margin: 0 auto

		&--transito
			background: #f8fafc
			border-style: dashed
			border-color: #cbd5e1

		&__titulo
			font-size: 0.95rem
			font-weight: 700
			color: #475569
			text-transform: uppercase
			letter-spacing: 0.04em
			padding: 14px 0 4px
			margin: 0

	.cascada-renglon
		display: flex
		justify-content: space-between
		align-items: baseline
		padding: 14px 0
		border-bottom: 1px solid #f1f5f9
		font-size: 0.95rem
		color: #0f172a

		&:last-child
			border-bottom: none

		&--subtotal
			font-weight: 700
			font-size: 1.05rem
			border-top: 2px solid #e2e8f0
			border-bottom: 2px solid #e2e8f0

		&--final
			font-size: 1.2rem
			color: #059669

	.cascada-desglose
		padding: 0 0 10px 18px

		&__titulo
			font-size: 0.75rem
			color: #64748b
			text-transform: uppercase
			letter-spacing: 0.04em
			margin: 6px 0 4px

		&__item
			display: flex
			justify-content: space-between
			font-size: 0.8rem
			color: #94a3b8
			padding: 4px 0

	.cascada-nota
		font-size: 0.82rem
		color: #64748b
		margin: 0 0 10px
</style>
