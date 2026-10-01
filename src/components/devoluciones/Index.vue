<template>
	<!--
		Módulo de Devoluciones (notas de crédito), rehecho en la misión
		devoluciones-compras-y-rediseno (1/10/2026).

		Hasta acá eran ocho bloques apilados sin jerarquía. Ahora:
		- arriba, el título y el selector Venta / Compra (sobre qué se hace la nota de crédito);
		- a la izquierda, las tarjetas de trabajo: Origen (el comprobante o la contraparte),
			Artículos, Descuentos y recargos (solo venta) y Descripciones (solo con la extensión);
		- a la derecha, el panel de resumen: el total como número grande, las opciones y Guardar.

		En tablet y teléfono la grilla pasa a una sola columna y el resumen queda al final.
	-->
	<div
	class="devoluciones-modulo"
	:class="'devoluciones-modulo--'+tipo">

		<header class="dev-encabezado">
			<div class="dev-encabezado__textos">
				<h4 class="dev-encabezado__titulo">
					Devoluciones
				</h4>
				<p class="dev-encabezado__subtitulo">
					{{ subtitulo }}
				</p>
			</div>

			<div class="dev-encabezado__selector">
				<tipo-selector></tipo-selector>
			</div>
		</header>

		<div class="dev-grilla">

			<div class="dev-contenido">

				<origen></origen>

				<articulos></articulos>

				<discounts-surchages></discounts-surchages>

				<descriptions></descriptions>
			</div>

			<aside class="dev-lateral">
				<resumen></resumen>
			</aside>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		TipoSelector: () => import('@/components/devoluciones/components/TipoSelector'),
		Origen: () => import('@/components/devoluciones/components/origen/Index'),
		Articulos: () => import('@/components/devoluciones/components/articulos/Index'),
		DiscountsSurchages: () => import('@/components/devoluciones/components/discounts-surchages/Index'),
		Descriptions: () => import('@/components/devoluciones/components/descriptions/Index'),
		Resumen: () => import('@/components/devoluciones/components/resumen/Index'),
	},
	computed: {
		/**
		 * 'venta' o 'compra': sobre qué se hace la nota de crédito.
		 *
		 * @returns {String}
		 */
		tipo() {
			return this.$store.state.devoluciones.tipo
		},
		/**
		 * Bajada del título según el modo, para que se entienda de un vistazo qué se está haciendo.
		 *
		 * @returns {String}
		 */
		subtitulo() {
			if (this.tipo == 'compra') {
				return 'Nota de crédito a un proveedor: devolvés mercadería de una compra.'
			}
			return 'Nota de crédito a un cliente: te devuelven mercadería de una venta.'
		},
	},
}
</script>
<style lang="sass">
// Vocabulario visual del módulo de Devoluciones (misión devoluciones-compras-y-rediseno).
//
// 🔴 Va SIN `scoped` y todo colgado de `.devoluciones-modulo`, por dos motivos:
// 1. Los hijos son componentes de bootstrap-vue, del buscador común y el toggle de Vender: un
//    estilo `scoped` no llega adentro de ellos.
// 2. El toggle estilo iPhone (VenderToggle) trae su estilo en
//    components/vender/sass/_vender-client-block.sass, que solo se carga con el chunk de Vender.
//    Entrando derecho a /devoluciones ese CSS no existe y el toggle se ve como un checkbox pelado.
//    Por eso el toggle se dibuja acá entero, con tokens (el de Vender tiene grises y verde fijos).
//
// Colores SIEMPRE por token (_dark_theme.sass). Los pocos que no existen en el sistema se declaran
// como tokens del módulo, con su variante oscura debajo.
//
// Y acá NO se declara font-size de inputs ni selects: lo manda _inputs.sass / _ui_sizes.sass según la
// preferencia de tamaño del usuario (mismo criterio que _metodos_de_pago.sass).

.devoluciones-modulo
	// Radio de las tarjetas: superficie, más redondeada que los controles (8px).
	--dev-radio-tarjeta: 14px
	// Sombra de las tarjetas: muy suave, para que separe sin marcar un borde.
	--dev-sombra: rgba(15, 23, 42, 0.06)
	// Verde del toggle encendido: el verde de sistema de iOS. El de Vender (#22c55e) está fijo y
	// sin variante oscura; acá va como token con su par oscuro.
	--dev-toggle-on: #34c759
	// Perilla del toggle: blanca en los dos modos, como en iOS.
	--dev-toggle-thumb: #fff
	--dev-toggle-thumb-sombra: rgba(0, 0, 0, 0.22)

	max-width: 1280px
	margin: 0 auto
	padding: 24px 16px 96px
	// #app centra el texto de todo el sistema; un módulo de trabajo se lee alineado a la izquierda.
	text-align: left
	color: var(--color-text-primary)

html.dark-mode .devoluciones-modulo
	--dev-sombra: rgba(0, 0, 0, 0.35)
	--dev-toggle-on: #30d158
	--dev-toggle-thumb-sombra: rgba(0, 0, 0, 0.5)

.devoluciones-modulo
	// --- Encabezado ------------------------------------------------------------------------------
	.dev-encabezado
		display: flex
		flex-wrap: wrap
		align-items: flex-end
		justify-content: space-between
		gap: 12px 24px
		margin-bottom: 24px

	.dev-encabezado__textos
		min-width: 0

	.dev-encabezado__titulo
		margin: 0
		font-size: 1.75rem
		font-weight: 600
		letter-spacing: -0.02em
		color: var(--color-text-primary)

	.dev-encabezado__subtitulo
		margin: 4px 0 0
		font-size: 0.9375rem
		color: var(--color-text-secondary)

	// HorizontalNav trae `width: 100%` en su raíz y un margin-top de 15px en cada hijo de
	// .cont-left (pensado para las barras de listado). Acá vive al lado del título: se le saca el
	// margen y se deja que mida lo que mide su pill.
	.dev-encabezado .dev-encabezado__selector
		flex: 0 0 auto
		max-width: 100%

		.cont-navs .cont-left > div
			margin-top: 0

		// El slot de "crear" del nav queda vacío acá; sin esto ocupa su lugar en la fila.
		.create-buttons:empty
			display: none

	// --- Grilla ----------------------------------------------------------------------------------
	// 🔴 Dos columnas recién desde 1200px y no desde 992px: entre 992 y 1024 (tablet apaisada) la
	// columna de trabajo quedaba en ~600px y la tabla de artículos se apretaba contra el panel.
	// En tablet y teléfono va una sola columna y el resumen queda al final, a lo ancho.
	.dev-grilla
		display: grid
		grid-template-columns: minmax(0, 1fr)
		gap: 20px

		@media screen and (min-width: 1200px)
			grid-template-columns: minmax(0, 1fr) 340px
			align-items: start

	.dev-contenido
		display: flex
		flex-direction: column
		gap: 20px
		min-width: 0

	.dev-lateral
		min-width: 0

		@media screen and (min-width: 1200px)
			position: sticky
			top: 16px

	// --- Tarjetas --------------------------------------------------------------------------------
	.dev-tarjeta
		background-color: var(--bg-card)
		border-radius: var(--dev-radio-tarjeta)
		box-shadow: 0 0 0 1px var(--color-border-secondary), 0 4px 16px var(--dev-sombra)
		padding: 20px

		@media screen and (max-width: 576px)
			padding: 16px

	.dev-tarjeta__encabezado
		display: flex
		align-items: flex-start
		justify-content: space-between
		flex-wrap: wrap
		gap: 8px 16px
		margin-bottom: 16px

	.dev-tarjeta__titulo
		margin: 0
		font-size: 1.0625rem
		font-weight: 600
		letter-spacing: -0.01em
		color: var(--color-text-primary)

	.dev-tarjeta__subtitulo
		margin: 2px 0 0
		font-size: 0.8125rem
		color: var(--color-text-secondary)

	.dev-tarjeta__acciones
		display: flex
		align-items: center
		gap: 8px

	// --- Etiquetas y campos ----------------------------------------------------------------------
	.dev-label
		display: block
		margin-bottom: 6px
		font-size: 0.8125rem
		font-weight: 500
		color: var(--color-text-secondary)

	// Patrón de inputs de contexto/estilo_interfaz_empresa.md §3: radio de 8px y anillo de foco
	// suave en vez del borde de 3px + halo del default global.
	//
	// 🔴 Y además el TAMAÑO, medido en el navegador a 1366px: sin esto el N° de venta/compra, los
	// inputs de la tabla y el select de depósito quedaban en 48px de alto con letra de 22.4px y
	// sombra, al lado del buscador (search-component) en 36px. Las reglas globales que los inflan
	// son estas, y se pisan exactamente esas propiedades:
	// - src/sass/_inputs.sass: `input.form-control` / `select.custom-select` { font-size: 1.4rem }
	//   (con .ui-small, src/sass/_ui_sizes.sass los baja a 1rem), y `input, select` { border: 2px }
	//   + `input:focus, select:focus` { border: 3px; box-shadow: 0 0 8px ... }.
	// - common-vue/sass/_inputs.sass: `input, textarea, select` { box-shadow: ... 1.95px 1.95px }.
	// - Bootstrap: `.form-control` { height: calc(1.5em + .75rem + 2px) }, que con 1.4rem da 48px.
	// Los valores se copian del campo del buscador (.search-field en
	// common-vue/components/search/Index.vue): alto var(--toolbar-control-h) (36px, 32px en el modo
	// compacto), letra 0.95rem, line-height 1.45. Así los dos tipos de campo miden lo mismo.
	//
	// `:not(.search-field__input)`: el input del buscador tiene su propio chasis (sin borde, alto
	// auto, el borde lo pone .search-field) y no se toca. En el select y el textarea el :not no
	// excluye nada: está para sumar peso y ganarle a `.ui-small select.custom-select` /
	// `.ui-small textarea.form-control` (_ui_sizes.sass), que si no les vuelven a poner height:
	// auto y su propio padding.
	.form-control:not(.search-field__input),
	.custom-select:not(.search-field__input)
		border-radius: var(--metodo-pago-input-radius)
		border: 1px solid var(--color-border)
		box-shadow: none
		font-size: 0.95rem
		line-height: 1.45
		&:focus
			border: 1px solid var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

	input.form-control:not(.search-field__input)
		height: var(--toolbar-control-h, 36px)
		padding: 0.25rem 0.7rem

	// El select lleva lugar a la derecha para su flecha.
	.custom-select:not(.search-field__input)
		height: var(--toolbar-control-h, 36px)
		padding: 0.25rem 1.75rem 0.25rem 0.7rem

	textarea.form-control:not(.search-field__input)
		height: auto
		min-height: var(--toolbar-control-h, 36px)
		padding: 0.4rem 0.7rem

	// Inputs numéricos compactos (precio, cantidades): no a lo ancho de la celda, a la derecha.
	.dev-input-num
		width: 104px
		margin-left: auto
		text-align: right
		font-variant-numeric: tabular-nums

	.dev-texto-secundario
		color: var(--color-text-secondary)

	// --- Botones ---------------------------------------------------------------------------------
	// Secundario "tinted" (relleno azul muy suave, texto azul): el idioma de iOS para una acción
	// que no es la principal. --bg-nav-hover es justamente ese celeste, con su variante oscura.
	.dev-btn-secundario.btn
		display: inline-flex
		align-items: center
		gap: 6px
		border: none
		border-radius: 8px
		padding: 6px 12px
		font-size: 0.875rem
		font-weight: 500
		color: var(--color-primary)
		background-color: var(--bg-nav-hover)
		box-shadow: none
		&:hover,
		&:focus
			color: var(--color-primary)
			background-color: var(--bg-nav-hover)
			filter: brightness(0.97)
			box-shadow: none

	// Botón de ícono solo (borrar renglón / descripción): discreto hasta el hover.
	.dev-btn-icono.btn
		display: inline-flex
		align-items: center
		justify-content: center
		width: 34px
		height: 34px
		padding: 0
		border: none
		border-radius: 50%
		color: var(--color-text-secondary)
		background-color: transparent
		box-shadow: none
		&:hover,
		&:focus
			color: var(--btn-peligro-texto)
			background-color: var(--btn-peligro-fondo)
			box-shadow: none

	// --- Estado vacío ----------------------------------------------------------------------------
	.dev-vacio
		padding: 32px 16px
		text-align: center
		color: var(--color-text-secondary)

		i
			display: block
			margin-bottom: 10px
			font-size: 2rem
			opacity: 0.6

		p
			margin: 0
			font-size: 0.9375rem

		.dev-vacio__detalle
			margin-top: 4px
			font-size: 0.8125rem

	// --- Chips -----------------------------------------------------------------------------------
	.dev-chip
		display: inline-flex
		align-items: center
		gap: 4px
		padding: 3px 10px
		border-radius: 999px
		font-size: 0.75rem
		font-weight: 500
		color: var(--color-text-secondary)
		background-color: var(--bg-section)
		box-shadow: inset 0 0 0 1px var(--color-border-secondary)

		&--acento
			color: var(--color-primary)
			background-color: var(--bg-nav-hover)
			box-shadow: none

	// --- Toggle estilo iPhone (VenderToggle) -----------------------------------------------------
	// Copia tokenizada de _vender-client-block.sass (ver el comentario de arriba de todo). Cada
	// selector lleva .devoluciones-modulo delante, así que si el CSS de Vender también está
	// cargado, este gana por especificidad y los dos no se pelean.
	.vender-toggle-row
		display: flex
		align-items: flex-start
		gap: 12px
		min-height: 32px
		cursor: pointer

	.vender-toggle
		position: relative
		display: inline-block
		flex-shrink: 0
		width: 46px
		height: 28px
		margin: 0
		cursor: pointer

		// Input nativo oculto pero presente: los specs lo encuentran por su data-testid y lo
		// prenden clickeando el <label> que lo envuelve (e2e/helpers/vender.js poner_toggle()).
		input
			position: absolute
			width: 0
			height: 0
			opacity: 0

		.vender-toggle__track
			position: absolute
			inset: 0
			border-radius: 999px
			background-color: var(--toggle-track-off)
			transition: background-color 0.2s ease

		.vender-toggle__thumb
			position: absolute
			left: 3px
			bottom: 3px
			width: 22px
			height: 22px
			border-radius: 50%
			background-color: var(--dev-toggle-thumb)
			box-shadow: 0 1px 3px var(--dev-toggle-thumb-sombra)
			transition: transform 0.2s ease

		input:checked ~ .vender-toggle__track
			background-color: var(--dev-toggle-on)

		input:checked ~ .vender-toggle__track .vender-toggle__thumb
			transform: translateX(18px)

		input:focus-visible ~ .vender-toggle__track
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

		&.vender-toggle--disabled
			opacity: 0.45
			cursor: not-allowed
			pointer-events: none

	.vender-toggle__label
		padding-top: 4px
		font-size: 0.9375rem
		line-height: 1.35
		color: var(--color-text-primary)
		cursor: pointer
		user-select: none

	// Bajada de un toggle (qué hace la opción), debajo del texto principal.
	.dev-toggle__ayuda
		display: block
		margin-top: 2px
		font-size: 0.8125rem
		color: var(--color-text-secondary)
</style>
