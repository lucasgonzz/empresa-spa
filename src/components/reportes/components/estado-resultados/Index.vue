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

			<!-- Barra de composicion "a donde va cada peso vendido" (tarea 03): primer bloque
			de la tarjeta, se autooculta si no hay ventas netas -->
			<composicion></composicion>

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
				<span class="cascada-renglon__monto">
					{{ formatear(model.devoluciones) }}
					<span class="cascada-renglon__porcentaje">{{ porcentaje(model.devoluciones) }}</span>
				</span>
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
				<span class="cascada-renglon__monto">
					{{ formatear(model.costo_mercaderia_vendida) }}
					<span class="cascada-renglon__porcentaje">{{ porcentaje(model.costo_mercaderia_vendida) }}</span>
				</span>
			</div>

			<!-- Costo de mercaderia devuelta: se resta del costo de mercaderia vendida, solo se muestra si hay algo -->
			<div
			v-if="model.costo_mercaderia_devuelta"
			class="cascada-renglon cascada-renglon--resta">
				<span class="cascada-renglon__label">(+) Costo de mercadería devuelta</span>
				<span class="cascada-renglon__monto">
					{{ formatear(model.costo_mercaderia_devuelta) }}
					<span class="cascada-renglon__porcentaje">{{ porcentaje(model.costo_mercaderia_devuelta) }}</span>
				</span>
			</div>

			<!-- Resultado bruto: subtotal destacado, con margen al lado. Rojo con perdida (tarea 02), verde queda reservado para el neto -->
			<div
			class="cascada-renglon cascada-renglon--subtotal"
			:class="clase_resultado(model.resultado_bruto)">
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
				<span class="cascada-renglon__monto">
					{{ formatear(model.gastos_operativos) }}
					<span class="cascada-renglon__porcentaje">{{ porcentaje(model.gastos_operativos) }}</span>
				</span>
			</div>
			<!-- Anillo de gastos por categoria (tarea 04): reemplaza al desglose de texto cuando
			hay 2 o mas categorias con gasto, no se muestran los dos juntos (misma info
			duplicada). Con 0 o 1 categoria el anillo no aporta nada, se sigue mostrando el
			texto de siempre -- por eso el bloque .cascada-desglose de abajo no se borra. -->
			<gastos-categorias v-if="categorias_con_gasto.length >= 2"></gastos-categorias>
			<div
			v-else-if="model.gastos_por_categoria && model.gastos_por_categoria.length"
			class="cascada-desglose">
				<div
				v-for="categoria in model.gastos_por_categoria"
				:key="categoria.expense_concept_id"
				class="cascada-desglose__item">
					<span>{{ categoria.concepto }}</span>
					<span>
						{{ formatear(categoria.total) }}
						<span class="cascada-renglon__porcentaje">{{ porcentaje(categoria.total) }}</span>
					</span>
				</div>
			</div>

			<!-- Resultado operativo: subtotal destacado. Unica linea de resultado sin proporcion propia del backend, se le agrega aca -->
			<div
			class="cascada-renglon cascada-renglon--subtotal"
			:class="clase_resultado(model.resultado_operativo)">
				<span class="cascada-renglon__label">Resultado operativo</span>
				<span class="cascada-renglon__monto">
					{{ formatear(model.resultado_operativo) }}
					<span class="cascada-renglon__porcentaje">{{ porcentaje(model.resultado_operativo) }}</span>
				</span>
			</div>

			<!-- Comisiones de cobro: resta, no tiene concepto propio en la whitelist de detalle -->
			<div class="cascada-renglon cascada-renglon--resta">
				<span class="cascada-renglon__label">(–) Comisiones de cobro</span>
				<span class="cascada-renglon__monto">
					{{ formatear(model.comisiones_de_cobro) }}
					<span class="cascada-renglon__porcentaje">{{ porcentaje(model.comisiones_de_cobro) }}</span>
				</span>
			</div>

			<!-- IIBB determinado: solo aplica cuando la moneda no es dolares (backend manda null en ese caso) -->
			<div class="cascada-renglon cascada-renglon--resta">
				<span class="cascada-renglon__label">(–) IIBB determinado</span>
				<span class="cascada-renglon__monto">
					{{ model.iibb_determinado === null ? '—' : formatear(model.iibb_determinado) }}
					<span class="cascada-renglon__porcentaje">{{ porcentaje(model.iibb_determinado) }}</span>
				</span>
			</div>
			<p
			v-if="no_atribuible('iibb_determinado')"
			class="cascada-nota">
				No se calcula en dólares: IIBB se determina siempre sobre el total en pesos.
			</p>

			<!-- Resultado neto: subtotal final, el mas destacado. Color por signo (tarea 02): antes quedaba verde fijo aunque hubiera perdida -->
			<div
			class="cascada-renglon cascada-renglon--subtotal cascada-renglon--final"
			:class="clase_resultado(model.resultado_neto)">
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
	components: {
		Composicion: () => import('@/components/reportes/components/estado-resultados/composicion/Index'),
		GastosCategorias: () => import('@/components/reportes/components/estado-resultados/gastos-categorias/Index'),
	},
	created() {
		this.$store.dispatch('reportes/getEstadoResultados')
	},
	computed: {
		model() {
			return this.$store.state.reportes.estado_resultados
		},
		/* Cuantas categorias tienen gasto real (tarea 04): decide si se muestra el anillo o el texto */
		categorias_con_gasto() {
			if (!this.model.gastos_por_categoria) {
				return []
			}
			return this.model.gastos_por_categoria.filter(categoria => categoria.total > 0)
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
		/**
		 * Peso porcentual de un monto sobre las ventas netas (tarea 02). La base es
		 * ventas_netas, no ventas_brutas, porque es la misma base contra la que el backend
		 * calcula margen_bruto_porcentaje y margen_neto_porcentaje (metodo margen() de arriba):
		 * usar otra base daria numeros que no cierran con esos dos margenes ya mostrados.
		 * Usa el valor absoluto porque es "cuanto pesa", no debe arrastrar el signo del renglon.
		 *
		 * @param {Number|null} valor
		 * @returns {String}
		 */
		porcentaje(valor) {
			if (!this.model.ventas_netas || !valor) {
				return '—'
			}
			return Math.round(Math.abs(valor) / this.model.ventas_netas * 1000) / 10 + '%'
		},
		/**
		 * Clase de color segun el signo del resultado (tarea 02): verde en positivo, rojo en
		 * negativo, sin clase (color gris oscuro por defecto) en cero o sin dato. El verde solo
		 * se ve en la practica en Resultado neto porque solo ese renglon tiene la clase
		 * --final combinada en el estilo; en bruto y operativo un positivo se queda con el
		 * gris oscuro que ya traen de --subtotal.
		 *
		 * @param {Number|null} valor
		 * @returns {String}
		 */
		clase_resultado(valor) {
			if (valor > 0) {
				return 'cascada-renglon--positivo'
			}
			if (valor < 0) {
				return 'cascada-renglon--negativo'
			}
			return ''
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

		&--negativo
			color: #DC2626

		&--final
			font-size: 1.2rem
			color: #0f172a

			&.cascada-renglon--positivo
				color: #059669

			&.cascada-renglon--negativo
				color: #DC2626

		&__margen
			font-weight: 500
			font-size: 0.8rem
			color: #64748b
			margin-left: 6px

		&__porcentaje
			font-size: 0.85em
			color: #94a3b8
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
