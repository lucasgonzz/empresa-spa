<template>
	<div
	v-if="mostrar"
	class="composicion">
		<p class="composicion__titulo">A dónde va cada peso vendido</p>

		<!-- Zona con position relative y SIN overflow hidden: es la que aloja el tooltip.
		El overflow hidden vive un nivel mas abajo, en __barra, donde hace falta para que
		el border-radius corte los segmentos. Este era el nudo del bug anterior: el
		tooltip se dibujaba adentro del canvas, que estaba adentro del overflow hidden. -->
		<div class="composicion__zona">

			<div class="composicion__barra">
				<div
				v-for="(segmento, i) in segmentos"
				:key="segmento.label"
				class="composicion__segmento"
				:class="{ 'composicion__segmento--atenuado': indice_activo !== null && indice_activo !== i }"
				:style="{ flexGrow: segmento.valor, backgroundColor: segmento.color }"
				@mouseenter="indice_activo = i"
				@mouseleave="indice_activo = null"
				@click="alternar_activo(i)"></div>
			</div>

			<div
			v-if="segmento_activo"
			class="composicion__tooltip"
			:style="estilo_tooltip">
				<span class="composicion__tooltip-label">{{ segmento_activo.label }}</span>
				<span class="composicion__tooltip-monto">{{ formatear(segmento_activo.valor) }}</span>
				<span class="composicion__tooltip-porcentaje">{{ segmento_activo.porcentaje }}% de las ventas netas</span>
			</div>
		</div>

		<div class="composicion__leyenda">
			<span
			v-for="(segmento, i) in segmentos"
			:key="segmento.label"
			class="composicion__item"
			@mouseenter="indice_activo = i"
			@mouseleave="indice_activo = null">
				<span
				class="composicion__punto"
				:style="{backgroundColor: segmento.color}"></span>
				{{ segmento.label }} {{ segmento.porcentaje }}%
			</span>
		</div>

		<p
		v-if="hay_perdida"
		class="composicion__perdida">
			{{ texto_perdida() }}
		</p>
	</div>
</template>
<script>
export default {
	data() {
		return {
			// Indice del segmento sobre el que esta el mouse, o null. Gobierna el tooltip y
			// la atenuacion del resto de los segmentos.
			indice_activo: null,
		}
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
		 * Los 5 segmentos de la identidad verificada en EstadoResultadosHelper: nombre, color,
		 * monto y porcentaje sobre ventas_netas de cada uno que efectivamente se dibuja. Es la
		 * fuente de verdad tanto de la barra como de la leyenda.
		 * Si resultado_neto <= 0 no entra (tampoco se dibuja en la barra): esa perdida se
		 * comunica con la linea de composicion__perdida, no con un segmento rojo.
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
		/**
		 * El segmento bajo el cursor, o null. Se resuelve contra el array segmentos() en vez de
		 * guardar una copia en data: si el reporte se recarga con otro periodo mientras el mouse
		 * esta encima, el tooltip queda mostrando el dato viejo.
		 *
		 * @returns {Object|null}
		 */
		segmento_activo() {
			if (this.indice_activo === null || !this.segmentos[this.indice_activo]) {
				return null
			}
			return this.segmentos[this.indice_activo]
		},
		/**
		 * Posicion horizontal del tooltip: centrado sobre el medio del segmento activo.
		 *
		 * El centro se calcula acumulando los valores anteriores sobre la suma de los segmentos
		 * DIBUJADOS -- la misma base que reparte flex-grow --, no sobre ventas_netas, para que la
		 * punta del tooltip caiga sobre el segmento y no corrida: en un periodo con perdida
		 * Resultado no se dibuja y las dos bases no coinciden.
		 *
		 * Cerca de los bordes se ancla al borde en vez de centrarse: un tooltip centrado sobre el
		 * primer segmento se sale de la tarjeta por la izquierda. Se resuelve con el ancla y no
		 * midiendo el ancho real del tooltip, porque medir el DOM obliga a un $nextTick por cada
		 * movimiento del mouse.
		 *
		 * @returns {Object}
		 */
		estilo_tooltip() {
			if (this.indice_activo === null) {
				return {}
			}

			let suma = 0
			this.segmentos.forEach(segmento => {
				suma += segmento.valor
			})

			if (!suma) {
				return {}
			}

			let acumulado = 0
			let i = 0
			while (i < this.indice_activo) {
				acumulado += this.segmentos[i].valor
				i++
			}

			let centro = (acumulado + this.segmentos[this.indice_activo].valor / 2) / suma * 100

			if (centro < 18) {
				return {left: '0', transform: 'none'}
			}
			if (centro > 82) {
				return {left: 'auto', right: '0', transform: 'none'}
			}
			return {left: centro + '%'}
		},
	},
	methods: {
		formatear(valor) {
			return this.price(valor, false, false)
		},
		/* Mismo criterio que el porcentaje() del prompt 02 en estado-resultados/Index.vue: base ventas_netas, redondeo a un decimal, valor absoluto. toFixed(1) para que 35 no se lea como "35%" sino "35.0%" (consistente con el resto de la leyenda) */
		porcentaje(valor) {
			return (Math.round(Math.abs(valor) / this.model.ventas_netas * 1000) / 10).toFixed(1)
		},
		/* price(0, ...) devuelve '-' (mismo criterio que el resto de la app): en el caso borde de
		   resultado_neto exactamente 0 evita el texto confuso "perdida de -" */
		texto_perdida() {
			if (this.model.resultado_neto === 0) {
				return 'El período cerró sin ganancia ni pérdida'
			}
			return 'El período cerró con una pérdida de ' + this.formatear(Math.abs(this.model.resultado_neto))
		},
		/**
		 * Alterna el segmento activo al tocarlo. En pantalla tactil no hay mouseenter, asi que sin
		 * esto el tooltip seria inalcanzable en celular. Volver a tocar el mismo segmento lo cierra.
		 *
		 * @param {Number} indice
		 * @returns {void}
		 */
		alternar_activo(indice) {
			if (this.indice_activo === indice) {
				this.indice_activo = null
				return
			}
			this.indice_activo = indice
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

	&__zona
		position: relative

	&__barra
		display: flex
		height: 26px
		border-radius: 8px
		// El overflow hidden se queda ACA y no en __zona: es lo que hace que el
		// border-radius recorte el primer y el ultimo segmento. Si sube un nivel,
		// se vuelve a comer el tooltip, que es el bug que este prompt arregla.
		overflow: hidden

	&__segmento
		// Sin base ni shrink: el ancho lo decide enteramente el flex-grow proporcional
		// al monto, que se pasa inline desde el template.
		flex-basis: 0
		flex-shrink: 1
		// Un segmento chico igual tiene que poder verse y recibir el mouse.
		min-width: 3px
		cursor: default
		transition: opacity 160ms ease

		&--atenuado
			opacity: 0.45

	&__tooltip
		position: absolute
		// Sobre la barra, no debajo: debajo choca con la leyenda.
		bottom: calc(100% + 8px)
		transform: translateX(-50%)
		z-index: 5
		background: #1e293b
		color: #f8fafc
		border-radius: 8px
		padding: 8px 12px
		// Que el mouse lo atraviese: si el tooltip tapa el segmento, entra en un ciclo
		// de mouseenter/mouseleave y titila.
		pointer-events: none
		white-space: nowrap
		box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18)

	&__tooltip-label
		display: block
		font-size: 0.72rem
		text-transform: uppercase
		letter-spacing: 0.05em
		color: #94a3b8

	&__tooltip-monto
		display: block
		font-size: 0.95rem
		font-weight: 700

	&__tooltip-porcentaje
		display: block
		font-size: 0.72rem
		color: #cbd5e1

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
