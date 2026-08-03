<template>
	<div
	v-if="mostrar"
	class="composicion">
		<p class="composicion__titulo">A dónde va cada peso vendido</p>

		<div class="composicion__barra">
			<chart></chart>
		</div>

		<div class="composicion__leyenda">
			<span
			v-for="segmento in segmentos"
			:key="segmento.label"
			class="composicion__item">
				<span
				class="composicion__punto"
				:style="{backgroundColor: segmento.color}"></span>
				{{ segmento.label }} {{ segmento.porcentaje }}%
			</span>
		</div>

		<p
		v-if="hay_perdida"
		class="composicion__perdida">
			El período cerró con una pérdida de {{ formatear(Math.abs(model.resultado_neto)) }}
		</p>
	</div>
</template>
<script>
export default {
	components: {
		Chart: () => import('@/components/reportes/components/estado-resultados/composicion/Chart'),
	},
	computed: {
		model() {
			return this.$store.state.reportes.estado_resultados
		},
		loading() {
			return this.$store.state.reportes.estado_resultados_loading
		},
		/* No se muestra ni el titulo ni la barra si no hay ventas netas o si todavia esta cargando (tarea 03) */
		mostrar() {
			return !this.loading && !!this.model && this.model.ventas_netas > 0
		},
		hay_perdida() {
			return this.mostrar && this.model.resultado_neto <= 0
		},
		/**
		 * Misma composicion de 5 segmentos que arma Chart.vue para dibujar la barra (identidad
		 * verificada en EstadoResultadosHelper), pero aca solo para la leyenda propia en HTML:
		 * nombre, color y porcentaje sobre ventas_netas de cada uno que efectivamente se dibuja.
		 * Si resultado_neto <= 0 no entra a la leyenda (tampoco se dibuja en la barra): esa
		 * perdida se comunica con la linea de composicion__perdida, no con un segmento rojo.
		 */
		segmentos() {
			if (!this.mostrar) {
				return []
			}

			let costo_neto_mercaderia = this.model.costo_mercaderia_vendida - (this.model.costo_mercaderia_devuelta || 0)
			let iibb = this.model.iibb_determinado === null ? 0 : this.model.iibb_determinado

			let candidatos = [
				{label: 'Mercadería', valor: costo_neto_mercaderia, color: '#64748B'},
				{label: 'Gastos', valor: this.model.gastos_operativos, color: '#94A3B8'},
				{label: 'Comisiones', valor: this.model.comisiones_de_cobro, color: '#CBD5E1'},
				{label: 'IIBB', valor: iibb, color: '#A5B4FC'},
			]

			let segmentos = candidatos.filter(candidato => candidato.valor > 0)

			if (this.model.resultado_neto > 0) {
				segmentos.push({label: 'Resultado', valor: this.model.resultado_neto, color: '#10B981'})
			}

			segmentos.forEach(segmento => {
				segmento.porcentaje = this.porcentaje(segmento.valor)
			})

			return segmentos
		},
	},
	methods: {
		formatear(valor) {
			return this.price(valor, false, false)
		},
		/* Mismo criterio que el porcentaje() del prompt 02 en estado-resultados/Index.vue: base ventas_netas, redondeo a un decimal, valor absoluto */
		porcentaje(valor) {
			return Math.round(Math.abs(valor) / this.model.ventas_netas * 1000) / 10
		},
	},
}
</script>
<style lang="sass">
.composicion
	margin-bottom: 20px

	&__titulo
		font-size: 0.8rem
		color: #94a3b8
		margin: 0 0 8px

	&__barra
		height: 26px
		border-radius: 8px
		overflow: hidden

	&__leyenda
		display: flex
		flex-wrap: wrap
		gap: 14px
		margin-top: 10px

	&__item
		display: inline-flex
		align-items: center
		font-size: 0.8rem
		color: #475569

	&__punto
		display: inline-block
		width: 8px
		height: 8px
		border-radius: 50%
		margin-right: 6px

	&__perdida
		font-size: 0.8rem
		color: #DC2626
		background: rgba(220, 38, 38, 0.08)
		border-radius: 6px
		padding: 8px 12px
		margin-top: 10px
</style>
