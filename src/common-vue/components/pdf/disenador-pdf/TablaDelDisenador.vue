<template>
	<!--
		La tabla de artículos en la hoja del diseñador de PDF, entre la zona de arriba y el pie (misión
		diseno-ticket-comandera, 9/10/2026; plan §7.2). Hasta esta misión era fija y sus columnas se
		elegían en el formulario; ahora se arma acá, con el mismo lenguaje que las cajas:

		- Una fila de 24 MEDIAS columnas (D-L3) con las guías de fondo (se resaltan mientras se tira
		del borde de una columna) y, encima, la lista arrastrable de las columnas visibles (grupo
		pdf-columnas, compartido con "Columnas de la tabla" de la bandeja): se reordenan arrastrando
		y entran desde la bandeja.
		- Cada columna ocupa sus N/24 y cambia de ancho con las manijas o con − / + (de a media
		columna). La suma nunca pasa de 24.
		- Debajo, cuánto lugar queda libre (o que la tabla ocupa todo el ancho) y, si el diseñador
		puso las columnas sugeridas, que hay que guardar para que queden.
	-->
	<section
	class="dpdf-tabla"
	:class="clases"
	aria-label="Tabla de artículos"
	data-testid="tabla-disenador-pdf">

		<header class="dpdf-tabla__cabecera">
			<i
			class="bi bi-table dpdf-tabla__icono"
			aria-hidden="true"></i>
			<span class="dpdf-tabla__titulo">Tabla de artículos</span>
			<span class="dpdf-tabla__subtitulo">· {{ detalle }}</span>
			<button
			type="button"
			class="dpdf-tabla__agregar"
			data-testid="agregar-columna-disenador-pdf"
			aria-label="Agregar una columna a la tabla (abre Columnas de la tabla en la bandeja)"
			@click="disenador.mostrar_columnas_en_la_bandeja()">
				<i class="bi bi-plus-lg"></i>
				Agregar columna
			</button>
		</header>

		<div
		class="dpdf-tabla__grilla"
		:style="{ '--dpdf-total': total }">
			<!-- Las medias columnas de fondo: se resaltan mientras se tira del borde de una columna -->
			<div
			class="dpdf-tabla__guias"
			aria-hidden="true">
				<span
				v-for="guia in total"
				:key="guia"
				class="dpdf-tabla__guia"></span>
			</div>

			<!--
				Mismas opciones de Sortable que las zonas (ver ZonaDelDisenador.vue): forceFallback +
				fallbackOnBody, filter para manijas y botones, delay solo en táctil y scroll cerca del
				borde del modal.
			-->
			<draggable
			class="dpdf-tabla__fila"
			:list="disenador.tabla.visibles"
			:group="grupo"
			:move="disenador.permitir_movimiento"
			:animation="150"
			draggable=".dpdf-item-de-tabla"
			filter=".dpdf-no-arrastra"
			:prevent-on-filter="false"
			ghost-class="dpdf-hueco"
			drag-class="dpdf-levantado"
			:force-fallback="true"
			:fallback-on-body="true"
			:fallback-tolerance="4"
			:delay="150"
			:delay-on-touch-only="true"
			:scroll-sensitivity="80"
			:scroll-speed="14"
			data-lista="tabla"
			data-testid="fila-tabla-disenador-pdf"
			@start="disenador.al_empezar_arrastre($event)"
			@end="disenador.al_terminar_arrastre($event)">
				<columna-de-la-tabla
				v-for="columna in disenador.tabla.visibles"
				:key="columna.ui_id"
				:columna="columna"
				@redimension="redimensionando = $event"></columna-de-la-tabla>
			</draggable>

			<!-- Tabla sin columnas: el texto va encima de la fila, sin tapar el arrastre -->
			<div
			v-if="!disenador.tabla.visibles.length"
			class="dpdf-tabla__vacia">
				<i class="bi bi-box-arrow-in-down"></i>
				<span>
					Arrastrá acá una columna
					<small class="dpdf-tabla__vacia-nota">Están en la bandeja, en «Columnas de la tabla».</small>
				</span>
			</div>
		</div>

		<p
		class="dpdf-tabla__nota"
		role="status">
			<span>{{ texto_del_lugar }}</span>
			<span
			v-if="disenador.columnas_sugeridas_puestas && disenador.tabla.visibles.length && disenador.tabla_cambiada"
			class="dpdf-tabla__sugeridas"
			data-testid="sugeridas-tabla-disenador-pdf">
				<i
				class="bi bi-lightbulb"
				aria-hidden="true"></i>
				Te propusimos estas columnas: guardá el diseño para que queden.
			</span>
		</p>
	</section>
</template>
<script>
import draggable from 'vuedraggable'
import ColumnaDeLaTabla from './ColumnaDeLaTabla'

/*
	Grupo de la fila de la tabla y de "Columnas de la tabla" de la bandeja: una columna va y viene
	solo entre esas dos listas. Declarado afuera para no crear un objeto nuevo en cada render.

	🔴 `put` es la LISTA de grupos que acepta, no `true` (en SortableJS `put: true` acepta elementos de
	CUALQUIER grupo: una caja o un campo terminarían en la tabla). El `move` del diseñador lo vuelve a
	rechazar.
*/
const GRUPO_DE_COLUMNAS = {
	name: 'pdf-columnas',
	pull: true,
	put: ['pdf-columnas'],
}

/**
 * Tabla de artículos del diseñador de PDF (misión diseno-ticket-comandera, 9/10/2026).
 *
 * Recibe todo del diseñador por `inject`: la tabla de trabajo (`tabla.visibles`, la lista que muta
 * vuedraggable por referencia), la grilla (`total_de_la_tabla`), lo libre y las acciones (el `move`,
 * el inicio y el fin de un arrastre, abrir las columnas de la bandeja).
 */
export default {
	name: 'TablaDelDisenador',
	inject: ['disenador'],
	components: {
		draggable,
		ColumnaDeLaTabla,
	},
	data() {
		return {
			/* Opciones del grupo de arrastre (ver GRUPO_DE_COLUMNAS) */
			grupo: GRUPO_DE_COLUMNAS,
			/* true mientras se tira del borde de una columna: resalta las guías */
			redimensionando: false,
		}
	},
	computed: {
		/**
		 * Medias columnas de la grilla de la tabla.
		 *
		 * @returns {number}
		 */
		total() {
			return this.disenador.total_de_la_tabla
		},
		/**
		 * La línea de la cabecera: cuántas columnas y cuánto de la fila ocupan.
		 *
		 * @returns {string}
		 */
		detalle() {
			let cantidad = this.disenador.tabla.visibles.length
			return cantidad + (cantidad === 1 ? ' columna' : ' columnas') + ' · '
				+ this.disenador.suma_de_la_tabla + ' de ' + this.total + ' medias columnas'
		},
		/**
		 * Cuánto lugar queda en la fila (en medias columnas y su equivalente en milímetros).
		 *
		 * @returns {string}
		 */
		texto_del_lugar() {
			let libre = this.disenador.lugar_libre_en_la_tabla
			if (!this.disenador.tabla.visibles.length) {
				return 'La tabla no tiene columnas: en el PDF sale vacía.'
			}
			if (libre <= 0) {
				return 'La tabla ocupa todo el ancho. Para agrandar una columna, achicá otra.'
			}
			return 'Quedan ' + libre + (libre === 1 ? ' media columna libre' : ' medias columnas libres')
				+ ' (unos ' + this.disenador.mm_libres_en_la_tabla + ' mm): en el PDF la tabla no llega al borde derecho.'
		},
		/**
		 * Si se está arrastrando una columna (la fila se ofrece como destino).
		 *
		 * @returns {boolean}
		 */
		recibe() {
			let arrastrando = this.disenador.arrastrando
			return !!(arrastrando && arrastrando.tipo === 'columna')
		},
		/**
		 * Clases de estado de la tabla.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-tabla--redimensionando': this.redimensionando,
				'dpdf-tabla--vacia': !this.disenador.tabla.visibles.length,
				'dpdf-tabla--recibe': this.recibe,
			}
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: el clon de Sortable que sigue al puntero cuelga de <body> (ver ZonaDelDisenador.vue).
// Colores solo por token. Mismo armado que una zona: guías de fondo y la lista encima, con su gutter
// (más fino que el de las cajas: 3px por lado, porque una media columna en la hoja mide unos 25px).
.dpdf-tabla
	margin: 4px 0 8px

.dpdf-tabla__cabecera
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 4px 6px
	margin-bottom: 6px
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.3

.dpdf-tabla__icono
	flex: 0 0 auto
	color: var(--color-primary)

.dpdf-tabla__titulo
	flex: 0 0 auto
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.03em
	color: var(--color-text-primary)

.dpdf-tabla__subtitulo
	flex: 1 1 auto
	min-width: 0
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

// "+ Agregar columna": el mismo dibujo que "Agregar caja" de las zonas
.dpdf-tabla__agregar
	display: inline-flex
	align-items: center
	gap: 5px
	flex: 0 0 auto
	padding: 2px 10px
	border: 1px dashed var(--color-border)
	border-radius: 999px
	background: var(--bg-card)
	color: var(--color-primary)
	font-size: 0.72rem
	font-weight: 600
	line-height: 1.3
	cursor: pointer
	transition: background .15s ease, border-color .15s ease

	&:hover
		background: var(--bg-nav-hover)
		border-color: var(--color-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
		border-color: var(--color-primary)

.dpdf-tabla__grilla
	position: relative

// Las guías: tantas como la grilla, con el mismo gutter que la fila de arriba
.dpdf-tabla__guias
	position: absolute
	top: 0
	bottom: 0
	left: -3px
	right: -3px
	display: flex
	pointer-events: none

.dpdf-tabla__guia
	flex: 1 1 0
	min-width: 0
	padding: 0 1px

	&::before
		content: ''
		display: block
		height: 100%
		border-radius: 3px
		background: var(--bg-section)
		transition: background .2s ease, box-shadow .2s ease

.dpdf-tabla--redimensionando .dpdf-tabla__guia::before
	background: var(--bg-nav-hover)
	box-shadow: inset 0 0 0 1px var(--color-border)

// La fila: cada columna (y el hueco de lo que se arrastra, que trae su --dpdf-cols) ocupa N/total.
// min-height para que una tabla vacía siga siendo un lugar donde soltar.
.dpdf-tabla__fila
	position: relative
	z-index: 1
	display: flex
	flex-wrap: nowrap
	align-items: stretch
	min-height: 70px
	margin: 0 -3px

	// flex-shrink 1: mientras se arrastra una columna de la bandeja a una tabla completa, su hueco
	// suma ancho y las demás se angostan un momento en vez de salirse de la hoja
	> *
		flex: 0 1 calc(100% * var(--dpdf-cols, 2) / var(--dpdf-total, 24))
		max-width: calc(100% * var(--dpdf-cols, 2) / var(--dpdf-total, 24))
		min-width: 0
		padding: 0 3px

.dpdf-tabla__vacia
	position: absolute
	top: 0
	left: 0
	right: 0
	bottom: 0
	z-index: 0
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 8px 12px
	border: 1.5px dashed var(--color-border)
	border-radius: 8px
	color: var(--color-text-secondary)
	font-size: 0.8rem
	text-align: center
	pointer-events: none

	i
		font-size: 1.05rem

.dpdf-tabla__vacia-nota
	display: block
	font-size: 0.7rem

// Mientras se arrastra una columna: la tabla se ofrece como destino
.dpdf-tabla--recibe
	.dpdf-tabla__vacia
		border-color: var(--color-primary)
		color: var(--color-primary)

	.dpdf-tabla__guia::before
		background: var(--bg-nav-hover)

// Cuando el hueco entra a una tabla vacía, el texto se corre (:has() es mejora progresiva)
.dpdf-tabla__grilla:has(.dpdf-hueco) .dpdf-tabla__vacia
	opacity: 0

.dpdf-tabla__nota
	display: flex
	flex-wrap: wrap
	gap: 4px 12px
	margin: 6px 0 0
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.35

.dpdf-tabla__sugeridas
	display: inline-flex
	align-items: flex-start
	gap: 5px
	color: var(--color-primary)
	font-weight: 600

	i
		flex: 0 0 auto
		margin-top: 1px
</style>
