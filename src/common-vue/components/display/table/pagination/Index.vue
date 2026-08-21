<template>
	<!-- Contenedor externo: centra la barra sin forzar ancho completo en escritorio -->
	<div
	v-if="mostrar_barra_paginacion"
	class="table-filter-pagination-wrap m-b-15 m-t-15">

		<div
		class="table-filter-pagination-bar">

			<span
			class="pagination-bar-meta">
				{{ numero_es(total_results) }} resultados
			</span>

			<span
			class="pagination-bar-separator"
			aria-hidden="true"></span>

			<b-pagination
			class="pagination-bar-pages m-0"
			pills
			v-model="current_page"
			:total-rows="total_results"
			:per-page="per_page_desde_store"
			></b-pagination>

			<span
			class="pagination-bar-separator"
			aria-hidden="true"></span>

			<div
			class="pagination-bar-per-page">
				<label
				class="lbl-per-page"
				:for="'per-page-'+model_name">
					Por página
				</label>
				<b-form-input
				:id="'per-page-'+model_name"
				v-model="per_page_input"
				class="input-per-page"
				type="number"
				min="1"
				max="200"
				size="sm"
				@keyup.enter="aplicarPerPageYFiltrar"
				/>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		/**
		 * Paginación de búsqueda acotada al submódulo papelera cuando la tabla es papelera.
		 */
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			currentPage: 1,
			se_inicio_nueva_busqueda: false,
			// Valor editable hasta confirmar con Enter (sync inicial en created).
			per_page_input: '25',
		}
	},
	created() {
		this.syncPerPageInputDesdeStore()
	},
	computed: {
		/**
		 * Muestra la barra si hay filtro activo y al menos un resultado (permite cambiar por página aunque last_page sea 1).
		 */
		mostrar_barra_paginacion() {
			if (!this.model_name) {
				return false
			}
			let filtrado = false

			if (this.papelera) {
				filtrado = this.$store.state.papelera[this.model_name].is_filtered
			} else {
				filtrado = this.$store.state[this.model_name].is_filtered
			}

			if (filtrado) {
				return this.total_results > 0
			} 
			
			/*
				Pregunto si es article porque article tiene use_per_page=true porque se descargan los articulos al iniciar para el modo offline
				La idea es que use_per_page sea true solo en los modelos que se manejan por fechas
			*/
			if (
				this.model_name != 'article'
				&& this.model_name != 'client'
			) {
				return this.$store.state[this.model_name].use_per_page
			}

		},
		total_results() {
			if (this.papelera) {
				return this.$store.state.papelera[this.model_name].total_filter_results
			}
			return this.$store.state[this.model_name].total_filter_results
		},
		per_page_desde_store() {
			let st = this.$store.state[this.model_name]
			if (!st || typeof st.filter_per_page === 'undefined' || st.filter_per_page === null) {
				return 5
			}
			return st.filter_per_page
		},
		current_page: {
			get() {
				if (this.papelera) {
					return this.$store.state.papelera[this.model_name].filter_page
				}
				return this.$store.state[this.model_name].filter_page
			},
			set(value) {
				let path = this.papelera
					? ('papelera/' + this.model_name + '/setFilterPage')
					: (this.model_name + '/setFilterPage')
				this.$store.commit(path, value)
			}
		},
	},
	methods: {
		/**
		 * Alinea el input con el valor persistido en el store del modelo (article/sale).
		 */
		syncPerPageInputDesdeStore() {
			let n = this.per_page_desde_store
			if (n) {
				this.per_page_input = String(n)
			}
		},
		/**
		 * Valida rango, guarda en store, vuelve a página 1 y repite la búsqueda filtrada.
		 */
		aplicarPerPageYFiltrar() {
			let n = parseInt(this.per_page_input, 10)
			if (isNaN(n) || n < 1) {
				n = 5
			}
			if (n > 200) {
				n = 200
			}
			this.$store.commit(this.model_name + '/setFilterPerPage', n)
			this.per_page_input = String(n)
			let path = this.papelera
				? ('papelera/' + this.model_name + '/setFilterPage')
				: (this.model_name + '/setFilterPage')
			this.$store.commit(path, 1)
			let that = this
			this.$nextTick(function () {
				that.$emit('filtrar')
			})
		},
	},
	watch: {
		model_name() {
			this.syncPerPageInputDesdeStore()
		},
		per_page_desde_store() {
			this.syncPerPageInputDesdeStore()
		},
		current_page() {
			this.$emit('filtrar')
			return
		},
		currentPage() {
			if (!this.se_inicio_nueva_busqueda) {
				this.$emit('setCurrentPage', this.currentPage)
			}
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

// Centra la barra compacta sobre la tabla sin ocupar todo el ancho en escritorio.
.table-filter-pagination-wrap
	display: flex
	justify-content: center
	width: 100%
	box-sizing: border-box
	padding: 0 0.5rem

// Chip flotante: ancho según contenido en desktop; card compacta en mobile.
//
// Altura (misión 27, 11/8/2026): la toma del mismo token que el resto de los controles del
// sistema, en vez de derivarla de su propio padding. Pedido de Lucas: "con un alto acorde al
// buscador general, que está sobre ese componente" — era el único control de esa zona que no
// respetaba la altura del sistema, y con el padding propio medía ~37px contra los 36 del pill.
// El padding vertical pasa a 0 porque ahora la caja la fija la altura; el horizontal queda igual.
//
// El radio de cápsula (999px) se MANTIENE a propósito: es la misma lógica que el pill del
// buscador, y está bien que esto se lea como una cápsula y no como un botón. Los botones de la
// barra van a --toolbar-btn-radius justamente porque son otra cosa (ver la nota larga en
// src/sass/_toolbar_botones.sass).
.table-filter-pagination-bar
	display: inline-flex
	align-items: center
	justify-content: center
	flex-wrap: nowrap
	gap: 0.65rem
	width: auto
	max-width: 100%
	box-sizing: border-box
	height: var(--toolbar-control-h)
	padding: 0 0.85rem
	border-radius: 999px
	border: 1px solid transparent
	// Estas tres líneas se convirtieron de `@if ($theme)` a tokens porque esta misión las tocaba
	// igual por el cambio de altura. El resto del archivo sigue con `@if ($theme == 'dark')`, que
	// es una variable de COMPILACIÓN de Sass y no la clase `html.dark-mode` en tiempo de ejecución
	// que usa el resto del sistema: o sea que este componente no participa del tema oscuro
	// dinámico. Arreglarlo entero estaba fuera del alcance de la misión y quedó como hallazgo, con
	// la lista exacta de líneas.
	background-color: var(--bg-card)
	border-color: var(--color-border)
	box-shadow: 0 4px 16px var(--shadow-color)

// Contador de resultados: tipografía secundaria, sin dominar la barra.
.pagination-bar-meta
	font-size: 0.8125rem
	font-weight: 500
	line-height: 1.2
	white-space: nowrap
	@if ($theme == 'dark')
		color: rgba(255, 255, 255, 0.72)
	@else
		color: rgba(33, 37, 41, 0.72)

// Separadores verticales entre bloques (solo escritorio).
.pagination-bar-separator
	display: inline-block
	width: 1px
	height: 1.35rem
	flex-shrink: 0
	@if ($theme == 'dark')
		background-color: rgba(255, 255, 255, 0.12)
	@else
		background-color: rgba(0, 0, 0, 0.08)

// Paginación bootstrap-vue: pills compactos y sin bordes duros.
//
// 🔴 Estas reglas iban con `::v-deep` y NO SE APLICABAN NUNCA (misión 35, 12/8/2026). El
// `<style>` de este componente no es `scoped`, y sin scopeId vue-loader no tiene por qué
// transformar `::v-deep`: sale literal al CSS, el navegador no lo entiende y descarta la regla
// entera al parsear. Por eso el `.page-link` se veía con el `padding: 0.5rem 0.75rem` de
// Bootstrap y sin `min-width`, no con lo declarado acá.
//
// Medido en la aplicación corriendo, antes y después de sacar el `::v-deep` y sin tocar ningún
// valor: el padding computado pasó de `8px 12px` (Bootstrap) a `4.48px 8.8px` (o sea los
// `0.28rem 0.55rem` de este archivo). Esa es la prueba de que el `::v-deep` era la causa.
//
// Si alguien lo repone "para llegar al hijo": en un `<style>` sin `scoped` no hace falta —
// el CSS ya es global y un descendiente común alcanza. Y si algún día este bloque se vuelve
// `scoped`, entonces sí, pero ahí hay que revisar TODO el archivo, no una regla.
//
// 🔴 Y ojo con el `&`: `b-pagination` renderiza UN SOLO elemento,
// `<ul class="pagination b-pagination b-pagination-pills pagination-bar-pages">`. O sea que
// `.pagination` y `.pagination-bar-pages` son EL MISMO nodo, no uno adentro del otro. Un
// `.pagination-bar-pages .pagination` (descendiente) no matchea nada. Se midió pasando: escrito
// como descendiente, ninguna de estas reglas se aplicaba y el `.page-link` volvía a los 35,77x34
// de Bootstrap.
.pagination-bar-pages
	flex-shrink: 0

	&.pagination
		margin: 0
		gap: 0.15rem

	// El item es flex para que el botón mande la altura y no quede el hueco de línea del inline.
	.page-item
		display: flex
		margin: 0

	// Altura propia y menor que la de la barra: con la caja de 36px que le puso la misión 27, un
	// botón sin altura declarada quedaba a 1px del borde. Con 26px quedan 5px arriba y abajo.
	// El min-width iguala a la altura para que un número de un dígito sea un círculo y no una
	// píldora achatada; el centrado lo hace flex y no el padding, que es lo que permite que el
	// botón mida lo mismo con "1" que con "12".
	// 🔴 El `&.pagination` NO es decorativo: sube el selector de (0,2,0) a (0,3,0). Sin él pierde
	// contra `html.dark-mode .page-link` de _dark_theme.sass, que es (0,2,1) --empatan en clases y
	// decide el elemento `html`-- y en modo oscuro el fondo declarado acá no se aplicaba: quedaba
	// `--bg-card`, o sea EL MISMO tono que el fondo de la cápsula que los contiene, y los botones
	// de página se fundían con la barra. Medido en la aplicación con `html.dark-mode` puesto: bg
	// del botón rgb(46,51,58) contra bg de la barra rgb(46,51,58).
	//
	// Va con `&` y no con un espacio por lo que dice la nota de arriba: las dos clases viven en el
	// mismo `<ul>`.
	//
	// El `.page-item.active` de Bootstrap NO se pisa y sigue mandando, porque el activo se pinta
	// con un selector que incluye al `.page-item` y llega más lejos que este. Verificado midiendo
	// el activo en los dos temas: rgb(0,123,255) en claro y rgb(77,163,255) en oscuro.
	&.pagination .page-link
		display: flex
		align-items: center
		justify-content: center
		height: 26px
		min-width: 26px
		padding: 0 0.3rem
		border: none
		border-radius: 999px
		font-size: 0.8125rem
		line-height: 1
		transition: background-color 0.15s ease, color 0.15s ease
		// Tokens y no `@if ($theme == 'dark')`: ver la nota del hallazgo al final del archivo.
		// El reposo va a --bg-section y el hover a --bg-hover, que es la semántica de los dos
		// tokens y ademas los separa del fondo de la capsula (--bg-card) en los dos temas.
		background-color: var(--bg-section)
		color: var(--color-text-primary)

	// 🔴 Acá había un `box-shadow: none` y se SACÓ, porque activarlo rompía el foco de teclado en
	// todas las tablas del sistema. Bootstrap pone el anillo de foco del `.page-link` con
	// `box-shadow` y le apaga el `outline` (`.page-link:focus { outline: 0; box-shadow: 0 0 0
	// .2rem rgba(0,123,255,.25) }`). Mientras la regla iba con `::v-deep` el navegador la
	// descartaba y el anillo se veía; al hacerla válida, el `none` lo apagaba y no quedaba NINGÚN
	// indicador de foco. Bootstrap no le pone sombra al `.page-link` en reposo, asi que ese `none`
	// no estaba tapando nada: solo podia romper.

	// 🔴 Y el hover se declara acá, por el mismo motivo: con el fondo propio ganandole al
	// `.page-link:hover` de Bootstrap, los botones dejaban de responder al mouse --el `transition`
	// de arriba no transicionaba nada--.
	//
	// El `:not(.active)` NO es adorno: `.page-item.active .page-link` de Bootstrap es (0,3,0) y una
	// regla de hover con la pseudo-clase llega a (0,4,0), asi que sin el `:not()` pasar el mouse
	// por la pagina actual le sacaba el azul. El `.disabled` no necesita exclusion: Bootstrap le
	// pone `pointer-events: none`.
	&.pagination .page-item:not(.active) .page-link:hover,
	&.pagination .page-item:not(.active) .page-link:focus
		background-color: var(--bg-hover)
		color: var(--color-text-primary)

	.page-item.active .page-link
		font-weight: 600

	.page-item.disabled .page-link
		opacity: 0.45

// Selector "por página": label + input alineados en una sola fila.
.pagination-bar-per-page
	display: inline-flex
	align-items: center
	flex-wrap: nowrap
	gap: 0.4rem
	flex-shrink: 0

	// Label "Por página": secundario, sin dominar la barra.
	.lbl-per-page
		margin: 0
		font-size: 0.75rem
		font-weight: 500
		line-height: 1.2
		white-space: nowrap
		@if ($theme == 'dark')
			color: rgba(255, 255, 255, 0.72)
		@else
			color: rgba(33, 37, 41, 0.62)

	// Input "por página" con especificidad aumentada para que el border-radius de pill (999px)
	// gane sobre .form-control-sm de Bootstrap. Sin !important: especificidad de dos clases
	// (.pagination-bar-per-page .input-per-page) supera la de una sola clase (.form-control-sm).
	// 4.5rem y no 3.5rem (misión 35): con el valor máximo --200, tres dígitos-- y el campo
	// enfocado, Chrome reserva a la derecha el espacio de las flechas del `type="number"`, y el
	// interior útil bajaba a 38,8px para un texto de 24,3px. Entraba, pero sin aire. Medido en la
	// aplicación, no estimado.
	.input-per-page
		width: 4.5rem
		min-width: 4.25rem
		padding: 0.2rem 0.35rem
		border-radius: 999px
		text-align: center
		font-size: 0.8125rem
		line-height: 1.2
		// Tokens y no `@if ($theme == 'dark')`: ver la nota del hallazgo al final del archivo.
		background-color: var(--bg-section)
		border-color: var(--color-border)
		color: var(--color-text-primary)

		&:focus
			box-shadow: 0 0 0 0.15rem rgba($blue, 0.18)

// Mobile: card apilada, legible y sin overflow horizontal.
@media (max-width: 575px)
	.table-filter-pagination-bar
		flex-direction: column
		align-items: stretch
		width: 100%
		max-width: 20rem
		// Vuelve a altura automática: acá la barra se apila en tres filas y una caja de 36px las
		// aplastaría. La altura fija es para la variante en línea del escritorio, que es la que
		// tiene que alinearse con el pill del buscador.
		height: auto
		padding: 0.65rem 0.75rem
		border-radius: 0.85rem
		gap: 0.55rem

	.pagination-bar-meta
		text-align: center

	.pagination-bar-separator
		display: none

	.pagination-bar-pages
		display: flex
		justify-content: center
		width: 100%

		// El blanco de toque vuelve a un tamaño de dedo. Los 26px de la variante en línea salen de
		// tener que dejar aire adentro de una cápsula de 36px, que es una restricción del
		// escritorio; acá la barra se apila con `height: auto` y esa restricción no existe, así que
		// achicar el botón solo empeoraría el toque. Antes de esta misión medían ~34px (los de
		// Bootstrap), o sea que sin esto el cambio los dejaba en tres cuartos.
		//
		// `&.pagination` por lo mismo que arriba: las dos clases son el mismo `<ul>`. Y queda en
		// (0,4,0) contra los (0,3,0) de la regla base, así que gana por especificidad.
		&.pagination .page-link
			height: 34px
			min-width: 34px

	.pagination-bar-per-page
		justify-content: center
		width: 100%
		padding-top: 0.15rem
		border-top: 1px solid rgba(0, 0, 0, 0.06)

		@if ($theme == 'dark')
			border-top-color: rgba(255, 255, 255, 0.1)

// --- Lo que TODAVÍA decide colores con `@if ($theme == 'dark')` -------------------------------
// `$theme` es una variable de COMPILACIÓN de Sass, fijada en 'light' en `_custom.scss`, y no la
// clase `html.dark-mode` de tiempo de ejecución que usa el resto del sistema: la rama oscura de
// cada uno de estos `@if` no se compila nunca. Son ramas muertas que dan la falsa impresión de
// que el componente tiene tema oscuro (hallazgo
// `20260811-dos-sistemas-de-tema-oscuro-y-uno-es-codigo-muerto`).
//
// La misión 27 convirtió las tres del chasis de la barra; la 35 convirtió las dos reglas que
// tocaba igual --`.page-link` y `.input-per-page`--. Queda sin convertir, sobre este archivo:
//
//   | regla                                        | propiedades       |
//   |----------------------------------------------|-------------------|
//   | .pagination-bar-meta                         | color             |
//   | .pagination-bar-separator                    | background-color  |
//   | .lbl-per-page                                | color             |
//   | .pagination-bar-per-page (dentro del @media) | border-top-color  |
//
// Las cuatro son texto secundario y líneas divisorias, o sea lo de menor consecuencia del
// componente. Convertirlas entra en el hallazgo, no en esta misión: `--color-text-secondary` y
// `--color-border` son los tokens que les corresponden.
</style>
