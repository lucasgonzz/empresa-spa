<template>
	<div
	class="header-designer-preview"
	:style="preview_box_style">

		<!-- Bloque emisor: cuadrante izquierdo, centro (elementos estructurales fijos) y cuadrante derecho -->
		<div class="header-designer-preview__row header-designer-preview__row--emisor">
			<quadrant-list
			class="header-designer-preview__col header-designer-preview__col--side"
			title="Emisor · Izquierda"
			:items="layout.emisor.izquierda"
			group="emisor"
			:locked_keys="locked_emisor_keys"></quadrant-list>

			<!-- Centro: título del negocio, recuadro de la letra y logo. Son elementos
			     estructurales fijos (no arrastrables) para que el usuario vea el
			     contexto real del header, tal como pide el prompt. -->
			<div class="header-designer-preview__col header-designer-preview__col--center">
				<p class="header-designer-preview__business-name">
					{{ business_name }}
				</p>

				<div
				v-if="is_afip"
				class="header-designer-preview__letter-box"
				title="Recuadro de la letra del comprobante (estructural, fijo)">
					{{ letter_placeholder }}
				</div>

				<div class="header-designer-preview__logo-wrap">
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
			</div>

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

			<div class="header-designer-preview__col header-designer-preview__col--side header-designer-preview__receptor-fixed">
				<p class="header-designer-preview__col-title text-muted small m-b-5">Receptor · Derecha</p>
				<div class="header-designer-preview__receptor-fixed-box text-muted small">
					Cuenta corriente
					<small class="d-block">(fijo, no editable)</small>
				</div>
			</div>
		</div>

		<p
		v-else
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
 * fiscal, cuadrante de receptor. Orquesta los QuadrantList (drag & drop) y la
 * manija de redimensionado del logo; el estado del layout vive en el componente
 * padre (Index.vue del diseñador) y se muta por referencia.
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
	},
	data() {
		return {
			/** Topes de tamaño de logo (mm), tomados del catálogo compartido */
			logo_size_mm_min: LOGO_SIZE_MM_MIN,
			logo_size_mm_max: LOGO_SIZE_MM_MAX,
			/** Factor de escala px -> mm de la previsualización */
			px_per_mm: PREVIEW_PX_PER_MM,
		}
	},
	computed: {
		/**
		 * Muestra el bloque receptor editable solo en perfiles no fiscales (remito negro).
		 *
		 * @return {boolean}
		 */
		show_receptor() {
			return !this.is_afip
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
		 * Letra del comprobante mostrada en el recuadro fijo (solo perfiles fiscales).
		 *
		 * @return {string}
		 */
		letter_placeholder() {
			return 'A'
		},
		/**
		 * Ancho en px de la previsualización, según el ancho de hoja del perfil (mm).
		 *
		 * @return {Object}
		 */
		preview_box_style() {
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

.header-designer-preview__col--center
	flex: 0 0 130px
	display: flex
	flex-direction: column
	align-items: center
	text-align: center

.header-designer-preview__business-name
	font-weight: 700
	font-size: 12px
	margin-bottom: 6px
	word-break: break-word

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

.header-designer-preview__logo-wrap
	display: flex
	flex-direction: column
	align-items: center

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
</style>
