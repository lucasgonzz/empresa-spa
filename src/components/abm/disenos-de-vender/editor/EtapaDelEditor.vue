<template>
	<!--
		Una etapa de Vender en el lienzo del editor: el mismo numero y el mismo titulo que en Vender,
		y el subtitulo armado con los campos que tiene (subtitulo_de_etapa, el mismo que usa Vender),
		asi el comerciante ve en vivo como va a quedar el encabezado de la etapa.

		Debajo, la grilla de 12 columnas: las guias de fondo y, encima, la lista arrastrable con los
		campos. Cada campo ocupa sus N/12 con el mismo gutter que Vender (fila con margin 0 -8px,
		item con padding 0 8px y margin-bottom 10px).
	-->
	<section
	class="editor-etapa"
	:class="clases"
	:aria-label="'Etapa ' + numero + ': ' + titulo">

		<header class="editor-etapa__cabecera">
			<span class="editor-etapa__numero">{{ numero }}</span>
			<div class="editor-etapa__textos">
				<span class="editor-etapa__titulo">{{ titulo }}</span>
				<span
				class="editor-etapa__subtitulo"
				:title="subtitulo">{{ subtitulo || 'Sin campos' }}</span>
			</div>
			<span class="editor-etapa__cantidad">
				{{ cantidad }} {{ cantidad === 1 ? 'campo' : 'campos' }}
			</span>
		</header>

		<div class="editor-etapa__cuerpo">
			<div class="editor-etapa__grilla">

				<!-- Las 12 columnas de fondo. Se resaltan mientras se tira del borde de un campo -->
				<div
				class="editor-etapa__guias"
				aria-hidden="true">
					<span
					v-for="columna in 12"
					:key="columna"
					class="editor-etapa__guia"></span>
				</div>

				<!--
					Opciones de Sortable (vuedraggable las pasa tal cual):
					- forceFallback + fallbackOnBody: el campo que se arrastra lo dibuja Sortable (un
					  clon colgado de <body> que sigue al puntero) y no el navegador. Es lo que permite
					  darle sombra solo a lo que se esta arrastrando, y se comporta igual con mouse y con
					  el dedo. fallbackTolerance: unos pixeles de movimiento antes de empezar, para que un
					  clic no arranque un arrastre.
					- filter + preventOnFilter false: las manijas de ancho y los botones no arrancan un
					  arrastre, y el evento les sigue llegando (si no, la manija no podria capturar el
					  puntero y los botones no recibirian el clic).
					- delay 150 solo en tactil: con el dedo hay que mantener apretado un instante para
					  agarrar un campo; un deslizamiento rapido scrollea, como en cualquier lista.
					- scroll: cerca del borde del modal, la pantalla se mueve sola para poder llegar a
					  otra etapa o a la bandeja.
				-->
				<draggable
				class="editor-etapa__lista"
				:list="lista"
				:group="grupo"
				:move="move"
				:animation="150"
				draggable=".editor-diseno-arrastrable"
				filter=".editor-diseno-no-arrastra"
				:prevent-on-filter="false"
				ghost-class="editor-diseno-hueco"
				drag-class="editor-diseno-levantado"
				:force-fallback="true"
				:fallback-on-body="true"
				:fallback-tolerance="4"
				:delay="150"
				:delay-on-touch-only="true"
				:scroll-sensitivity="80"
				:scroll-speed="14"
				:data-etapa="etapa"
				@start="$emit('inicio-arrastre', $event)"
				@end="$emit('fin-arrastre', $event)">
					<elemento-del-editor
					v-for="item in lista"
					:key="identidad(item)"
					:item="item"
					:destacado="destacado === identidad(item)"
					@sacar="$emit('sacar', $event)"
					@redimension="redimensionando = $event"></elemento-del-editor>
				</draggable>

				<!-- Etapa vacia: el texto va encima de la zona de soltar, sin tapar el arrastre -->
				<div
				v-if="!lista.length"
				class="editor-etapa__vacia">
					<i class="bi bi-box-arrow-in-down"></i>
					<span>
						Arrastrá campos acá
						<small
						v-if="etapa !== 'etapa_2'"
						class="editor-etapa__vacia-nota">
							Mientras esté vacía, esta etapa no se muestra en Vender.
						</small>
					</span>
				</div>
			</div>

			<!-- Lo que la etapa tiene fijo (la tabla de articulos de la etapa 2) -->
			<div
			v-if="bloque_fijo"
			class="editor-diseno-fijo">
				<i class="bi bi-lock-fill"></i>
				<span>{{ bloque_fijo }}</span>
			</div>
		</div>
	</section>
</template>
<script>
import draggable from 'vuedraggable'
import ElementoDelEditor from './ElementoDelEditor'
import { TITULOS_DE_ETAPAS } from '@/components/vender/layout/elementos'
import { subtitulo_de_etapa } from '@/components/vender/layout/resolver_diseno'
import { identidad, contar_campos } from './estado_del_editor'

/*
	Grupo comun de vuedraggable: las tres etapas y la bandeja de sacados comparten el nombre, asi un
	campo va y viene entre cualquiera de ellas. Declarado afuera para no crear un objeto nuevo en
	cada render (vuedraggable le pasa sus atributos a Sortable cada vez que cambian).
*/
const GRUPO = {
	name: 'diseno-de-vender',
	pull: true,
	put: true,
}

/**
 * Una etapa de Vender en el lienzo del editor de diseños (mision diseno-vender-configurable,
 * 28/9/2026).
 *
 * Recibe la lista de trabajo de la etapa y la deja mutar a vuedraggable por referencia (`:list`),
 * igual que QuadrantList.vue del diseñador de encabezados: el editor (Index.vue) es el dueño de la
 * lista y ve los cambios sin eventos. Lo unico que sube son la ✕ de un campo (`sacar`, que el
 * editor resuelve porque involucra a la bandeja) y el inicio/fin de un arrastre (para que la
 * bandeja sepa si tiene que rechazar un obligatorio).
 */
export default {
	name: 'EtapaDelEditor',
	components: {
		draggable,
		ElementoDelEditor,
	},
	props: {
		/* 'etapa_1' | 'etapa_2' | 'etapa_3' */
		etapa: {
			type: String,
			required: true,
		},
		/* Numero que se ve en el circulo (1, 2 o 3) */
		numero: {
			type: Number,
			required: true,
		},
		/* Lista de trabajo de la etapa (la muta vuedraggable) */
		lista: {
			type: Array,
			required: true,
		},
		/* Funcion `move` de vuedraggable: la del editor, que no deja soltar un obligatorio en la bandeja */
		move: {
			type: Function,
			default: null,
		},
		/* Texto del bloque fijo con candado debajo de la grilla, o null */
		bloque_fijo: {
			type: String,
			default: null,
		},
		/* Identidad del item que hay que resaltar un momento, o null */
		destacado: {
			type: String,
			default: null,
		},
	},
	data() {
		return {
			/* Opciones del grupo de arrastre (ver GRUPO) */
			grupo: GRUPO,
			/* true mientras se tira del borde de un campo de esta etapa: resalta las guias */
			redimensionando: false,
		}
	},
	computed: {
		/**
		 * Titulo de la etapa, el mismo que en Vender.
		 *
		 * @returns {string}
		 */
		titulo() {
			return TITULOS_DE_ETAPAS[this.etapa] || ''
		},
		/**
		 * Subtitulo con los nombres cortos de los campos, igual que el que arma Vender.
		 *
		 * @returns {string}
		 */
		subtitulo() {
			return subtitulo_de_etapa(this.lista)
		},
		/**
		 * Cantidad de campos (sin separadores).
		 *
		 * @returns {number}
		 */
		cantidad() {
			return contar_campos(this.lista)
		},
		/**
		 * Clases de la etapa: el acento de color de su numero y los estados.
		 *
		 * @returns {Array}
		 */
		clases() {
			return [
				'acento-etapa-' + this.numero,
				{
					'editor-etapa--redimensionando': this.redimensionando,
					'editor-etapa--vacia': !this.lista.length,
				},
			]
		},
	},
	methods: {
		/**
		 * Identidad de un item (key del v-for).
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		identidad(item) {
			return identidad(item)
		},
	},
}
</script>
<style lang="sass">
@import '@/components/abm/disenos-de-vender/_acentos_de_etapas'

// Sin `scoped`: el clon de Sortable que sigue al puntero cuelga de <body> y las reglas del hueco y
// del clon (editor-diseno-hueco / editor-diseno-levantado, al final) tienen que alcanzarlo.
// Colores solo por token.
.editor-etapa
	margin-bottom: 16px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	// Sin overflow hidden: las manijas de ancho de los campos de los costados asoman sobre el gutter

.editor-etapa__cabecera
	display: flex
	align-items: center
	gap: 10px
	padding: 12px 16px
	border-bottom: 1px solid var(--color-border-secondary)

// El numero en el color de la etapa (ver _acentos_de_etapas.sass por el color del texto)
.editor-etapa__numero
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 26px
	width: 26px
	height: 26px
	border-radius: 50%
	background: var(--acento-etapa)
	color: var(--bg-card)
	font-size: 0.8rem
	font-weight: 700

.editor-etapa__textos
	display: flex
	flex-direction: column
	flex: 1 1 auto
	min-width: 0

.editor-etapa__titulo
	font-size: 0.92rem
	font-weight: 700
	color: var(--color-text-primary)

.editor-etapa__subtitulo
	margin-top: 1px
	font-size: 0.75rem
	color: var(--color-text-secondary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.editor-etapa__cantidad
	flex: 0 0 auto
	font-size: 0.75rem
	color: var(--color-text-secondary)
	white-space: nowrap

.editor-etapa__cuerpo
	padding: 14px 16px 6px

.editor-etapa__grilla
	position: relative

// Las guias: mismas 12 columnas y mismo gutter que la lista de arriba, asi cada franja coincide con
// el contenido de un campo de una columna. Terminan 10px antes del final porque la ultima fila de
// campos tiene ese margen abajo.
.editor-etapa__guias
	position: absolute
	top: 0
	bottom: 10px
	left: -8px
	right: -8px
	display: flex
	pointer-events: none

.editor-etapa__guia
	flex: 1 1 0
	min-width: 0
	padding: 0 8px

	&::before
		content: ''
		display: block
		height: 100%
		border-radius: 6px
		background: var(--bg-section)
		transition: background .2s ease, box-shadow .2s ease

.editor-etapa--redimensionando .editor-etapa__guia::before
	background: var(--bg-nav-hover)
	box-shadow: inset 0 0 0 1px var(--color-border)

// La lista: la fila de Vender (margin 0 -8px) y cada campo con su N/12 leido de data-cols.
// min-height para que una etapa vacia siga siendo una zona donde soltar.
.editor-etapa__lista
	position: relative
	z-index: 1
	display: flex
	flex-wrap: wrap
	align-items: stretch
	align-content: flex-start
	min-height: 72px
	margin: 0 -8px

	> .editor-diseno-arrastrable
		flex: 0 0 100%
		max-width: 100%
		min-width: 0
		padding: 0 8px
		margin-bottom: 10px

		@for $columnas from 1 through 12
			&[data-cols="#{$columnas}"]
				flex-basis: calc(100% * #{$columnas} / 12)
				max-width: calc(100% * #{$columnas} / 12)

.editor-etapa__vacia
	position: absolute
	top: 0
	left: 0
	right: 0
	z-index: 0
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	min-height: 62px
	padding: 8px 12px
	border: 1.5px dashed var(--color-border)
	border-radius: 10px
	color: var(--color-text-secondary)
	font-size: 0.82rem
	text-align: center
	pointer-events: none

	i
		font-size: 1.1rem

.editor-etapa__vacia-nota
	display: block
	font-size: 0.72rem

// Bloques fijos con candado (tabla de articulos, botones de la venta)
.editor-diseno-fijo
	display: flex
	align-items: center
	gap: 8px
	margin: 4px 0 10px
	padding: 10px 14px
	border: 1px solid var(--color-border-secondary)
	border-radius: 10px
	background: var(--bg-section)
	color: var(--color-text-secondary)
	font-size: 0.8rem

	i
		flex: 0 0 auto

// ── Arrastre (compartido con la bandeja) ─────────────────────────────────────────────────────
// El HUECO es el campo que se esta moviendo, en el lugar donde caeria: una caja punteada del
// mismo ancho, sin contenido. Como el hueco lleva data-cols, al pasar por una etapa ya ocupa las
// columnas que va a ocupar al soltarlo (tambien cuando viene de la bandeja).
.editor-diseno-arrastrable.editor-diseno-hueco
	.editor-diseno-caja
		border: 2px dashed var(--color-primary)
		background: var(--bg-nav-hover)
		box-shadow: none

		> *
			visibility: hidden

	.editor-elemento__manija,
	.editor-elemento__insignia
		display: none

// El campo LEVANTADO que sigue al puntero: lo unico del editor que lleva sombra.
.editor-diseno-arrastrable.editor-diseno-levantado
	.editor-diseno-caja
		border-color: var(--color-primary)
		box-shadow: 0 14px 32px var(--shadow-color)
		cursor: grabbing

	.editor-elemento__manija,
	.editor-elemento__boton--ancho
		visibility: hidden

// El clon cuelga de <body>, fuera de la lista que le daba el gutter; Sortable le copia el ancho del
// original (padding incluido), asi que sin este padding la tarjeta se veria 16px mas ancha.
.editor-elemento.editor-diseno-levantado
	padding: 0 8px

// Cuando el hueco entra a una etapa vacia, el texto "Arrastrá campos acá" se corre (el hueco ya
// dice donde cae). :has() es mejora progresiva: sin soporte, el texto queda detras del hueco.
.editor-etapa__grilla:has(.editor-diseno-hueco) .editor-etapa__vacia
	opacity: 0
</style>
