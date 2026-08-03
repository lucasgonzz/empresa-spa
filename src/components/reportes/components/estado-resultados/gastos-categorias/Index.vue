<template>
	<div class="gastos-categorias">
		<div class="gastos-categorias__grafico">
			<chart :styles="chart_styles"></chart>
		</div>

		<div class="gastos-categorias__leyenda">
			<span
			v-for="categoria in categorias"
			:key="categoria.expense_concept_id"
			class="gastos-categorias__item">
				<span
				class="gastos-categorias__punto"
				:style="{backgroundColor: categoria.color}"></span>
				<span class="gastos-categorias__nombre">{{ categoria.concepto }}</span>
				<span class="gastos-categorias__monto">{{ formatear(categoria.total) }} ({{ categoria.porcentaje }}%)</span>
			</span>
		</div>
	</div>
</template>
<script>
import chart_theme from '@/mixins/reportes/chart_theme'

// Mismo corte que Chart.vue: a partir de la categoria 8 se agrupa el resto en "Otros".
const MAX_CATEGORIAS = 8

export default {
	mixins: [chart_theme],
	components: {
		Chart: () => import('@/components/reportes/components/estado-resultados/gastos-categorias/Chart'),
	},
	data() {
		return {
			// Mismo motivo que en composicion/Index.vue: sin este prop el canvas de
			// vue-chartjs queda con el alto default de Chart.js (400px), no con el de su
			// contenedor visual.
			chart_styles: {height: '180px', position: 'relative'},
		}
	},
	computed: {
		model() {
			return this.$store.state.reportes.estado_resultados
		},
		/**
		 * Mismo agrupamiento "Otros" que Chart.vue (mismo MAX_CATEGORIAS, mismo orden de
		 * mayor a menor), para que la leyenda liste exactamente los gajos que se dibujan,
		 * con su color y porcentaje sobre el total de gastos operativos.
		 */
		categorias() {
			if (!this.model || !this.model.gastos_por_categoria) {
				return []
			}

			let categorias = this.model.gastos_por_categoria.filter(categoria => categoria.total > 0)

			categorias.sort((a, b) => b.total - a.total)

			let agrupadas = categorias

			if (categorias.length > MAX_CATEGORIAS) {
				let principales = categorias.slice(0, MAX_CATEGORIAS - 1)
				let resto = categorias.slice(MAX_CATEGORIAS - 1)
				let total_otros = 0

				resto.forEach(categoria => {
					total_otros += categoria.total
				})

				principales.push({expense_concept_id: 'otros', concepto: 'Otros', total: total_otros})
				agrupadas = principales
			}

			let colores = this.get_chart_colors(agrupadas.length)
			let total_gastos = this.model.gastos_operativos

			agrupadas.forEach((categoria, indice) => {
				categoria.color = colores[indice]
				categoria.porcentaje = (Math.round(Math.abs(categoria.total) / total_gastos * 1000) / 10).toFixed(1)
			})

			return agrupadas
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
.gastos-categorias
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 16px
	margin: 4px 0 10px 18px

	&__grafico
		width: 180px
		height: 180px
		flex-shrink: 0

	&__leyenda
		display: flex
		flex-direction: column
		gap: 6px
		flex: 1
		min-width: 180px

	&__item
		display: flex
		align-items: center
		font-size: 0.8rem
		color: #94a3b8

	&__punto
		display: inline-block
		width: 8px
		height: 8px
		border-radius: 50%
		margin-right: 6px
		flex-shrink: 0

	&__nombre
		margin-right: 8px

	&__monto
		margin-left: auto
		white-space: nowrap
</style>
