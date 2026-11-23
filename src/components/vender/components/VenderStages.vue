<template>
	<!--
		Contenedor de las secciones de Vender (mision vender-secciones-personalizables, 22/11/2026).

		Dibuja la disposicion del diseño en uso: bandas (filas) de arriba abajo, cada una con sus
		columnas de izquierda a derecha, y en cada columna las secciones apiladas. La etapa 2 (la
		tabla de articulos) es siempre VenderStage2; el resto de las secciones, SeccionDeVender.

		Con el diseño predeterminado hay una banda con una columna de 12 y las tres secciones
		apiladas: se ve igual que cuando las etapas eran fijas.

		Desde 992px de ancho las columnas se dibujan una al lado de la otra y las secciones de alto
		fijo miden su alto en doceavos del area util (alto_px). Debajo de 992px (tablet y telefono)
		todo se apila a lo ancho y el alto de todas es automatico.
	-->
	<div
	class="vender-stages"
	:class="{ 'vender-stages--columnas': modo_columnas }">

		<div
		v-for="banda in bandas"
		:key="banda.clave"
		class="vender-banda">

			<div
			v-for="columna in banda.columnas"
			:key="columna.clave"
			class="vender-banda__columna"
			:style="{ '--ancho-de-columna': columna.ancho }">

				<template v-for="id in columna.secciones">
					<vender-stage2
					v-if="id === 'etapa_2'"
					:key="id"
					:alto_px="alto_de_seccion(id)"></vender-stage2>

					<seccion-de-vender
					v-else
					:key="id"
					:id="id"
					:alto_px="alto_de_seccion(id)"></seccion-de-vender>
				</template>
			</div>
		</div>

		<!--
			Los campos del diseño de Vender que no monta ninguna seccion (sacados, o en una seccion que
			no se dibuja), montados escondidos: el porque esta en ReservaDeElementos.vue. Va UNA sola vez
			y despues de las secciones; no ocupa lugar (display: none).
		-->
		<reserva-de-elementos></reserva-de-elementos>

	</div>
</template>

<script>
import ReservaDeElementos from '@/components/vender/layout/ReservaDeElementos'
import diseno_de_vender from '@/mixins/vender/diseno_de_vender'
import { ANCHO_DE_PANTALLA_PARA_COLUMNAS, alto_en_px } from '@/components/vender/layout/secciones'

/* Padding de .vender-stages arriba y abajo (px): el de abajo es el lugar de la barra de acciones fija. */
const PADDING_SUPERIOR = 8
const PADDING_INFERIOR = 60

/* Aire entre secciones apiladas (px): el mismo $vender_stage_gap de _vender-stages.sass. */
const SEPARACION_ENTRE_SECCIONES = 18

export default {
	name: 'VenderStages',
	mixins: [diseno_de_vender],
	components: {
		VenderStage2: () => import('@/components/vender/components/stage-2/Index'),
		SeccionDeVender: () => import('@/components/vender/components/seccion/Index'),
		/* Sincronico a proposito: tiene que estar montada desde el primer render de Vender */
		ReservaDeElementos,
	},
	data() {
		return {
			/* true desde 992px de ancho: se dibujan las columnas una al lado de la otra */
			modo_columnas: false,
			/* Alto util (px) del area donde se reparten los doceavos; 0 hasta que se mide */
			alto_util: 0,
			/* Lista de media query que dice si hay lugar para columnas, y observador del alto */
			consulta_de_ancho: null,
			observador_de_alto: null,
		}
	},
	computed: {
		/**
		 * La disposicion del diseño en uso lista para dibujar: cada banda y cada columna con una clave
		 * estable (la de su primera seccion) para que Vue no remonte lo que no cambio de lugar.
		 *
		 * @returns {Array}
		 */
		bandas() {
			let bandas = []

			this.diseno_de_vender.disposicion.forEach(function (banda) {
				let columnas = []

				banda.columnas.forEach(function (columna) {
					columnas.push({
						clave: 'columna-' + columna.secciones[0],
						ancho: columna.ancho,
						secciones: columna.secciones,
					})
				})

				bandas.push({
					clave: 'banda-' + banda.columnas[0].secciones[0],
					columnas: columnas,
				})
			})

			return bandas
		},
	},
	mounted() {
		/*
			Hay lugar para columnas desde 992px (lg de Bootstrap): se pregunta con matchMedia y no con
			el ancho de la ventana para coincidir con los col-lg-N de la grilla de cada seccion.
		*/
		if (typeof window.matchMedia == 'function') {
			this.consulta_de_ancho = window.matchMedia('(min-width: ' + ANCHO_DE_PANTALLA_PARA_COLUMNAS + 'px)')
			this.modo_columnas = this.consulta_de_ancho.matches

			if (typeof this.consulta_de_ancho.addEventListener == 'function') {
				this.consulta_de_ancho.addEventListener('change', this.al_cambiar_el_ancho)
			} else if (typeof this.consulta_de_ancho.addListener == 'function') {
				this.consulta_de_ancho.addListener(this.al_cambiar_el_ancho)
			}
		}

		/* El alto util cambia con la ventana y con lo que muestre la barra de contexto: se vuelve a medir */
		this.medir_alto_util()
		if (typeof ResizeObserver !== 'undefined') {
			this.observador_de_alto = new ResizeObserver(this.medir_alto_util)
			this.observador_de_alto.observe(this.$el)
		}
	},
	beforeDestroy() {
		if (this.consulta_de_ancho) {
			if (typeof this.consulta_de_ancho.removeEventListener == 'function') {
				this.consulta_de_ancho.removeEventListener('change', this.al_cambiar_el_ancho)
			} else if (typeof this.consulta_de_ancho.removeListener == 'function') {
				this.consulta_de_ancho.removeListener(this.al_cambiar_el_ancho)
			}
		}

		if (this.observador_de_alto) {
			this.observador_de_alto.disconnect()
			this.observador_de_alto = null
		}
	},
	methods: {
		/**
		 * La pantalla paso el umbral de 992px: se prenden o se apagan las columnas.
		 *
		 * @param {Object} evento MediaQueryListEvent
		 * @returns {void}
		 */
		al_cambiar_el_ancho(evento) {
			this.modo_columnas = !!evento.matches
		},

		/**
		 * Mide el alto util del area que scrollea: su alto menos el padding de arriba, el de abajo
		 * (donde esta la barra de acciones fija de 60px) y el margen de la ultima seccion. Es la
		 * base de alto_en_px() (ver secciones.js).
		 *
		 * @returns {void}
		 */
		medir_alto_util() {
			if (!this.$el) {
				return
			}

			let alto = this.$el.clientHeight - PADDING_SUPERIOR - PADDING_INFERIOR - SEPARACION_ENTRE_SECCIONES
			this.alto_util = alto > 0 ? alto : 0
		},

		/**
		 * Alto en pixeles de una seccion, o null si es automatico: sólo las de alto fijo y sólo
		 * mientras se dibujan las columnas (debajo de 992px el alto de todas es automatico).
		 *
		 * @param {string} id
		 * @returns {number|null}
		 */
		alto_de_seccion(id) {
			let seccion = this.seccion_de_vender(id)

			if (!this.modo_columnas || !seccion || !seccion.alto_fijo || !this.alto_util) {
				return null
			}

			return alto_en_px(seccion.alto, this.alto_util, SEPARACION_ENTRE_SECCIONES)
		},
	},
}
</script>

<style lang="sass">
@import '@/components/vender/sass/_vender-stages'
@import '@/components/vender/sass/_vender-client-block'
</style>
