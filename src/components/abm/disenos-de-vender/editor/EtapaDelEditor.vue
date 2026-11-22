<template>
	<!--
		Una seccion de Vender en el lienzo del editor (misión diseno-vender-configurable, 28/9/2026; secciones
		configurables en vender-secciones-personalizables, 22/11/2026): el mismo numero, titulo y
		descripcion que en Vender (la descripcion es la que escribio el usuario o, si no puso ninguna, el
		subtitulo armado con los campos que tiene, subtitulo_de_etapa, el mismo que usa Vender), asi el
		comerciante ve en vivo como va a quedar el encabezado de la seccion.

		Header bajo, igual que en Vender: agarre para mover la seccion entre columnas, numero, titulo y
		descripcion en un renglon, cantidad de campos y el boton "Ajustes", que despliega el panel
		(AjustesDeSeccion.vue) justo debajo, sin popover.

		Debajo, la grilla de 12 columnas: las guias de fondo y, encima, la lista arrastrable con los
		campos. Cada campo ocupa sus N/12 con el mismo gutter que Vender (fila con margin 0 -8px,
		item con padding 0 8px y margin-bottom 10px). Una seccion de alto fijo mide como minimo su alto en
		filas de 40px y, al pie, una manija cambia ese alto; una automatica crece con sus campos.
	-->
	<section
	class="editor-etapa"
	:class="clases"
	:style="estilo"
	:data-seccion="etapa"
	:aria-label="'Sección ' + numero + ': ' + titulo">

		<header class="editor-etapa__cabecera">
			<!-- Agarre: lo unico desde donde se arrastra la seccion (los campos de adentro se arrastran solos) -->
			<span
			class="editor-etapa__agarre"
			title="Arrastrá para mover la sección a otra columna o fila"
			aria-hidden="true">
				<i class="bi bi-grip-vertical"></i>
			</span>
			<span class="editor-etapa__numero">{{ numero }}</span>
			<div class="editor-etapa__textos">
				<span class="editor-etapa__titulo">{{ titulo }}</span>
				<span
				class="editor-etapa__subtitulo"
				:title="descripcion">{{ descripcion || 'Sin campos' }}</span>
			</div>
			<span class="editor-etapa__cantidad">
				{{ cantidad }} {{ cantidad === 1 ? 'campo' : 'campos' }}
			</span>
			<button
			type="button"
			class="editor-etapa__ajustes-boton"
			:class="{ 'editor-etapa__ajustes-boton--abierto': ajustes_abiertos }"
			:aria-expanded="ajustes_abiertos ? 'true' : 'false'"
			:aria-label="'Ajustes de la sección ' + titulo"
			@click="ajustes_abiertos = !ajustes_abiertos">
				<i class="bi bi-sliders"></i>
				<span class="editor-etapa__ajustes-texto">Ajustes</span>
			</button>
		</header>

		<ajustes-de-seccion
		v-if="ajustes_abiertos"
		:etapa="etapa"
		:seccion="seccion"
		:descripcion_automatica="descripcion_automatica"
		:acciones="acciones"
		@ajuste="$emit('ajuste', $event)"></ajustes-de-seccion>

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
					  otra sección o a la bandeja.
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
							Mientras esté vacía, esta sección no se muestra en Vender.
						</small>
					</span>
				</div>
			</div>

			<!-- Lo que la seccion tiene fijo (la tabla de articulos de la etapa 2) -->
			<div
			v-if="bloque_fijo"
			class="editor-diseno-fijo">
				<i class="bi bi-lock-fill"></i>
				<span>{{ bloque_fijo }}</span>
			</div>
		</div>

		<!--
			Alto de la seccion: con alto fijo, "Alto N/12 · fijo" con − / + y una manija en el borde
			de abajo para tirar de ella; con alto automatico, solo el rotulo.
		-->
		<footer
		class="editor-etapa__alto"
		:class="{ 'editor-etapa__alto--fijo': seccion.alto_fijo }">
			<template v-if="seccion.alto_fijo">
				<button
				type="button"
				class="editor-etapa__alto-boton"
				:disabled="seccion.alto <= 1"
				aria-label="Achicar el alto de la sección"
				@click="$emit('ajuste', { tipo: 'alto', id: etapa, valor: seccion.alto - 1 })">
					<i class="bi bi-dash-lg"></i>
				</button>
				<span class="editor-etapa__alto-texto">Alto {{ seccion.alto }}/12 · fijo</span>
				<button
				type="button"
				class="editor-etapa__alto-boton"
				:disabled="seccion.alto >= 12"
				aria-label="Agrandar el alto de la sección"
				@click="$emit('ajuste', { tipo: 'alto', id: etapa, valor: seccion.alto + 1 })">
					<i class="bi bi-plus-lg"></i>
				</button>
				<span class="editor-etapa__alto-nota">En Vender lo que no entre se desplaza adentro.</span>
				<span
				class="editor-etapa__alto-manija"
				role="separator"
				aria-orientation="horizontal"
				title="Tirá hacia abajo o hacia arriba para cambiar el alto"
				@pointerdown="empezar_alto"
				@pointermove="mover_alto"
				@pointerup="terminar_alto"
				@pointercancel="terminar_alto"></span>
			</template>
			<span
			v-else
			class="editor-etapa__alto-texto">Alto automático</span>
		</footer>
	</section>
</template>
<script>
import draggable from 'vuedraggable'
import ElementoDelEditor from './ElementoDelEditor'
import AjustesDeSeccion from './AjustesDeSeccion'
import { subtitulo_de_etapa } from '@/components/vender/layout/resolver_diseno'
import { identidad, contar_campos } from './estado_del_editor'

/*
	Grupo comun de vuedraggable: todas las secciones y la bandeja de sacados comparten el nombre, asi un
	campo va y viene entre cualquiera de ellas. Declarado afuera para no crear un objeto nuevo en
	cada render (vuedraggable le pasa sus atributos a Sortable cada vez que cambian).
*/
const GRUPO = {
	name: 'diseno-de-vender',
	pull: true,
	put: true,
}

/* Alto en pixeles de una "fila" de alto en el lienzo del editor (una fila = 1/12 del alto de Vender) */
const ALTO_DE_FILA_EN_EL_EDITOR = 40

/**
 * Una seccion de Vender en el lienzo del editor de diseños (mision diseno-vender-configurable,
 * 28/9/2026; secciones configurables en vender-secciones-personalizables, 22/11/2026).
 *
 * Recibe la lista de trabajo de la seccion y la deja mutar a vuedraggable por referencia (`:list`),
 * igual que QuadrantList.vue del diseñador de encabezados: el editor (Index.vue) es el dueño de la
 * lista y ve los cambios sin eventos. Lo que sube son la ✕ de un campo (`sacar`, que el editor
 * resuelve porque involucra a la bandeja), el inicio/fin de un arrastre (para que la bandeja sepa si
 * tiene que rechazar un obligatorio) y los ajustes de la seccion (`ajuste`: titulo, color, alto,
 * columnas, quitar... que el editor resuelve con operaciones_de_secciones.js). El nombre del archivo
 * se conserva de cuando eran etapas fijas.
 */
export default {
	name: 'EtapaDelEditor',
	components: {
		draggable,
		ElementoDelEditor,
		AjustesDeSeccion,
	},
	props: {
		/* Id de la seccion: 'etapa_1' | 'etapa_2' | 'etapa_3' | 'seccion_4' ... 'seccion_9' */
		etapa: {
			type: String,
			required: true,
		},
		/* Numero que se ve en el circulo (posicion en orden de lectura) */
		numero: {
			type: Number,
			required: true,
		},
		/* Metadatos de la seccion: {titulo, descripcion, color, alto, alto_fijo, plegado} */
		seccion: {
			type: Object,
			required: true,
		},
		/* Lista de trabajo de la seccion (la muta vuedraggable) */
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
		/* Que se puede hacer con la seccion, para el panel de ajustes: {columna_nueva, banda_nueva, quitar} con {ok, motivo} */
		acciones: {
			type: Object,
			default: function () {
				return {}
			},
		},
	},
	data() {
		return {
			/* Opciones del grupo de arrastre (ver GRUPO) */
			grupo: GRUPO,
			/* true mientras se tira del borde de un campo de esta seccion: resalta las guias */
			redimensionando: false,
			/* true con el panel de ajustes desplegado */
			ajustes_abiertos: false,
			/* Mientras se tira de la manija de alto: {y, alto} al empezar, o null */
			arrastre_de_alto: null,
		}
	},
	computed: {
		/**
		 * Titulo de la seccion: el del diseño (el de fabrica si no tiene). Texto del usuario: va solo
		 * con {{ }}.
		 *
		 * @returns {string}
		 */
		titulo() {
			return this.seccion.titulo
		},
		/**
		 * La descripcion automatica: los nombres cortos de los campos, igual que la que arma Vender.
		 *
		 * @returns {string}
		 */
		descripcion_automatica() {
			return subtitulo_de_etapa(this.lista)
		},
		/**
		 * Descripcion del header: la que escribio el usuario o, si no, la automatica.
		 *
		 * @returns {string}
		 */
		descripcion() {
			return this.seccion.descripcion || this.descripcion_automatica
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
		 * Clases de la seccion: el acento de color de su numero y los estados.
		 *
		 * @returns {Array}
		 */
		clases() {
			return [
				'acento-' + this.seccion.color,
				{
					'editor-etapa--redimensionando': this.redimensionando,
					'editor-etapa--vacia': !this.lista.length,
					'editor-etapa--fija': this.seccion.alto_fijo,
				},
			]
		},
		/**
		 * Estilo: una seccion de alto fijo mide como minimo su alto en filas de 40px (el lienzo no
		 * recorta el contenido: editar tiene que ser comodo, y en Vender lo que no entre scrollea).
		 *
		 * @returns {Object}
		 */
		estilo() {
			if (!this.seccion.alto_fijo) {
				return {}
			}
			return { minHeight: (this.seccion.alto * ALTO_DE_FILA_EN_EL_EDITOR) + 'px' }
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
		/**
		 * Empieza a tirar de la manija de alto: captura el puntero y anota de donde se arranca.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		empezar_alto(evento) {
			evento.preventDefault()
			evento.target.setPointerCapture(evento.pointerId)
			this.arrastre_de_alto = { y: evento.clientY, alto: this.seccion.alto }
		},
		/**
		 * Mientras se tira: cada 40px de movimiento es una fila de alto, entre 1 y 12. Solo avisa
		 * cuando el alto cambia.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		mover_alto(evento) {
			if (!this.arrastre_de_alto) {
				return
			}
			let filas = Math.round((evento.clientY - this.arrastre_de_alto.y) / ALTO_DE_FILA_EN_EL_EDITOR)
			let alto = Math.max(1, Math.min(12, this.arrastre_de_alto.alto + filas))
			if (alto !== this.seccion.alto) {
				this.$emit('ajuste', { tipo: 'alto', id: this.etapa, valor: alto })
			}
		},
		/**
		 * Suelta la manija.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		terminar_alto(evento) {
			if (evento.target.hasPointerCapture && evento.target.hasPointerCapture(evento.pointerId)) {
				evento.target.releasePointerCapture(evento.pointerId)
			}
			this.arrastre_de_alto = null
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
	position: relative
	display: flex
	flex-direction: column
	margin-bottom: 12px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	// Sin overflow hidden: las manijas de ancho de los campos de los costados asoman sobre el gutter

// Una seccion de alto fijo reparte su alto minimo: el cuerpo se estira y el pie queda abajo
.editor-etapa--fija > .editor-etapa__cuerpo
	flex: 1 1 auto

.editor-etapa__cabecera
	display: flex
	align-items: center
	gap: 8px
	// Header bajo, igual que el de Vender (el numero de 22px marca el alto)
	padding: 5px 8px 5px 6px
	border-bottom: 1px solid var(--color-border-secondary)

// El agarre para mover la seccion (Sortable lo usa como `handle` desde DisposicionDelEditor.vue)
.editor-etapa__agarre
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 18px
	width: 18px
	height: 24px
	color: var(--color-text-secondary)
	cursor: grab
	border-radius: 4px

	&:hover
		background: var(--bg-nav-hover)

// El numero en el color de la etapa (ver _acentos_de_etapas.sass por el color del texto)
.editor-etapa__numero
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 22px
	width: 22px
	height: 22px
	border-radius: 50%
	background: var(--acento-etapa)
	color: var(--bg-card)
	font-size: 0.72rem
	font-weight: 700

.editor-etapa__textos
	display: flex
	flex-direction: row
	align-items: baseline
	gap: 8px
	flex: 1 1 auto
	min-width: 0

.editor-etapa__titulo
	flex: 0 1 auto
	min-width: 0
	font-size: 0.88rem
	font-weight: 700
	color: var(--color-text-primary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.editor-etapa__subtitulo
	flex: 1 1 0
	min-width: 0
	font-size: 0.75rem
	color: var(--color-text-secondary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

// Boton "Ajustes" del header: un icono y, donde hay lugar, la palabra
.editor-etapa__ajustes-boton
	display: inline-flex
	align-items: center
	gap: 5px
	flex: 0 0 auto
	padding: 2px 8px
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.75rem
	line-height: 1.5

	&:hover,
	&--abierto
		background: var(--bg-nav-hover)

	&:focus-visible
		outline: 2px solid var(--color-primary)
		outline-offset: 1px

// Alto de la seccion: rotulo, − / +, nota y manija de tirar
.editor-etapa__alto
	position: relative
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 6px
	padding: 4px 12px 6px
	border-top: 1px solid var(--color-border-secondary)
	color: var(--color-text-secondary)
	font-size: 0.72rem

.editor-etapa__alto-texto
	white-space: nowrap

.editor-etapa__alto-nota
	flex: 1 1 140px
	min-width: 0

.editor-etapa__alto-boton
	display: inline-flex
	align-items: center
	justify-content: center
	width: 22px
	height: 22px
	padding: 0
	border: 1px solid var(--color-border)
	border-radius: 6px
	background: var(--bg-card)
	color: var(--color-text-primary)

	&:hover:not(:disabled)
		background: var(--bg-nav-hover)

	&:disabled
		opacity: .45

// La manija de tirar para cambiar el alto: una barrita centrada sobre el borde de abajo de la seccion
.editor-etapa__alto-manija
	position: absolute
	left: 50%
	bottom: -4px
	width: 56px
	height: 8px
	margin-left: -28px
	border-radius: 4px
	background: var(--acento-etapa)
	opacity: .55
	cursor: ns-resize
	touch-action: none

	&:hover
		opacity: 1

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
