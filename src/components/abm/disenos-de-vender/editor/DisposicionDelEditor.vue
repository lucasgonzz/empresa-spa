<template>
	<!--
		La disposicion del diseño en el lienzo del editor (mision vender-secciones-personalizables,
		22/11/2026): bandas (filas) de arriba abajo, cada una con sus columnas de izquierda a derecha y,
		en cada columna, las secciones apiladas. Los anchos son proporcionales al lienzo (N/12), como en
		Vender desde 992px.

		- Cada columna es una lista de vuedraggable de SECCIONES (grupo `secciones-de-vender`, distinto del
		  de los campos `diseno-de-vender`: un campo no puede caer en una columna ni una seccion en una
		  grilla). Se arrastran desde el agarre de su header.
		- Entre dos columnas hay una manija vertical para tirar del borde (traspasa doceavos entre las dos
		  de a uno, con `setPointerCapture`, como las manijas de ancho de los campos) y, arriba de cada
		  columna de una fila con varias, "N/12" con − / +. Una fila de una sola columna mide 12 y no
		  tiene controles.
		- Abajo, "Agregar sección" (hasta 6).

		No muta la disposicion salvo por el arrastre de secciones (vuedraggable `:list`), que despues
		el editor deja prolija (`fin-de-arrastre-de-secciones`). Todo lo demas sube como evento y lo resuelve
		editor/Index.vue con operaciones_de_secciones.js.
	-->
	<div
	class="editor-disposicion"
	:class="{ 'editor-disposicion--columnas': hay_columnas }">

		<div
		v-for="(banda, indice_de_banda) in estado.disposicion"
		:key="'banda-' + indice_de_banda"
		class="editor-banda">

			<div
			v-for="(columna, indice_de_columna) in banda.columnas"
			:key="'columna-' + indice_de_columna"
			class="editor-columna"
			:style="estilo_de_columna(columna)">

				<!-- Ancho de la columna, sólo si la fila tiene varias -->
				<div
				v-if="banda.columnas.length > 1"
				class="editor-columna__barra">
					<button
					type="button"
					class="editor-columna__boton"
					aria-label="Achicar la columna"
					@click="$emit('ancho-de-columna', { banda: indice_de_banda, columna: indice_de_columna, delta: -1 })">
						<i class="bi bi-dash-lg"></i>
					</button>
					<span class="editor-columna__ancho">{{ columna.ancho }}/12</span>
					<button
					type="button"
					class="editor-columna__boton"
					aria-label="Agrandar la columna"
					@click="$emit('ancho-de-columna', { banda: indice_de_banda, columna: indice_de_columna, delta: 1 })">
						<i class="bi bi-plus-lg"></i>
					</button>
				</div>

				<!--
					Opciones de Sortable para las secciones (las mismas que las de los campos, ver
					EtapaDelEditor.vue): el que se arrastra lo dibuja Sortable (forceFallback), con un
					pequeño movimiento antes de empezar y, al tacto, una pulsacion corta. `handle` es lo
					que evita que un campo de adentro arrastre a toda la seccion.
				-->
				<draggable
				class="editor-columna__lista"
				:list="columna.secciones"
				:group="grupo"
				handle=".editor-etapa__agarre"
				draggable=".editor-etapa"
				:animation="150"
				ghost-class="editor-seccion-hueco"
				drag-class="editor-seccion-levantada"
				:force-fallback="true"
				:fallback-on-body="true"
				:fallback-tolerance="4"
				:delay="150"
				:delay-on-touch-only="true"
				:scroll-sensitivity="80"
				:scroll-speed="14"
				@end="$emit('fin-de-arrastre-de-secciones')">
					<etapa-del-editor
					v-for="id in columna.secciones"
					:key="id"
					:etapa="id"
					:numero="numero_de(id)"
					:seccion="estado.secciones[id]"
					:lista="estado.etapas[id]"
					:move="move"
					:bloque_fijo="id === 'etapa_2' ? 'Tabla de artículos (fija)' : null"
					:destacado="destacado"
					:acciones="acciones_de(id)"
					@sacar="$emit('sacar', { id: id, item: $event })"
					@ajuste="$emit('ajuste', $event)"
					@inicio-arrastre="$emit('inicio-arrastre', $event)"
					@fin-arrastre="$emit('fin-arrastre', $event)"></etapa-del-editor>
				</draggable>

				<!-- Manija para tirar del borde derecho de la columna (no la ultima de la fila) -->
				<span
				v-if="indice_de_columna < banda.columnas.length - 1"
				class="editor-columna__manija"
				role="separator"
				aria-orientation="vertical"
				title="Tirá hacia los costados para cambiar el ancho de las columnas"
				@pointerdown="empezar_ancho($event, indice_de_banda, indice_de_columna)"
				@pointermove="mover_ancho($event)"
				@pointerup="terminar_ancho($event)"
				@pointercancel="terminar_ancho($event)"></span>
			</div>
		</div>

		<div class="editor-disposicion__agregar">
			<b-button
			size="sm"
			variant="outline-primary"
			:disabled="!se_puede_agregar"
			@click="$emit('agregar-seccion')">
				<i class="bi bi-plus-lg"></i>
				Agregar sección
			</b-button>
			<small
			v-if="!se_puede_agregar"
			class="editor-disposicion__motivo">Ya hay {{ MAXIMO_DE_SECCIONES }} secciones, el máximo.</small>
		</div>
	</div>
</template>
<script>
import draggable from 'vuedraggable'
import EtapaDelEditor from './EtapaDelEditor'
import { MAXIMO_DE_SECCIONES, ids_en_orden } from '@/components/vender/layout/secciones'
import {
	puede_mover_a_banda_nueva,
	puede_mover_a_columna_nueva,
	puede_quitar_seccion,
} from './operaciones_de_secciones'

/*
	Grupo de vuedraggable de las SECCIONES: distinto del de los campos (`diseno-de-vender`), asi una
	seccion solo se suelta en una columna y un campo solo en una grilla. Declarado afuera para no
	crear un objeto nuevo por render.
*/
const GRUPO_DE_SECCIONES = {
	name: 'secciones-de-vender',
	pull: true,
	put: true,
}

/**
 * Lienzo 2D del editor de Diseños de Vender (mision vender-secciones-personalizables, 22/11/2026).
 * Recibe el estado de trabajo completo (`estado`: etapas, secciones, disposicion...) y lo dibuja;
 * ver arriba que sube y que muta.
 */
export default {
	name: 'DisposicionDelEditor',
	components: {
		draggable,
		EtapaDelEditor,
	},
	props: {
		/* Estado de trabajo del editor (estado_del_editor.js) */
		estado: {
			type: Object,
			required: true,
		},
		/* Funcion `move` de vuedraggable para los campos: la del editor */
		move: {
			type: Function,
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
			MAXIMO_DE_SECCIONES: MAXIMO_DE_SECCIONES,
			grupo: GRUPO_DE_SECCIONES,
			/* Mientras se tira de una manija de ancho: {banda, columna, x, ancho_inicial, unidad}, o null */
			arrastre_de_ancho: null,
		}
	},
	computed: {
		/**
		 * Ids de las secciones en orden de lectura (de ahi sale el numero de cada una).
		 *
		 * @returns {Array<string>}
		 */
		ids() {
			return ids_en_orden(this.estado.disposicion)
		},
		/**
		 * Si hay una fila con mas de una columna: el lienzo toma un ancho minimo para que las columnas
		 * conserven la proporcion y, mas angosto que eso, se desliza de costado dentro de su marco.
		 *
		 * @returns {boolean}
		 */
		hay_columnas() {
			return this.estado.disposicion.some(function (banda) {
				return banda.columnas.length > 1
			})
		},
		/**
		 * Si se puede agregar otra seccion (hasta 6).
		 *
		 * @returns {boolean}
		 */
		se_puede_agregar() {
			return this.ids.length < MAXIMO_DE_SECCIONES
		},
	},
	methods: {
		/**
		 * Numero de una seccion: su posicion en orden de lectura (el mismo que ve Vender).
		 *
		 * @param {string} id
		 * @returns {number}
		 */
		numero_de(id) {
			return this.ids.indexOf(id) + 1
		},
		/**
		 * Estilo de una columna: su ancho en proporcion al lienzo (N/12).
		 *
		 * @param {Object} columna
		 * @returns {Object}
		 */
		estilo_de_columna(columna) {
			let porcentaje = (columna.ancho / 12 * 100) + '%'
			return { flex: '0 0 ' + porcentaje, maxWidth: porcentaje }
		},
		/**
		 * Lo que se puede hacer con una seccion, para habilitar o deshabilitar los botones de su panel
		 * de ajustes con el motivo. No toca el estado (usa las verificaciones puras).
		 *
		 * @param {string} id
		 * @returns {{columna_nueva: Object, banda_nueva: Object, quitar: Object}}
		 */
		acciones_de(id) {
			return {
				columna_nueva: puede_mover_a_columna_nueva(this.estado, id),
				banda_nueva: puede_mover_a_banda_nueva(this.estado, id),
				quitar: puede_quitar_seccion(this.estado, id),
			}
		},
		/**
		 * Empieza a tirar de la manija entre dos columnas: captura el puntero y mide la fila (un
		 * doceavo = su ancho / 12).
		 *
		 * @param {PointerEvent} evento
		 * @param {number} banda indice de la fila
		 * @param {number} columna indice de la columna a la izquierda de la manija
		 * @returns {void}
		 */
		empezar_ancho(evento, banda, columna) {
			evento.preventDefault()
			evento.target.setPointerCapture(evento.pointerId)

			let fila = evento.target.closest('.editor-banda')
			let ancho_de_la_fila = fila ? fila.getBoundingClientRect().width : 0

			this.arrastre_de_ancho = {
				banda: banda,
				columna: columna,
				x: evento.clientX,
				ancho_inicial: this.estado.disposicion[banda].columnas[columna].ancho,
				unidad: ancho_de_la_fila / 12,
			}
		},
		/**
		 * Mientras se tira: cada doceavo de movimiento es una unidad de ancho. Se pide solo la
		 * diferencia con lo que ya se aplico (el editor acota al minimo de 3 y a la suma de 12, y despues
		 * se lee el ancho real).
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		mover_ancho(evento) {
			let arrastre = this.arrastre_de_ancho

			if (!arrastre || !arrastre.unidad) {
				return
			}

			let columna = this.estado.disposicion[arrastre.banda].columnas[arrastre.columna]
			let deseado = Math.round((evento.clientX - arrastre.x) / arrastre.unidad)
			let aplicado = columna.ancho - arrastre.ancho_inicial
			let pedido = deseado - aplicado

			if (pedido !== 0) {
				this.$emit('ancho-de-columna', { banda: arrastre.banda, columna: arrastre.columna, delta: pedido, silencioso: true })
			}
		},
		/**
		 * Suelta la manija.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		terminar_ancho(evento) {
			if (evento.target.hasPointerCapture && evento.target.hasPointerCapture(evento.pointerId)) {
				evento.target.releasePointerCapture(evento.pointerId)
			}
			this.arrastre_de_ancho = null
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: el clon de Sortable de una seccion que se arrastra cuelga de <body>. Colores solo
// por token.
.editor-disposicion
	min-width: 0

// Con varias columnas el lienzo mantiene la proporcion con un ancho minimo legible; el marco
// (editor-diseno__marco) se desliza de costado si la pantalla es mas angosta
.editor-disposicion--columnas
	min-width: 760px

// Una fila de secciones: las columnas con el mismo gutter de 16px que la grilla de campos
.editor-banda
	display: flex
	align-items: stretch
	margin: 0 -8px

.editor-columna
	position: relative
	display: flex
	flex-direction: column
	min-width: 0
	padding: 0 8px

// Ancho de la columna: "− 4/12 +", chico y a la izquierda
.editor-columna__barra
	display: flex
	align-items: center
	justify-content: center
	gap: 6px
	margin-bottom: 6px
	color: var(--color-text-secondary)
	font-size: 0.72rem

.editor-columna__ancho
	min-width: 38px
	text-align: center
	font-weight: 600

.editor-columna__boton
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

	&:hover
		background: var(--bg-nav-hover)

// Las secciones apiladas. Se estira al alto de la columna y tiene un minimo, asi una columna vacia
// (o con poco) sigue siendo una zona donde soltar una seccion.
.editor-columna__lista
	flex: 1 1 auto
	min-height: 56px

// La manija de tirar del borde derecho: una franja vertical sobre el gutter, de pantalla completa
// de alto de la columna
.editor-columna__manija
	position: absolute
	top: 0
	bottom: 12px
	right: -6px
	z-index: 3
	width: 12px
	cursor: col-resize
	touch-action: none

	&::before
		content: ''
		position: absolute
		top: 50%
		left: 4px
		width: 4px
		height: 44px
		margin-top: -22px
		border-radius: 2px
		background: var(--color-border)
		transition: background .15s ease

	&:hover::before
		background: var(--color-primary)

.editor-disposicion__agregar
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 8px
	margin: 4px 0 14px

	.btn
		border-radius: 8px

.editor-disposicion__motivo
	color: var(--color-text-secondary)

// La seccion que se arrastra: el hueco donde caeria (caja punteada) y el clon que sigue al puntero
.editor-etapa.editor-seccion-hueco
	border: 2px dashed var(--color-primary)
	background: var(--bg-nav-hover)

	> *
		visibility: hidden

.editor-etapa.editor-seccion-levantada
	box-shadow: 0 14px 32px var(--shadow-color)
	cursor: grabbing
</style>
