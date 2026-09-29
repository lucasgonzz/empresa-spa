<template>
	<!--
		Bandeja "Campos del artículo" del editor de etiquetas (mision disenos-etiquetas-gondola,
		29/9/2026): todo lo que se puede poner en la etiqueta, con un item por cada lista de precios si
		el negocio trabaja con listas. Se puede poner varias veces el mismo (dos textos libres, dos
		precios...).

		- Con el mouse: se arrastra el item hasta la etiqueta y cae donde se suelta. Un clic sin
		  arrastrar lo agrega en un lugar libre.
		- Con el dedo: tocar el item lo agrega en un lugar libre; para arrastrarlo, se agarra de los
		  puntitos de la izquierda (el resto del item deja scrollear la bandeja).
		- Con el teclado: Tab hasta el item y Enter.

		El arrastre en si lo hace el lienzo (LienzoDeEtiqueta.empezar_nuevo): la bandeja solo avisa.
	-->
	<aside
	class="bandeja-campos"
	aria-label="Campos del artículo">

		<div class="bandeja-campos__cabecera">
			<span class="bandeja-campos__titulo">
				<i class="bi bi-plus-square"></i>
				Campos del artículo
			</span>
		</div>
		<p class="bandeja-campos__ayuda">
			<template v-if="lleno">
				La etiqueta ya tiene {{ TOPE_DE_CAMPOS }} campos. Quitá alguno para agregar otro.
			</template>
			<template v-else>
				Arrastralos a la etiqueta, o tocalos y se ponen solos en un lugar libre.
			</template>
		</p>

		<div
		v-for="grupo in grupos"
		:key="grupo.clave"
		class="bandeja-campos__grupo">
			<p class="bandeja-campos__seccion">{{ grupo.titulo }}</p>
			<button
			v-for="plantilla in grupo.plantillas"
			:key="plantilla.clave"
			type="button"
			class="bandeja-campos__item"
			:title="plantilla.ayuda"
			:disabled="lleno"
			:aria-label="'Agregar ' + plantilla.nombre + ' a la etiqueta'"
			@pointerdown="al_apretar($event, plantilla)"
			@click="al_hacer_click($event, plantilla)">
				<span
				class="bandeja-campos__agarre"
				data-agarre="si"
				aria-hidden="true">
					<i class="bi bi-grip-vertical"></i>
				</span>
				<i
				class="bi bandeja-campos__icono"
				:class="plantilla.icono"
				aria-hidden="true"></i>
				<span class="bandeja-campos__nombre">{{ plantilla.nombre }}</span>
				<span
				class="bandeja-campos__mas"
				aria-hidden="true">
					<i class="bi bi-plus-lg"></i>
				</span>
			</button>
		</div>
	</aside>
</template>
<script>
import { TIPOS } from '../catalogo'
import { TOPE_DE_CAMPOS } from '../geometria'

/* En que grupo de la bandeja va cada tipo (los que no estan aca van a "Del artículo") */
const GRUPO_DEL_TIPO = {
	precio_final: 'precios',
	precio_lista: 'precios',
	precio_anterior: 'precios',
	precio_promocional: 'precios',
	fecha_impresion: 'otros',
	texto_fijo: 'otros',
}

/**
 * Bandeja de campos del editor de etiquetas.
 */
export default {
	name: 'BandejaDeCampos',
	props: {
		/* Listas de precios del negocio */
		listas: {
			type: Array,
			default: function () {
				return []
			},
		},
		/* Si el negocio trabaja con listas de precios (sin listas no se ofrece "Precio de una lista") */
		usa_listas: {
			type: Boolean,
			default: false,
		},
		/* true si la etiqueta ya tiene el tope de campos */
		lleno: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			TOPE_DE_CAMPOS: TOPE_DE_CAMPOS,
			/* true si el ultimo toque fue un dedo sobre el item (no sobre los puntitos): el click lo agrega */
			ultimo_toque_directo: false,
		}
	},
	computed: {
		/**
		 * Los items de la bandeja, en tres grupos: precios, datos del articulo y otros.
		 *
		 * @returns {Array}
		 */
		grupos() {
			let self = this
			let grupos = {
				precios: { clave: 'precios', titulo: 'Precios', plantillas: [] },
				articulo: { clave: 'articulo', titulo: 'Del artículo', plantillas: [] },
				otros: { clave: 'otros', titulo: 'Otros', plantillas: [] },
			}

			TIPOS.forEach(function (def) {
				let grupo = grupos[GRUPO_DEL_TIPO[def.tipo] || 'articulo']

				if (def.tipo === 'precio_lista') {
					if (!self.usa_listas) {
						return
					}
					/* Un item por lista: "Precio · Mayorista" */
					self.listas.forEach(function (lista) {
						grupo.plantillas.push({
							clave: 'precio_lista_' + lista.id,
							tipo: def.tipo,
							price_type_id: lista.id,
							nombre: 'Precio · ' + lista.name,
							icono: def.icono,
							ayuda: 'El precio final de la lista ' + lista.name + '.',
						})
					})
					return
				}

				grupo.plantillas.push({
					clave: def.tipo,
					tipo: def.tipo,
					price_type_id: null,
					nombre: def.nombre,
					icono: def.icono,
					ayuda: def.ayuda,
				})
			})

			return [grupos.precios, grupos.articulo, grupos.otros]
		},
	},
	methods: {
		/**
		 * Se aprieta un item: con el mouse (o con el dedo sobre los puntitos) empieza el arrastre.
		 *
		 * @param {PointerEvent} evento
		 * @param {Object} plantilla
		 * @returns {void}
		 */
		al_apretar(evento, plantilla) {
			this.ultimo_toque_directo = false

			if (evento.pointerType === 'mouse' && evento.button !== 0) {
				return
			}

			let en_el_agarre = !!(evento.target && evento.target.closest && evento.target.closest('[data-agarre]'))

			if (evento.pointerType === 'touch' && !en_el_agarre) {
				/* Un dedo sobre el item: se deja scrollear, y si fue un toque, lo agrega el click */
				this.ultimo_toque_directo = true
				return
			}

			/* Sin esto el navegador selecciona el texto del item mientras se arrastra */
			evento.preventDefault()
			this.$emit('agarrar', evento, plantilla)
		},
		/**
		 * Clic en un item. Solo agrega si vino del teclado (Enter) o de un toque directo con el dedo:
		 * el clic del mouse ya lo resolvio el lienzo (si no se arrastro, agrega en un lugar libre).
		 *
		 * @param {MouseEvent} evento
		 * @param {Object} plantilla
		 * @returns {void}
		 */
		al_hacer_click(evento, plantilla) {
			if (evento.detail === 0 || this.ultimo_toque_directo) {
				this.ultimo_toque_directo = false
				this.$emit('agregar', plantilla)
			}
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token (esta parte es interfaz, no papel)
.bandeja-campos
	display: flex
	flex-direction: column
	gap: 4px
	min-width: 0
	padding: 12px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)

.bandeja-campos__cabecera
	display: flex
	align-items: center
	justify-content: space-between

.bandeja-campos__titulo
	display: inline-flex
	align-items: center
	gap: 8px
	color: var(--color-text-primary)
	font-size: 0.9rem
	font-weight: 700

	i
		color: var(--color-primary)

.bandeja-campos__ayuda
	margin: 0 0 6px
	color: var(--color-text-secondary)
	font-size: 0.75rem
	line-height: 1.4

.bandeja-campos__grupo
	display: flex
	flex-direction: column
	gap: 4px
	margin-bottom: 6px

.bandeja-campos__seccion
	margin: 6px 0 2px
	color: var(--color-text-secondary)
	font-size: 0.68rem
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.04em

.bandeja-campos__item
	display: flex
	align-items: center
	gap: 8px
	width: 100%
	min-width: 0
	padding: 6px 8px 6px 4px
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.8rem
	text-align: left
	cursor: grab
	user-select: none
	// El dedo sobre el item scrollea la bandeja; el arrastre con el dedo va por los puntitos
	touch-action: pan-y
	transition: border-color .15s ease, background .15s ease

	&:hover:not(:disabled)
		border-color: var(--color-primary)
		background: var(--bg-hover)

		.bandeja-campos__mas
			color: var(--color-primary)

	&:focus
		outline: none

	&:focus-visible
		border-color: var(--color-primary)
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

	&:disabled
		opacity: .45
		cursor: default

.bandeja-campos__agarre
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 auto
	width: 18px
	color: var(--color-text-secondary)
	touch-action: none

.bandeja-campos__icono
	flex: 0 0 auto
	color: var(--color-primary)

.bandeja-campos__nombre
	flex: 1 1 auto
	min-width: 0
	// El nombre entra entero, en dos renglones si hace falta: cortado con "…" los dos codigos de
	// barras ("Código de barras (dibujo)" y "(número)") quedaban iguales
	white-space: normal
	overflow-wrap: break-word
	line-height: 1.25

.bandeja-campos__mas
	flex: 0 0 auto
	color: var(--color-text-secondary)
	font-size: 0.75rem

// Con el dedo, los puntitos mas anchos para poder agarrarlos
@media (hover: none), (pointer: coarse)
	.bandeja-campos__agarre
		width: 28px
		align-self: stretch

	.bandeja-campos__item
		padding-top: 9px
		padding-bottom: 9px
</style>
