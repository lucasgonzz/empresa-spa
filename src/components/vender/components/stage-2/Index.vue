<template>
	<!--
		Etapa 2 — Artículos y servicios.
		Siempre expandida, no colapsable.
		Index: orquesta el layout fijo; la lógica vive en cada subcomponente.
	-->
	<div class="vender-stage vender-stage--open vender-stage--no-collapse">

		<!--
			Bloque pegado (sticky): header + total + buscador de artículos.
			Queda visible arriba durante TODO el scroll -- tambien cuando entra la etapa 3 --,
			respetando el mismo margen que esta etapa tiene con la anterior. Lo que lo hace
			posible es que la tarjeta no genere caja: ver .vender-stage--no-collapse en el sass.
		-->
		<div
		class="vender-stage__pinned"
		:class="{ 'vender-stage__pinned--pegado': pegado && !sin_espacio, 'vender-stage__pinned--suelto': sin_espacio }"
		ref="pinned">

			<!-- Header informativo (sin toggle) -->
			<div class="vender-stage__header vender-stage__header--no-collapse">
				<span class="vender-stage__number">2</span>
				<div class="vender-stage__header-text">
					<span class="vender-stage__label">Artículos y servicios</span>
					<span class="vender-stage__sublabel">Buscar artículos, servicios, combos y promociones</span>
				</div>
			</div>

			<div class="vender-stage__body vender-stage__body--always-open vender-stage__body--pinned">

				<!-- Barra de contexto horizontal: total, cliente, método de pago y checklist -->
				<context-bar></context-bar>

				<!-- Buscadores de artículos -->
				<header-form data-tour="vender.buscador_articulos"></header-form>

			</div>
		</div>

		<!-- Body que sigue scrolleando debajo del bloque pegado -->
		<div class="vender-stage__body vender-stage__body--always-open vender-stage__body--scroll">

			<!-- Indicador de ventas anteriores vinculadas -->
			<previus-sale-data></previus-sale-data>

			<!-- Tabla de artículos agregados -->
			<articles-table data-tour="vender.lista_articulos"></articles-table>

		</div>
	</div>
</template>

<script>
import HeaderForm from '@/components/vender/components/remito/header-form/Index.vue'
import PreviusSaleData from '@/components/vender/components/remito/PreviusSaleData.vue'
import ArticlesTable from '@/components/vender/components/remito/ArticlesTable.vue'

/*
	Mismo valor que $vender_stage_gap en _vender-stages.sass: la distancia, en pixeles desde el borde
	del area que scrollea, a la que el bloque queda pegado. Si se cambia alla, se cambia aca.
*/
const GAP_ENTRE_ETAPAS = 18

/*
	Fraccion del area que scrollea que el bloque pegado puede ocupar como maximo. Pasada esa marca
	deja de pegarse: en un telefono los cuatro buscadores se apilan y el bloque llega a los 396px
	sobre un area de 561px (medido a 375px de ancho), o sea que fijarlo tapa el 70% de lo que se
	quiere mirar. Va por proporcion y no por un breakpoint de dispositivo porque lo que decide es
	cuanto lugar queda, y eso tambien cambia con lo que muestre la barra de contexto.
*/
const MAXIMO_DEL_AREA = 0.5

export default {
	name: 'VenderStage2',
	components: {
		/* Barra de contexto específica de la etapa 2 */
		ContextBar: () => import('./ContextBar'),
		HeaderForm,
		PreviusSaleData,
		ArticlesTable,
	},
	data() {
		return {
			/* true mientras el bloque de arriba esta efectivamente pegado al borde del scroll. */
			/* No hay selector CSS que distinga un sticky pegado de uno en reposo, y la diferencia */
			/* importa: la sombra solo tiene sentido cuando flota sobre el contenido. */
			pegado: false,
			/* true cuando el bloque es tan alto que fijarlo no dejaria lugar para la tabla. */
			sin_espacio: false,
			/* Contenedor que scrollea (.vender-stages). Se guarda para poder sacarle el listener. */
			contenedor: null,
			/* Evita medir mas de una vez por cuadro mientras el usuario scrollea. */
			medicion_pedida: false,
			observador_de_medidas: null,
		}
	},
	mounted() {
		this.contenedor = this.$el.parentElement

		if (!this.contenedor) {
			return
		}

		this.contenedor.addEventListener('scroll', this.pedir_medicion, { passive: true })

		/*
			El alto del bloque y el del area que scrollea cambian los dos con el ancho de pantalla
			(los buscadores se apilan, la barra de contexto envuelve), asi que la proporcion entre
			ellos se vuelve a medir con ResizeObserver y no una sola vez al montar.
		*/
		if (typeof ResizeObserver !== 'undefined') {
			this.observador_de_medidas = new ResizeObserver(this.medir_espacio)
			this.observador_de_medidas.observe(this.$refs.pinned)
			this.observador_de_medidas.observe(this.contenedor)
		}

		this.medir_espacio()
		this.medir_pegado()
	},
	beforeDestroy() {
		if (this.contenedor) {
			this.contenedor.removeEventListener('scroll', this.pedir_medicion)
		}

		if (this.observador_de_medidas) {
			this.observador_de_medidas.disconnect()
			this.observador_de_medidas = null
		}
	},
	methods: {
		/* Decide si el bloque tiene derecho a pegarse, mirando cuanto del area ocuparia. */
		medir_espacio() {
			if (!this.contenedor || !this.$refs.pinned) {
				return
			}

			let alto_del_area = this.contenedor.clientHeight

			if (!alto_del_area) {
				return
			}

			/* offsetHeight y no el rect: con la clase --suelto puesta el bloque sigue midiendo lo */
			/* mismo, asi que la medicion no depende de la decision anterior y no oscila. */
			this.sin_espacio = this.$refs.pinned.offsetHeight > alto_del_area * MAXIMO_DEL_AREA
		},

		/* Agenda una medicion para el proximo cuadro, en vez de medir en cada evento de scroll. */
		pedir_medicion() {
			if (this.medicion_pedida) {
				return
			}

			this.medicion_pedida = true

			let self = this

			window.requestAnimationFrame(function() {
				self.medicion_pedida = false
				self.medir_pegado()
			})
		},

		/*
			Esta pegado cuando su borde superior llego al tope del area de scroll. Se compara contra
			el borde del contenedor con un pixel de tolerancia: el sticky se posiciona con decimales
			y una comparacion exacta parpadea.
		*/
		medir_pegado() {
			if (!this.contenedor || !this.$refs.pinned) {
				return
			}

			let tope_del_bloque = this.$refs.pinned.getBoundingClientRect().top
			let tope_del_contenedor = this.contenedor.getBoundingClientRect().top

			this.pegado = tope_del_bloque - tope_del_contenedor < GAP_ENTRE_ETAPAS + 1
		},
	},
}
</script>
