<template>
	<div class="catalog-header-preview">
		<p
		v-if="!is_first_page"
		class="catalog-header-preview__page-note small text-muted m-b-5">
			Así sale la hoja 2 en adelante
		</p>

		<!-- El contenedor scrollea en horizontal: la hoja tiene ancho fijo (px por mm) para
		que el logo se vea en escala, y así no rompe el ancho del modal en ningún ancho. -->
		<div class="catalog-header-preview__scroll">
			<div
			class="catalog-header-preview__sheet"
			:class="{ 'catalog-header-preview__sheet--page-2': !is_first_page }"
			:style="sheet_style">

				<!-- 1. Imagen de cabecera (banner). Comparte regla de hojas con el logo: son "las
				imágenes del encabezado", una sola opción para el usuario. -->
				<div
				v-if="banner_visible"
				class="catalog-header-preview__banner">
					<img
					:src="header_image_url"
					alt="Imagen de cabecera">
				</div>

				<!-- 2. Bloque del encabezado: logo + columna izquierda + columna derecha -->
				<div
				v-if="block_visible"
				class="catalog-header-preview__block">
					<div
					v-if="logo_visible"
					class="catalog-header-preview__logo-col">
						<div
						class="catalog-header-preview__logo"
						:class="{ 'catalog-header-preview__logo--placeholder': !logo_url }"
						:style="logo_style"
						:title="logo_url ? 'Logo del negocio' : 'Sin logo: cargalo en Configuración → General'">
							<img
							v-if="logo_url"
							:src="logo_url"
							alt="Logo del negocio">
							<span
							v-else
							class="catalog-header-preview__logo-placeholder">
								Sin logo: cargalo en Configuración → General
							</span>
							<logo-resize-handle
							v-if="!drag_disabled"
							:size_mm="logo_size_mm"
							:min_mm="logo_size_mm_min"
							:max_mm="logo_size_mm_max"
							:px_per_mm="px_per_mm"
							@update:size_mm="on_logo_resize"></logo-resize-handle>
						</div>
						<p class="catalog-header-preview__logo-size m-t-5 m-b-0">
							{{ logo_size_mm }} mm
						</p>
					</div>

					<div class="catalog-header-preview__col catalog-header-preview__col--izquierda">
						<p
						v-if="company_name_visible"
						class="catalog-header-preview__company-name">
							{{ company_name_text }}
						</p>
						<row-list
						v-if="rows_visible"
						:rows="layout.izquierda"
						align="left"
						:disabled="drag_disabled"></row-list>
					</div>

					<div class="catalog-header-preview__col catalog-header-preview__col--derecha">
						<row-list
						v-if="rows_visible"
						:rows="layout.derecha"
						align="right"
						:disabled="drag_disabled"></row-list>
					</div>
				</div>

				<!-- 3. Barra de título y tabla simuladas: decoración, para ver dónde arranca la tabla -->
				<div class="catalog-header-preview__title-bar">
					<span class="catalog-header-preview__title-text">CATÁLOGO DE ARTÍCULOS</span>
					<span class="catalog-header-preview__title-date">{{ today_text }}</span>
				</div>

				<table class="catalog-header-preview__table">
					<thead>
						<tr>
							<th>Código</th>
							<th>Nombre</th>
							<th>Precio</th>
						</tr>
					</thead>
					<tbody>
						<tr
						v-for="n in 3"
						:key="n">
							<td></td>
							<td></td>
							<td></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script>
import moment from 'moment'
import RowList from '@/common-vue/components/pdf/catalog-header-designer/RowList.vue'
import LogoResizeHandle from '@/common-vue/components/pdf/header-designer/LogoResizeHandle.vue'
import {
	PREVIEW_PX_PER_MM,
	LOGO_SIZE_MM_MIN,
	LOGO_SIZE_MM_MAX,
	clamp_logo_size_mm,
	element_visible_on_page,
} from '@/common-vue/components/pdf/catalog-header-designer/catalog_header_designer_catalog'

/**
 * La "hoja" del diseñador del encabezado del catálogo: simula la primera (o la segunda)
 * página del PDF con la geometría real del render (ArticleTablePdf::Header()): banner,
 * logo a la izquierda, columna izquierda con el nombre del negocio, columna derecha
 * alineada a la derecha, y debajo la barra de título y el arranque de la tabla.
 *
 * El estado del layout vive en el padre (Index.vue del diseñador) y se muta por
 * referencia desde los RowList (drag & drop e inputs). Con `page_preview` en 2 se ve la
 * hoja tal como sale de la segunda en adelante (lo marcado "solo en la primera hoja"
 * desaparece) y el drag & drop queda apagado.
 */
export default {
	name: 'CatalogHeaderDesignerPreview',
	components: {
		RowList,
		LogoResizeHandle,
	},
	props: {
		/**
		 * Estado de trabajo del layout (ver catalog_header_designer_catalog.js).
		 */
		layout: {
			type: Object,
			required: true,
		},
		/**
		 * URL del logo del negocio (users.image_url), o null si no tiene.
		 */
		logo_url: {
			type: String,
			default: null,
		},
		/**
		 * Nombre del negocio a mostrar en la columna izquierda.
		 */
		company_name: {
			type: String,
			default: '',
		},
		/**
		 * Imagen de cabecera (banner) del perfil, si tiene.
		 */
		header_image_url: {
			type: String,
			default: null,
		},
		/**
		 * Hoja que se está previsualizando: 1 (primera) o 2 (segunda en adelante).
		 */
		page_preview: {
			type: Number,
			default: 1,
		},
		/**
		 * Ancho de hoja del perfil en mm, para dimensionar la previsualización.
		 */
		paper_width_mm: {
			type: Number,
			default: 210,
		},
		/**
		 * Margen por lado del perfil en mm (start_x del PDF).
		 */
		margin_mm: {
			type: Number,
			default: 5,
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
		 * @return {boolean}
		 */
		is_first_page() {
			return Number(this.page_preview) === 1
		},
		/**
		 * En la hoja 2 no se arrastra ni se edita: es solo para mirar cómo sale.
		 *
		 * @return {boolean}
		 */
		drag_disabled() {
			return !this.is_first_page
		},
		/**
		 * Tamaño del logo acotado, para dibujar aunque el input de mm esté a medio tipear.
		 *
		 * @return {number}
		 */
		logo_size_mm() {
			return clamp_logo_size_mm(this.layout.logo ? this.layout.logo.size_mm : null)
		},
		/**
		 * Banner: solo si el perfil tiene imagen de cabecera, y según la regla de hojas del logo.
		 *
		 * @return {boolean}
		 */
		banner_visible() {
			if (!this.header_image_url) {
				return false
			}
			return element_visible_on_page(this.layout.logo.pages, this.page_preview)
		},
		/**
		 * Logo (o su placeholder) según "Mostrar logo" y su regla de hojas.
		 *
		 * @return {boolean}
		 */
		logo_visible() {
			if (!this.layout.logo || !this.layout.logo.show) {
				return false
			}
			return element_visible_on_page(this.layout.logo.pages, this.page_preview)
		},
		/**
		 * Renglones (y nombre del negocio) según "Datos del negocio".
		 *
		 * @return {boolean}
		 */
		rows_visible() {
			return element_visible_on_page(this.layout.rows_pages, this.page_preview)
		},
		/**
		 * El nombre del negocio va con la misma regla de hojas que los renglones.
		 *
		 * @return {boolean}
		 */
		company_name_visible() {
			return !!(this.layout.company_name && this.layout.company_name.show) && this.rows_visible
		},
		/**
		 * Si no hay nada visible en esta hoja, el bloque no se dibuja (igual que el PDF, que no mueve y).
		 *
		 * @return {boolean}
		 */
		block_visible() {
			return this.logo_visible || this.rows_visible
		},
		/**
		 * @return {string}
		 */
		company_name_text() {
			return this.company_name ? this.company_name : 'Nombre del negocio'
		},
		/**
		 * Fecha de hoy como la imprime la barra de título del PDF (d/m/Y).
		 *
		 * @return {string}
		 */
		today_text() {
			return moment().format('DD/MM/YYYY')
		},
		/**
		 * Ancho de la hoja en px y márgenes del PDF llevados a px.
		 *
		 * @return {Object}
		 */
		sheet_style() {
			const width_mm = Number(this.paper_width_mm || 210)
			const margin_px = Math.round(Number(this.margin_mm || 5) * this.px_per_mm)
			return {
				width: Math.round(width_mm * this.px_per_mm) + 'px',
				paddingLeft: margin_px + 'px',
				paddingRight: margin_px + 'px',
			}
		},
		/**
		 * Recuadro del logo: cuadrado de size_mm (el PDF encaja la imagen adentro con su proporción).
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
		 * Propaga el nuevo tamaño del logo (mm) emitido por la manija hacia el padre.
		 *
		 * @param {number} new_size_mm Tamaño en mm, ya acotado por la manija.
		 * @return {void}
		 */
		on_logo_resize(new_size_mm) {
			this.$emit('update:logo_size_mm', new_size_mm)
		},
	},
}
</script>

<style lang="sass">
// ─── La hoja simula PAPEL ──────────────────────────────────────────────────────────
// Es la única superficie del sistema con blanco fijo, y a propósito: representa la hoja
// del PDF, que es blanca en modo claro y en modo oscuro. Por eso todos los colores de
// adentro (barra de título, encabezado de la tabla, inputs de los renglones) son los del
// render de ArticleTablePdf.php llevados a CSS, y NO tokens del tema. Lo que rodea a la
// hoja (nota, contenedor de scroll) sí va por token.
$papel-fondo: #fff
$papel-texto: #0f172a            // COLOR_TEXT_DARK
$papel-texto-suave: #64748b
$papel-borde: #cbd5e1            // COLOR_ROW_BORDER
$papel-barra-titulo: #5a626e     // COLOR_TITLE_BAR
$papel-encabezado-tabla: #1e3a8a // COLOR_HEADER_BG
$papel-fila-impar: #eff6ff       // COLOR_ROW_ODD
$papel-placeholder-fondo: rgba(0, 0, 0, .05)
$papel-placeholder-borde: rgba(0, 0, 0, .3)

.catalog-header-preview
	width: 100%
	min-width: 0

.catalog-header-preview__page-note
	font-style: italic

.catalog-header-preview__scroll
	width: 100%
	overflow-x: auto
	padding-bottom: 6px

.catalog-header-preview__sheet
	box-sizing: border-box
	padding-top: 12px
	padding-bottom: 12px
	background: $papel-fondo
	color: $papel-texto
	border: 1px solid var(--color-border)
	border-radius: 4px
	box-shadow: 0 1px 3px var(--shadow-color)

.catalog-header-preview__sheet--page-2
	opacity: .92

.catalog-header-preview__banner
	margin-bottom: 8px

	img
		display: block
		width: 100%
		height: auto

.catalog-header-preview__block
	display: flex
	align-items: flex-start
	gap: 8px
	margin-bottom: 8px

.catalog-header-preview__logo-col
	flex: 0 0 auto
	display: flex
	flex-direction: column
	align-items: center

.catalog-header-preview__logo
	position: relative
	display: flex
	align-items: center
	justify-content: center
	overflow: visible

	img
		max-width: 100%
		max-height: 100%
		object-fit: contain

.catalog-header-preview__logo--placeholder
	background: $papel-placeholder-fondo
	border: 1px dashed $papel-placeholder-borde

.catalog-header-preview__logo-placeholder
	font-size: 9px
	line-height: 1.2
	text-align: center
	color: $papel-texto-suave
	padding: 2px

.catalog-header-preview__logo-size
	font-size: 10px
	color: $papel-texto-suave

.catalog-header-preview__col
	min-width: 0

// Columna izquierda hasta el 58% del ancho útil (menos el logo), derecha desde el 60%:
// la misma partición que usa el PDF.
.catalog-header-preview__col--izquierda
	flex: 1 1 0

.catalog-header-preview__col--derecha
	flex: 0 0 40%

.catalog-header-preview__company-name
	font-weight: 700
	font-size: 14px
	margin-bottom: 6px
	word-break: break-word

.catalog-header-preview__title-bar
	display: flex
	align-items: center
	justify-content: space-between
	gap: 8px
	padding: 6px 8px
	border-radius: 6px
	background: $papel-barra-titulo
	color: #fff
	margin-bottom: 5px

.catalog-header-preview__title-text
	font-weight: 700
	font-size: 11px

.catalog-header-preview__title-date
	font-size: 9px

.catalog-header-preview__table
	width: 100%
	border-collapse: collapse
	font-size: 9px

	th
		background: $papel-encabezado-tabla
		color: #fff
		font-weight: 600
		padding: 4px 6px
		text-align: left

	td
		height: 16px
		border-bottom: 1px solid $papel-borde

	tbody tr:nth-child(odd) td
		background: $papel-fila-impar

// Los renglones viven adentro de la hoja: van con los colores del papel, y con más
// especificidad que las reglas de html.dark-mode de _dark_theme.sass (tres clases contra
// dos + etiqueta), para que en modo oscuro los inputs no queden negros sobre la hoja blanca.
.catalog-header-preview__sheet
	.catalog-row__input.form-control
		background: $papel-fondo
		color: $papel-texto
		border-color: $papel-borde

		&:focus
			background: $papel-fondo
			color: $papel-texto

		&:disabled
			background: $papel-fila-impar
			color: $papel-texto
			opacity: 1

		&::placeholder
			color: $papel-texto-suave

	.catalog-row__handle
		color: $papel-texto-suave

	.catalog-row__remove
		color: $papel-texto-suave

		&:hover:not(:disabled)
			color: $papel-texto

	.catalog-row-list__drop
		border-color: $papel-borde

	.catalog-row-list__empty
		color: $papel-texto-suave

// Teléfono: las dos columnas apiladas (izquierda arriba, derecha abajo) para que los
// inputs se puedan usar; la hoja deja de tener ancho fijo y toma el del contenedor.
@media (max-width: 767px)
	.catalog-header-preview__sheet
		width: 100% !important

	.catalog-header-preview__block
		flex-wrap: wrap

	.catalog-header-preview__col--izquierda,
	.catalog-header-preview__col--derecha
		flex: 1 1 100%
</style>
