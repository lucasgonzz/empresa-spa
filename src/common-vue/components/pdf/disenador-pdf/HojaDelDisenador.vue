<template>
	<!--
		La hoja del diseñador de PDF: blanca (--bg-card) sobre la mesa gris del modal, con el ancho
		proporcional al formato elegido y el margen dibujado como relleno proporcional (el rectángulo
		punteado es el ancho útil). Adentro, en el orden del PDF (plan §4.2): el encabezado del
		negocio, la zona de arriba de la tabla, la tabla de artículos (con sus columnas editables
		desde la misión diseno-ticket-comandera) y el pie.
	-->
	<div
	ref="hoja"
	class="dpdf-hoja"
	:class="clases"
	:style="estilo_de_la_hoja"
	data-testid="hoja-disenador-pdf">
		<div
		class="dpdf-hoja__util"
		:style="estilo_del_margen">
			<div class="dpdf-hoja__area">

				<!--
					Encabezado del negocio: el diseñador de siempre (HeaderPreview), embebido a lo ancho
					y en la escala de la hoja, sin el bloque del cliente (en un diseño con cajas el cliente
					lo ponen las cajas). Debajo, los datos del negocio que no están en el encabezado.
				-->
				<section
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
				subtitulo="sale en todas las hojas"
				icono="bi-layout-text-window"></zona-del-disenador>

				<tabla-del-disenador></tabla-del-disenador>

				<zona-del-disenador
				zona="pie"
				:lista="disenador.pie"
				titulo="Pie de página"
				:subtitulo="disenador.cuando_sale_el_pie"
				icono="bi-layout-text-window-reverse"></zona-del-disenador>
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

/**
 * Hoja del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * Además de dibujar, MIDE: la escala de la hoja (px por mm) sale de su ancho en pantalla y se la
 * pasa al diseñador (cambiar_escala), que la reparte a la vista previa de los campos, a los
 * títulos de las cajas y al logo del encabezado. Se vuelve a medir cada vez que la hoja cambia de
 * tamaño (otro formato, otra ventana, el modal que termina de abrir).
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
		 * Ancho de la hoja: proporcional al formato contra la hoja más ancha que se puede elegir, así
		 * una A5 se ve más angosta que una A4 y una Carta más ancha. En el teléfono, con un mínimo.
		 *
		 * @returns {Object}
		 */
		estilo_de_la_hoja() {
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
		 *
		 * @returns {Object}
		 */
		estilo_del_margen() {
			let hoja = this.disenador.hoja
			let porcentaje = hoja.ancho > 0 ? (hoja.margen / hoja.ancho) * 100 : 0
			return {
				padding: porcentaje.toFixed(3) + '%',
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
			this.observador.observe(this.$refs.hoja)
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
		 *
		 * @returns {void}
		 */
		medir() {
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
	},
}
</script>
<style lang="sass">
// Colores solo por token: la hoja es --bg-card (blanca en claro) sobre la mesa --bg-section.
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
</style>
