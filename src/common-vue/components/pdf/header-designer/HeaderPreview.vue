<template>
	<div
	class="header-designer-preview"
	:class="{ 'header-designer-preview--embebido': ancho_completo }"
	:style="preview_box_style">

		<!-- Bloque emisor: logo a la izquierda de todo, cuadrante izquierdo (ancho
		     dinámico según el logo), recuadro de letra y cuadrante derecho. El orden
		     replica al PDF real (AfipPdfHelper::print_emisor_header_block). -->
		<div class="header-designer-preview__row header-designer-preview__row--emisor">
			<!-- Logo: columna propia a la izquierda de todo, como en el PDF real. Su ancho
			     (el del logo) le quita ancho al cuadrante izquierdo a medida que crece. -->
			<div class="header-designer-preview__col header-designer-preview__col--logo">
				<div
				class="header-designer-preview__logo"
				:style="logo_style"
				title="Logo del negocio (estructural, fijo)">
					LOGO
					<logo-resize-handle
					:size_mm="logo_size_mm"
					:min_mm="logo_size_mm_min"
					:max_mm="logo_size_mm_max"
					:px_per_mm="px_per_mm"
					@update:size_mm="on_logo_resize"></logo-resize-handle>
				</div>
				<p class="header-designer-preview__logo-size small text-muted m-t-5 m-b-0">
					{{ logo_size_mm }} mm
				</p>
			</div>

			<!-- Emisor izquierda: nombre del negocio arriba + datos. Toma el ancho que sobra
			     después del logo (flex: 1 1 0), replicando el "beside_logo_width" del PDF. -->
			<div class="header-designer-preview__col header-designer-preview__col--side">
				<p class="header-designer-preview__business-name">
					{{ business_name }}
				</p>
				<quadrant-list
				title="Emisor · Izquierda"
				:items="layout.emisor.izquierda"
				group="emisor"
				:locked_keys="locked_emisor_keys"></quadrant-list>
			</div>

			<!-- Recuadro de la letra, centrado entre izquierda y derecha. Estructural, fijo.
			     Se muestra en fiscal ("A"/"B"...) y en comercial ("X"). -->
			<div class="header-designer-preview__col header-designer-preview__col--letter">
				<div
				class="header-designer-preview__letter-box"
				title="Recuadro de la letra del comprobante (estructural, fijo)">
					{{ letter_placeholder }}
				</div>
			</div>

			<!-- Emisor derecha -->
			<quadrant-list
			class="header-designer-preview__col header-designer-preview__col--side"
			title="Emisor · Derecha"
			:items="layout.emisor.derecha"
			group="emisor"
			:locked_keys="locked_emisor_keys"></quadrant-list>
		</div>

		<!-- Bloque receptor: solo se muestra editable en perfiles no fiscales (remito negro) -->
		<div
		v-if="show_receptor"
		class="header-designer-preview__row header-designer-preview__row--receptor m-t-15">
			<quadrant-list
			class="header-designer-preview__col header-designer-preview__col--side"
			title="Receptor · Izquierda"
			:items="layout.receptor.izquierda"
			group="receptor"
			empty_text="Arrastrá campos del cliente acá"></quadrant-list>

			<!--
				Cuenta corriente: es un bloque de la VENTA (saldo del cliente). El presupuesto y el
				pedido online no lo tienen: ahí el lado derecho del bloque del cliente queda vacío, y se
				deja una columna vacía del mismo ancho (el v-else de abajo) para que el cuadrante
				izquierdo siga ocupando la mitad de la hoja, como en el PDF, y no se estire.
			-->
			<div
			v-if="is_sale"
			class="header-designer-preview__col header-designer-preview__col--side header-designer-preview__receptor-fixed">
				<p class="header-designer-preview__col-title text-muted small m-b-5">Receptor · Derecha</p>
				<div class="header-designer-preview__receptor-fixed-box text-muted small">
					Cuenta corriente
					<small class="d-block">(fijo, no editable)</small>
				</div>
			</div>

			<div
			v-else
			class="header-designer-preview__col header-designer-preview__col--side"
			aria-hidden="true"></div>
		</div>

		<p
		v-else-if="is_sale && mostrar_receptor"
		class="small text-muted font-italic m-t-15 m-b-0">
			El bloque receptor no se muestra en perfiles fiscales: el recibo es siempre a nombre del comprador de la venta.
		</p>
	</div>
</template>

<script>
import QuadrantList from '@/common-vue/components/pdf/header-designer/QuadrantList.vue'
import LogoResizeHandle from '@/common-vue/components/pdf/header-designer/LogoResizeHandle.vue'
import { PREVIEW_PX_PER_MM, LOGO_SIZE_MM_MIN, LOGO_SIZE_MM_MAX } from '@/common-vue/components/pdf/header-designer/header_designer_catalog'

/**
 * Previsualización visual del header del PDF (prompt 441), con la forma real de la
 * hoja: cuadrantes de emisor (izquierda/centro/derecha) y, si el perfil no es
 * fiscal, cuadrante de receptor. Sirve a los perfiles de venta, presupuesto y pedido
 * online (prop `model_name`). Orquesta los QuadrantList (drag & drop) y la
 * manija de redimensionado del logo; el estado del layout vive en el componente
 * padre y se muta por referencia.
 *
 * Desde la misión diseno-pdf-configurable (1/10/2026) también lo embebe el diseñador de PDF
 * (disenador-pdf/HojaDelDisenador.vue) con tres props opcionales: `px_per_mm` (la escala de su
 * hoja), `ancho_completo` (100% de ancho y sin marco propio) y `mostrar_receptor` en false (el
 * cliente va en cajas). Sin esas props se ve y se comporta exactamente como antes.
 */
export default {
	name: 'HeaderDesignerHeaderPreview',
	components: {
		QuadrantList,
		LogoResizeHandle,
	},
	props: {
		/**
		 * Estado editable del layout: { emisor: { izquierda, derecha }, receptor: { izquierda } }.
		 * Los arrays internos se mutan directamente por los QuadrantList (drag & drop).
		 */
		layout: {
			type: Object,
			required: true,
		},
		/**
		 * Si el perfil es fiscal (is_afip_ticket). Determina si se muestra el bloque
		 * receptor editable y qué chips de emisor están bloqueados.
		 */
		is_afip: {
			type: Boolean,
			default: false,
		},
		/**
		 * Claves de chips de emisor obligatorios (no se pueden quitar) en este perfil.
		 */
		locked_emisor_keys: {
			type: Array,
			default() {
				return []
			},
		},
		/**
		 * Tamaño actual del logo en mm (pdf_column_profile.logo_size_mm).
		 */
		logo_size_mm: {
			type: Number,
			required: true,
		},
		/**
		 * Ancho de hoja del perfil en mm, usado solo para dimensionar la previsualización.
		 */
		paper_width_mm: {
			type: Number,
			default: 210,
		},
		/**
		 * Modelo del perfil en edición ('sale' | 'budget' | 'order'). Define qué bloques atados
		 * a la venta se muestran (cuenta corriente, aviso del comprador de la venta). Default
		 * 'sale' para que cualquier uso que no lo pase se comporte como siempre.
		 */
		model_name: {
			type: String,
			default: 'sale',
		},
		/**
		 * Factor de escala px -> mm de la previsualización (misión diseno-pdf-configurable): el
		 * diseñador de PDF pasa la escala de su hoja para que el logo se vea del tamaño que tiene
		 * en esa hoja. Sin pasarlo, el de siempre (PREVIEW_PX_PER_MM).
		 */
		px_per_mm: {
			type: Number,
			default: PREVIEW_PX_PER_MM,
		},
		/**
		 * true = la previsualización ocupa el 100% de su contenedor y sin marco propio (el diseñador
		 * de PDF la embebe adentro de su hoja, que ya tiene el ancho y el marco). Default false: el
		 * ancho del papel × px_per_mm y el recuadro de siempre.
		 */
		ancho_completo: {
			type: Boolean,
			default: false,
		},
		/**
		 * false = no se muestra el bloque del cliente (receptor) ni su aviso: en un diseño con
		 * cajas los datos del cliente los ponen las cajas. Default true: como siempre.
		 */
		mostrar_receptor: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			/** Topes de tamaño de logo (mm), tomados del catálogo compartido */
			logo_size_mm_min: LOGO_SIZE_MM_MIN,
			logo_size_mm_max: LOGO_SIZE_MM_MAX,
		}
	},
	computed: {
		/**
		 * Si el perfil es de venta. Los textos y bloques propios de la venta (cuenta corriente
		 * del cliente, "comprador de la venta") solo se muestran para este modelo; el presupuesto
		 * y el pedido online comparten el resto del diseñador pero no esos bloques.
		 *
		 * @return {boolean}
		 */
		is_sale() {
			return this.model_name === 'sale'
		},
		/**
		 * Muestra el bloque receptor editable solo en perfiles no fiscales (remito negro), y nunca
		 * si quien lo usa pidió no mostrarlo (prop mostrar_receptor, el diseñador de PDF).
		 *
		 * @return {boolean}
		 */
		show_receptor() {
			return this.mostrar_receptor && !this.is_afip
		},
		/**
		 * Nombre del negocio a mostrar como elemento estructural fijo (solo contexto visual).
		 *
		 * @return {string}
		 */
		business_name() {
			return (this.owner && this.owner.company_name) ? this.owner.company_name : 'Nombre del Negocio'
		},
		/**
		 * Letra del comprobante mostrada en el recuadro central (estructural).
		 * En fiscal se muestra "A" como placeholder; en comercial (remito/no fiscal) "X",
		 * coherente con el PDF real que también dibuja el recuadro de letra en comercial.
		 *
		 * @return {string}
		 */
		letter_placeholder() {
			return this.is_afip ? 'A' : 'X'
		},
		/**
		 * Ancho en px de la previsualización, según el ancho de hoja del perfil (mm).
		 *
		 * @return {Object}
		 */
		preview_box_style() {
			/* Embebido en el diseñador de PDF: el ancho lo da la hoja que lo contiene */
			if (this.ancho_completo) {
				return {
					width: '100%',
				}
			}
			const width_mm = Number(this.paper_width_mm || 210)
			return {
				width: Math.round(width_mm * this.px_per_mm) + 'px',
			}
		},
		/**
		 * Estilo del recuadro del logo (cuadrado, tamaño según logo_size_mm).
		 *
		 * @return {Object}
		 */
		logo_style() {
			const size_px = Math.round(this.logo_size_mm * this.px_per_mm)
			return {
				width: size_px + 'px',
				height: size_px + 'px',
			}
		},
	},
	methods: {
		/**
		 * Propaga el nuevo tamaño de logo (mm) emitido por la manija hacia el padre,
		 * vía `.sync` (update:logo_size_mm), para que se refleje en vivo.
		 *
		 * @param {number} new_size_mm Nuevo tamaño en mm, ya acotado por la manija.
		 * @return {void}
		 */
		on_logo_resize(new_size_mm) {
			this.$emit('update:logo_size_mm', new_size_mm)
		},
	},
}
</script>

<style lang="sass" scoped>
.header-designer-preview
	max-width: 100%
	margin: 0 auto
	border: 1px solid rgba(0, 0, 0, .25)
	border-radius: 4px
	padding: 15px
	background: #fdfdfd

.header-designer-preview__row
	display: flex
	align-items: flex-start
	gap: 10px

.header-designer-preview__col
	min-width: 0

.header-designer-preview__col--side
	flex: 1 1 0

.header-designer-preview__col--logo
	flex: 0 0 auto
	display: flex
	flex-direction: column
	align-items: center

.header-designer-preview__col--letter
	flex: 0 0 auto
	display: flex
	align-items: flex-start
	justify-content: center

.header-designer-preview__business-name
	font-weight: 700
	font-size: 12px
	margin-bottom: 6px
	word-break: break-word
	text-align: left

.header-designer-preview__letter-box
	width: 26px
	height: 26px
	display: flex
	align-items: center
	justify-content: center
	border: 2px solid rgba(0, 0, 0, .5)
	font-weight: 700
	font-size: 14px
	margin-bottom: 8px

.header-designer-preview__logo
	position: relative
	display: flex
	align-items: center
	justify-content: center
	background: rgba(0, 0, 0, .06)
	border: 1px dashed rgba(0, 0, 0, .35)
	font-size: 10px
	color: rgba(0, 0, 0, .5)
	min-width: 24px
	min-height: 24px

.header-designer-preview__col-title
	text-transform: uppercase
	letter-spacing: .03em
	font-size: 10px

.header-designer-preview__receptor-fixed-box
	border: 1px dashed rgba(0, 0, 0, .2)
	border-radius: 4px
	padding: 10px
	text-align: center
	background: rgba(0, 0, 0, .015)
	min-height: 40px
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center

// Embebido en la hoja del diseñador de PDF (prop ancho_completo): sin marco propio, sobre el papel
// de la hoja, y con colores por token (la hoja también se ve en modo oscuro). Solo aplica con la
// prop en true: quien no la pasa ve el recuadro de siempre.
.header-designer-preview--embebido
	max-width: none
	padding: 0
	border: 0
	border-radius: 0
	background: transparent

	.header-designer-preview__business-name
		color: var(--color-text-primary)

	.header-designer-preview__letter-box
		border-color: var(--color-text-primary)
		color: var(--color-text-primary)

	.header-designer-preview__logo
		border-color: var(--color-border)
		background: var(--bg-section)
		color: var(--color-text-secondary)
</style>
