<template>
	<!-- Estado de Resultados devengado: cascada vertical (tarea 02), no grilla de tarjetas sueltas -->
	<div
	v-if="view == 'estado-de-resultados'"
	class="cascada-resultados m-t-20 p-b-100">

		<div
		v-if="loading"
		class="all-center p-t-30 p-b-30">
			<b-spinner variant="primary"></b-spinner>
		</div>

		<div
		v-else
		class="cascada-card">

			<!-- Ventas brutas -->
			<div
			class="cascada-renglon apretable"
			@click="abrirDetalle('ventas_brutas')">
				<span class="cascada-renglon__label">Ventas brutas</span>
				<span class="cascada-renglon__monto">{{ formatear(model.ventas_brutas) }}</span>
			</div>

			<!-- Devoluciones: resta, tono suave -->
			<div
			class="cascada-renglon cascada-renglon--resta apretable"
			@click="abrirDetalle('devoluciones')">
				<span class="cascada-renglon__label">(–) Devoluciones</span>
				<span class="cascada-renglon__monto">{{ formatear(model.devoluciones) }}</span>
			</div>

			<!-- Ventas netas: subtotal destacado -->
			<div class="cascada-renglon cascada-renglon--subtotal">
				<span class="cascada-renglon__label">Ventas netas</span>
				<span class="cascada-renglon__monto">{{ formatear(model.ventas_netas) }}</span>
			</div>

			<!-- Costo de mercaderia vendida: resta -->
			<div
			class="cascada-renglon cascada-renglon--resta apretable"
			@click="abrirDetalle('costo_mercaderia_vendida')">
				<span class="cascada-renglon__label">(–) Costo de mercadería vendida</span>
				<span class="cascada-renglon__monto">{{ formatear(model.costo_mercaderia_vendida) }}</span>
			</div>

			<!-- Costo de mercaderia devuelta: se resta del costo de mercaderia vendida, solo se muestra si hay algo -->
			<div
			v-if="model.costo_mercaderia_devuelta"
			class="cascada-renglon cascada-renglon--resta">
				<span class="cascada-renglon__label">(+) Costo de mercadería devuelta</span>
				<span class="cascada-renglon__monto">{{ formatear(model.costo_mercaderia_devuelta) }}</span>
			</div>

			<!-- Resultado bruto: subtotal destacado, con margen al lado -->
			<div class="cascada-renglon cascada-renglon--subtotal">
				<span class="cascada-renglon__label">
					Resultado bruto
					<span class="cascada-renglon__margen">({{ margen(model.margen_bruto_porcentaje) }})</span>
				</span>
				<span class="cascada-renglon__monto">{{ formatear(model.resultado_bruto) }}</span>
			</div>

			<!-- Gastos operativos: resta, con desglose por categoria en tono suave debajo -->
			<div
			class="cascada-renglon cascada-renglon--resta apretable"
			@click="abrirDetalle('gastos')">
				<span class="cascada-renglon__label">(–) Gastos operativos</span>
				<span class="cascada-renglon__monto">{{ formatear(model.gastos_operativos) }}</span>
			</div>
			<div
			v-if="model.gastos_por_categoria && model.gastos_por_categoria.length"
			class="cascada-desglose">
				<div
				v-for="categoria in model.gastos_por_categoria"
				:key="categoria.expense_concept_id"
				class="cascada-desglose__item">
					<span>{{ categoria.concepto }}</span>
					<span>{{ formatear(categoria.total) }}</span>
				</div>
			</div>

			<!-- Resultado operativo: subtotal destacado -->
			<div class="cascada-renglon cascada-renglon--subtotal">
				<span class="cascada-renglon__label">Resultado operativo</span>
				<span class="cascada-renglon__monto">{{ formatear(model.resultado_operativo) }}</span>
			</div>

			<!-- Comisiones de cobro: resta, no tiene concepto propio en la whitelist de detalle -->
			<div class="cascada-renglon cascada-renglon--resta">
				<span class="cascada-renglon__label">(–) Comisiones de cobro</span>
				<span class="cascada-renglon__monto">{{ formatear(model.comisiones_de_cobro) }}</span>
			</div>

			<!-- IIBB determinado: solo aplica cuando la moneda no es dolares (backend manda null en ese caso) -->
			<div class="cascada-renglon cascada-renglon--resta">
				<span class="cascada-renglon__label">(–) IIBB determinado</span>
				<span class="cascada-renglon__monto">
					{{ model.iibb_determinado === null ? '—' : formatear(model.iibb_determinado) }}
				</span>
			</div>
			<p
			v-if="no_atribuible('iibb_determinado')"
			class="cascada-nota">
				No se calcula en dólares: IIBB se determina siempre sobre el total en pesos.
			</p>

			<!-- Resultado neto: subtotal final, el mas destacado -->
			<div class="cascada-renglon cascada-renglon--subtotal cascada-renglon--final">
				<span class="cascada-renglon__label">
					Resultado neto
					<span class="cascada-renglon__margen">({{ margen(model.margen_neto_porcentaje) }})</span>
				</span>
				<span class="cascada-renglon__monto">{{ formatear(model.resultado_neto) }}</span>
			</div>

		</div>
	</div>
</template>
<script>
import detalle_drilldown from '@/mixins/reportes/detalle_drilldown'

export default {
	mixins: [detalle_drilldown],
	created() {
		this.$store.dispatch('reportes/getEstadoResultados')
	},
	computed: {
		model() {
			return this.$store.state.reportes.estado_resultados
		},
		loading() {
			return this.$store.state.reportes.estado_resultados_loading
		},
	},
	methods: {
		/* Formatea un monto en la moneda del reporte; sin decimales salvo que no sean ",00" (mismo criterio que IconCards) */
		formatear(valor) {
			return this.price(valor, false, false)
		},
		/**
		 * Los margenes porcentuales nunca se muestran como "0%" cuando vienen null (tarea 02):
		 * el backend manda null cuando ventas_netas es 0 (division por cero evitada), y eso se
		 * distingue de un margen real de 0%.
		 *
		 * @param {Number|null} valor
		 * @returns {String}
		 */
		margen(valor) {
			if (valor === null || typeof valor == 'undefined') {
				return '—'
			}
			return Math.round(valor * 100) / 100 + '%'
		},
		/* true si el backend marco esta linea como no atribuible a la moneda actual (ej. iibb_determinado en dolares) */
		no_atribuible(campo) {
			return !!(this.model.lineas_no_atribuibles_a_moneda && this.model.lineas_no_atribuibles_a_moneda.indexOf(campo) !== -1)
		},
	},
}
</script>
<style lang="sass">
.cascada-resultados
	.cascada-card
		background: #fff
		border: 1px solid #e2e8f0
		border-radius: 12px
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		padding: 8px 24px
		max-width: 720px
		margin: 0 auto

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

		&--resta
			color: #94a3b8
			font-size: 0.88rem

		&--subtotal
			font-weight: 700
			font-size: 1.05rem
			color: #0f172a
			border-top: 2px solid #e2e8f0
			border-bottom: 2px solid #e2e8f0

		&--final
			font-size: 1.2rem
			color: #059669

		&__margen
			font-weight: 500
			font-size: 0.8rem
			color: #64748b
			margin-left: 6px

	.cascada-desglose
		padding: 0 0 10px 18px

		&__item
			display: flex
			justify-content: space-between
			font-size: 0.8rem
			color: #94a3b8
			padding: 4px 0

	.cascada-nota
		font-size: 0.78rem
		color: #94a3b8
		font-style: italic
		margin: 0 0 10px
</style>
