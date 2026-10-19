<template>
	<!--
		La hoja del diseñador de PDF: blanca (--bg-card) sobre la mesa gris del modal, con el ancho
		proporcional al formato elegido y el margen dibujado como relleno proporcional (el rectángulo
		punteado es el ancho útil). Adentro, en el orden del PDF (plan §4.2): el encabezado del
		negocio, la zona de arriba de la tabla, la tabla de artículos (con sus columnas editables
		desde la misión diseno-ticket-comandera) y el pie.

		En un ticket de comandera (misión diseno-ticket-comandera, plan §7.3) es un ROLLO: angosto, con
		la letra monoespaciada de la comandera y exactamente N caracteres por renglón (N =
		caracteres_por_renglon del catálogo), sin encabezado aparte (D6: el logo y los datos del
		negocio son campos de las cajas) y con el corte del papel abajo. La letra se elige para que el
		rollo entre en su marco (ver medir_el_rollo).
	-->
	<div
	ref="hoja"
	class="dpdf-hoja"
	:class="clases"
	:style="estilo_de_la_hoja"
	data-testid="hoja-disenador-pdf">
		<!--
			La "sonda" del rollo: diez ceros en la letra de la comandera, invisibles, para medir cuánto
			mide de verdad un carácter (cada navegador encuentra otra letra de la pila). Va adentro de
			una caja de 0 × 0 que la recorta: medirla da su ancho igual, y no ensancha nada.
		-->
		<span
		v-if="es_ticket"
		class="dpdf-hoja__sonda"
		aria-hidden="true">
			<span
			ref="sonda"
			class="dpdf-hoja__sonda-texto">0000000000</span>
		</span>

		<div
		class="dpdf-hoja__util"
		:style="estilo_del_margen">
			<div
			class="dpdf-hoja__area"
			:style="estilo_del_area">

				<!--
					Encabezado del negocio: el diseñador de siempre (HeaderPreview), embebido a lo ancho
					y en la escala de la hoja, sin el bloque del cliente (en un diseño con cajas el cliente
					lo ponen las cajas). Debajo, los datos del negocio que no están en el encabezado. En un
					ticket no hay encabezado aparte (D6).
				-->
				<section
				v-if="!es_ticket"
				class="dpdf-hoja__encabezado"
				aria-label="Encabezado del negocio">
					<header class="dpdf-hoja__rotulo">
						<i
						class="bi bi-shop"
						aria-hidden="true"></i>
						<span class="dpdf-hoja__rotulo-titulo">Encabezado</span>
						<span class="dpdf-hoja__rotulo-pista">· tus datos y el logo, en todas las hojas · arrastrá los datos entre los dos lados</span>
					</header>

					<header-preview
					:layout="disenador.encabezado"
					:is_afip="disenador.es_fiscal"
					:locked_emisor_keys="disenador.obligatorios_del_emisor"
					:logo_size_mm="disenador.logo_size_mm"
					:model_name="disenador.modelo_del_perfil"
					:paper_width_mm="disenador.hoja.ancho"
					:px_per_mm="disenador.escala"
					:ancho_completo="true"
					:mostrar_receptor="false"
					@update:logo_size_mm="disenador.cambiar_logo($event)"></header-preview>

					<chip-palette
					class="dpdf-hoja__paleta"
					:emisor_palette="disenador.emisor_paleta"
					:receptor_palette="sin_receptor"
					:show_receptor="false"
					:locked_keys="disenador.obligatorios_del_emisor"
					:en_linea="true"></chip-palette>
				</section>

				<zona-del-disenador
				zona="superior"
				:lista="disenador.superior"
				titulo="Arriba de la tabla"
				:subtitulo="es_ticket ? 'lo primero del ticket' : 'sale en todas las hojas'"
				icono="bi-layout-text-window"></zona-del-disenador>

				<tabla-del-disenador></tabla-del-disenador>

				<zona-del-disenador
				zona="pie"
				:lista="disenador.pie"
				:titulo="es_ticket ? 'Abajo de la tabla' : 'Pie de página'"
				:subtitulo="disenador.cuando_sale_el_pie"
				icono="bi-layout-text-window-reverse"></zona-del-disenador>

				<!-- El corte del papel del ticket: decorativo -->
				<div
				v-if="es_ticket"
				class="dpdf-hoja__corte"
				aria-hidden="true">
					<i class="bi bi-scissors"></i>
					<span>corte del papel</span>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import HeaderPreview from '@/common-vue/components/pdf/header-designer/HeaderPreview.vue'
import ChipPalette from '@/common-vue/components/pdf/header-designer/ChipPalette.vue'
import ZonaDelDisenador from './ZonaDelDisenador'
import TablaDelDisenador from './TablaDelDisenador'

/*
	Ancho mínimo (px) de la hoja más ancha que se puede elegir. En el teléfono la hoja no se achica
	por debajo de esto -- con menos, una caja de 3 columnas no deja leer nada -- y se desliza de
	costado adentro de su marco (Index.vue), sin que la página scrollee de costado. Las hojas más
	angostas tienen su mínimo proporcional (A5: unos 440px). 640 y no más: con el lateral abajo
	(hasta 1199px), a 768px de pantalla una Carta tiene que entrar entera en el marco.
*/
const ANCHO_MINIMO_PX = 640

/* Paleta del receptor: el diseñador no la muestra (el cliente va en cajas), pero la prop es requerida */
const SIN_RECEPTOR = []

/*
	La letra del rollo de comandera (px). La más grande es la de escritorio: con ella un rollo de 80 mm
	(48 caracteres) mide unos 400 a 460 px según la letra que encuentre el navegador (pedido de la
	sesión madre: 380 a 460). Si el marco es más angosto, la letra se achica hasta la más chica
	legible; si ni así entra, el rollo se desliza de costado adentro de su marco, como la hoja.
*/
const LETRA_MAXIMA_DEL_ROLLO_PX = 15
const LETRA_MINIMA_DEL_ROLLO_PX = 10

/*
	Lo que el rollo ocupa además de sus N caracteres: el relleno de los costados (lugar para las
	manijas de las cajas de los bordes), el borde y 1px de holgura para el medio píxel que suma el
	área (estilo_del_area). Tiene que coincidir con el <style> de abajo (.dpdf-hoja--ticket
	.dpdf-hoja__util: 14px por lado; borde de 1px).
*/
const COSTADOS_DEL_ROLLO_PX = 31

/* Tamaño (px) de la letra de la sonda: grande, para medir el carácter con más precisión */
const LETRA_DE_LA_SONDA_PX = 100

/* Caracteres de la sonda (los "0000000000" del template) */
const CARACTERES_DE_LA_SONDA = 10

/**
 * Hoja del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * Además de dibujar, MIDE: la escala de la hoja (px por mm) sale de su ancho en pantalla y se la
 * pasa al diseñador (cambiar_escala), que la reparte a la vista previa de los campos, a los
 * títulos de las cajas y al logo del encabezado. Se vuelve a medir cada vez que la hoja cambia de
 * tamaño (otro formato, otra ventana, el modal que termina de abrir).
 *
 * En un ticket mide otra cosa (medir_el_rollo): el marco donde vive y el ancho real de un carácter
 * de la letra monoespaciada, y elige la letra del rollo para que N caracteres entren. Se la pasa al
 * diseñador (cambiar_letra_del_rollo), y de ahí la toman las cajas, los campos y la tabla.
 */
export default {
	name: 'HojaDelDisenador',
	inject: ['disenador'],
	components: {
		HeaderPreview,
		ChipPalette,
		ZonaDelDisenador,
		TablaDelDisenador,
	},
	data() {
		return {
			/* Ver SIN_RECEPTOR */
			sin_receptor: SIN_RECEPTOR,
			/* ResizeObserver de la hoja, o null si el navegador no lo tiene (se usa el resize de la ventana) */
			observador: null,
			/* Último ancho medido (px): el observador también avisa cambios de alto, que no cambian la escala */
			ultimo_ancho_px: 0,
		}
	},
	computed: {
		/**
		 * Si la hoja es un rollo de comandera (lo dice el catálogo).
		 *
		 * @returns {boolean}
		 */
		es_ticket() {
			return this.disenador.es_ticket
		},
		/**
		 * Ancho de la hoja: proporcional al formato contra la hoja más ancha que se puede elegir, así
		 * una A5 se ve más angosta que una A4 y una Carta más ancha. En el teléfono, con un mínimo.
		 *
		 * En un ticket: N caracteres de la letra del rollo más los costados, en px. La letra de la
		 * comandera la llevan solo los renglones (RenglonesDeTicket) y el título de las cajas: lo
		 * demás (las cabeceras de las zonas, los botones) va con la letra de la interfaz.
		 *
		 * @returns {Object}
		 */
		estilo_de_la_hoja() {
			if (this.es_ticket) {
				let ancho = this.disenador.caracteres_del_rollo * this.disenador.caracter_del_rollo_px + COSTADOS_DEL_ROLLO_PX
				return {
					width: ancho.toFixed(2) + 'px',
				}
			}
			let referencia = this.disenador.ancho_de_referencia_mm
			let proporcion = referencia > 0 ? this.disenador.hoja.ancho / referencia : 1
			return {
				width: (proporcion * 100).toFixed(3) + '%',
				minWidth: Math.round(proporcion * ANCHO_MINIMO_PX) + 'px',
			}
		},
		/**
		 * El margen como relleno: el porcentaje del padding se toma del ancho de la hoja (el bloque
		 * que lo contiene), así M mm de margen miden lo mismo que M mm de hoja, en los cuatro lados.
		 * En un ticket no hay margen: el relleno de los costados lo pone el <style>.
		 *
		 * @returns {Object}
		 */
		estilo_del_margen() {
			if (this.es_ticket) {
				return {}
			}
			let hoja = this.disenador.hoja
			let porcentaje = hoja.ancho > 0 ? (hoja.margen / hoja.ancho) * 100 : 0
			return {
				padding: porcentaje.toFixed(3) + '%',
			}
		},
		/**
		 * El ancho del área de un ticket: exactamente N caracteres (más medio píxel, para que una fila
		 * que llena el renglón no salte abajo por un redondeo).
		 *
		 * @returns {Object|null}
		 */
		estilo_del_area() {
			if (!this.es_ticket) {
				return null
			}
			let ancho = this.disenador.caracteres_del_rollo * this.disenador.caracter_del_rollo_px + 0.5
			return {
				width: ancho.toFixed(2) + 'px',
			}
		},
		/**
		 * Clases de estado: mientras se arrastra un campo, las cajas se ofrecen como destino.
		 *
		 * @returns {Object}
		 */
		clases() {
			let arrastrando = this.disenador.arrastrando
			return {
				'dpdf-hoja--arrastrando-campo': !!(arrastrando && arrastrando.tipo === 'campo'),
				'dpdf-hoja--ticket': this.es_ticket,
			}
		},
	},
	watch: {
		/**
		 * Otro rollo (el catálogo trae otro N): la letra se vuelve a elegir.
		 */
		'disenador.caracteres_del_rollo'() {
			if (this.es_ticket) {
				this.$nextTick(this.medir)
			}
		},
	},
	mounted() {
		let self = this

		this.medir()

		if (typeof window.ResizeObserver == 'function') {
			this.observador = new window.ResizeObserver(function () {
				self.medir()
			})
			/*
				En un ticket se observa el MARCO (el padre): el ancho del rollo sale de la letra, y la
				letra del ancho del marco. Observar el rollo mismo sería un círculo.
			*/
			let observado = this.es_ticket && this.$el.parentElement ? this.$el.parentElement : this.$refs.hoja
			this.observador.observe(observado)
		} else {
			window.addEventListener('resize', this.medir)
		}
	},
	beforeDestroy() {
		if (this.observador) {
			this.observador.disconnect()
			this.observador = null
		} else {
			window.removeEventListener('resize', this.medir)
		}
	},
	methods: {
		/**
		 * Mide la hoja y le pasa al diseñador la escala (px de pantalla por mm de hoja). Una hoja
		 * todavía sin ancho (el modal abriéndose) no cambia nada: el próximo resize la vuelve a medir.
		 * En un ticket, mide el rollo (medir_el_rollo).
		 *
		 * @returns {void}
		 */
		medir() {
			if (this.es_ticket) {
				this.medir_el_rollo()
				return
			}
			let hoja = this.$refs.hoja
			if (!hoja || !this.disenador.hoja.ancho) {
				return
			}
			let ancho_px = hoja.clientWidth
			if (ancho_px > 0 && ancho_px !== this.ultimo_ancho_px) {
				this.ultimo_ancho_px = ancho_px
				this.disenador.cambiar_escala(ancho_px / this.disenador.hoja.ancho)
			}
		},
		/**
		 * Elige la letra del rollo: la más grande (LETRA_MAXIMA_DEL_ROLLO_PX) si el rollo entra en el
		 * marco con ella; si no, la que haga entrar N caracteres, pero nunca menos que
		 * LETRA_MINIMA_DEL_ROLLO_PX (ahí el rollo se desliza adentro del marco).
		 *
		 * El ancho de un carácter se MIDE con la sonda (diez ceros a 100px, en la misma letra): cada
		 * navegador y cada sistema encuentran otra letra de la pila, y todo el rollo (las cajas, la
		 * separación, la tabla) se ubica en múltiplos de ese ancho.
		 *
		 * @returns {void}
		 */
		medir_el_rollo() {
			let sonda = this.$refs.sonda
			let marco = this.$el ? this.$el.parentElement : null
			let caracteres = this.disenador.caracteres_del_rollo

			if (!sonda || !marco || !(caracteres > 0)) {
				return
			}

			let ancho_de_la_sonda = sonda.getBoundingClientRect().width
			if (!(ancho_de_la_sonda > 0)) {
				return
			}
			/* Cuánto mide un carácter por cada px de letra (unos 0,55 a 0,6 en una monoespaciada) */
			let proporcion = ancho_de_la_sonda / CARACTERES_DE_LA_SONDA / LETRA_DE_LA_SONDA_PX

			/* El ancho de adentro del marco (sin su relleno) */
			let estilo = window.getComputedStyle(marco)
			let disponible = marco.clientWidth - (parseFloat(estilo.paddingLeft) || 0) - (parseFloat(estilo.paddingRight) || 0)
			if (!(disponible > 0)) {
				return
			}

			let letra = (disponible - COSTADOS_DEL_ROLLO_PX) / caracteres / proporcion
			if (letra > LETRA_MAXIMA_DEL_ROLLO_PX) {
				letra = LETRA_MAXIMA_DEL_ROLLO_PX
			}
			if (letra < LETRA_MINIMA_DEL_ROLLO_PX) {
				letra = LETRA_MINIMA_DEL_ROLLO_PX
			}
			/* Centésimas de px: así el ancho de un carácter es exactamente el que dibuja el navegador */
			letra = Math.floor(letra * 100) / 100

			this.disenador.cambiar_letra_del_rollo(letra, letra * proporcion)
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token: la hoja es --bg-card (blanca en claro) sobre la mesa --bg-section.
@import '@/common-vue/components/pdf/disenador-pdf/_ticket'

.dpdf-hoja
	margin: 0 auto
	border: 1px solid var(--color-border)
	border-radius: 4px
	background: var(--bg-card)
	color: var(--color-text-primary)

// El ancho útil: el rectángulo punteado marca hasta dónde llegan la tabla y las cajas
.dpdf-hoja__area
	min-height: 100px
	outline: 1px dashed var(--color-border-secondary)
	outline-offset: 0

.dpdf-hoja__encabezado
	margin-bottom: 6px

// Rótulo de cada parte de la hoja: el lenguaje de las cabeceras de las zonas
.dpdf-hoja__rotulo
	display: flex
	align-items: center
	gap: 6px
	margin-bottom: 6px
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.3

	i
		flex: 0 0 auto
		color: var(--color-primary)

.dpdf-hoja__rotulo-titulo
	flex: 0 0 auto
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.03em
	color: var(--color-text-primary)

.dpdf-hoja__rotulo-pista
	flex: 1 1 auto
	min-width: 0
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.dpdf-hoja__paleta
	margin-top: 8px

// Mientras se arrastra un campo: las listas de campos de las cajas se ofrecen como destino
.dpdf-hoja--arrastrando-campo .dpdf-caja__campos
	border-radius: 4px
	box-shadow: inset 0 0 0 1px var(--color-primary)

// ── El rollo de comandera (ticket) ─────────────────────────────────────────────────────────────
// Una tira angosta de papel (el ancho lo pone el style de la hoja: N caracteres de la letra del
// rollo más los costados) con el borde de abajo punteado: el corte. La sonda mide un carácter
// fuera de la vista.
.dpdf-hoja.dpdf-hoja--ticket
	position: relative
	flex: 0 0 auto
	border-radius: 4px 4px 0 0
	border-bottom: 2px dashed var(--color-border)
	box-shadow: 0 2px 10px var(--shadow-color)

	// 14px por lado: lugar para las manijas de las cajas de los bordes (COSTADOS_DEL_ROLLO_PX)
	.dpdf-hoja__util
		padding: 10px 14px 6px

	// El papel ES el área: sin el punteado del ancho útil
	.dpdf-hoja__area
		outline: 0

.dpdf-hoja__sonda
	position: absolute
	top: 0
	left: 0
	width: 0
	height: 0
	overflow: hidden
	visibility: hidden
	pointer-events: none

.dpdf-hoja__sonda-texto
	display: inline-block
	font-family: $dpdf-letra-de-comandera
	font-size: 100px
	font-weight: 400
	line-height: 1
	white-space: pre

.dpdf-hoja__corte
	display: flex
	align-items: center
	justify-content: center
	gap: 6px
	margin-top: 4px
	color: var(--color-text-secondary)
	font-family: var(--font-family-sans-serif)
	font-size: 0.68rem
	opacity: .8
</style>
