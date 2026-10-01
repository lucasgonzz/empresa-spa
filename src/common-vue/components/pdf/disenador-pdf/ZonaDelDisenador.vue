<template>
	<!--
		Una zona de la hoja del diseñador de PDF: "Arriba de la tabla" (sale en todas las hojas) o
		"Pie de página" (en la última hoja, o en cada hoja). Mismo armado que una etapa del editor de
		Diseños de Vender: la grilla de 12 columnas con las guías de fondo y, encima, la lista
		arrastrable con las cajas, los saltos de fila y los bloques fijos de ARCA (grupo pdf-cajas,
		compartido con la otra zona y con la "Caja nueva" de la bandeja). Cada ítem ocupa sus N/12 con
		el mismo gutter que Vender (lista con margin 0 -8px, ítem con padding 0 8px y margin-bottom 10px).
	-->
	<section
	class="dpdf-zona"
	:class="clases"
	:aria-label="titulo + ': ' + subtitulo">

		<header class="dpdf-zona__cabecera">
			<i
			class="bi dpdf-zona__icono"
			:class="icono"
			aria-hidden="true"></i>
			<span class="dpdf-zona__titulo">{{ titulo }}</span>
			<span class="dpdf-zona__subtitulo">· {{ subtitulo }}</span>
			<span class="dpdf-zona__cantidad">
				{{ cantidad_de_cajas }} {{ cantidad_de_cajas === 1 ? 'caja' : 'cajas' }}
			</span>
		</header>

		<div class="dpdf-zona__grilla">
			<!-- Las 12 columnas de fondo. Se resaltan mientras se tira del borde de una caja o del bloque del cliente de ARCA -->
			<div
			class="dpdf-zona__guias"
			aria-hidden="true">
				<span
				v-for="columna in 12"
				:key="columna"
				class="dpdf-zona__guia"></span>
			</div>

			<!--
				Opciones de Sortable, las mismas del editor de Vender (ver EtapaDelEditor.vue):
				forceFallback + fallbackOnBody para que lo que se arrastra lo dibuje Sortable (sombra solo
				ahí, igual con mouse y con el dedo), filter para manijas, botones y el título, delay solo
				en táctil y scroll cerca del borde del modal.
			-->
			<draggable
			class="dpdf-zona__lista"
			:list="lista"
			:group="grupo"
			:move="disenador.permitir_movimiento"
			:animation="150"
			draggable=".dpdf-item-de-zona"
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
			data-lista="zona"
			:data-zona="zona"
			:data-testid="'zona-' + zona + '-disenador-pdf'"
			@start="disenador.al_empezar_arrastre($event)"
			@end="disenador.al_terminar_arrastre($event)">
				<template v-for="item in lista">
					<caja-del-disenador
					v-if="item.tipo === TIPO_CAJA"
					:key="identidad(item)"
					:caja="item"
					:zona="zona"
					@redimension="redimensionando = $event"></caja-del-disenador>

					<bloque-fijo
					v-else-if="item.tipo === TIPO_FIJO"
					:key="identidad(item)"
					:fijo="item"
					@redimension="redimensionando = $event"></bloque-fijo>

					<!--
						Salto de fila: una franja fina punteada. En el PDF no se ve: solo hace que lo que
						sigue arranque en una fila nueva, aunque en la anterior quedara lugar (plan §4.3).
					-->
					<div
					v-else
					:key="identidad(item)"
					class="dpdf-salto dpdf-item-de-zona"
					:class="{ 'dpdf-salto--destacado': disenador.destacado === identidad(item) }"
					data-cols="12"
					data-tipo="salto"
					:data-id="item.id">
						<div class="dpdf-salto__tarjeta">
							<i
							class="bi bi-grip-vertical dpdf-salto__agarre"
							aria-hidden="true"></i>
							<i
							class="bi bi-arrow-return-left dpdf-salto__icono"
							aria-hidden="true"></i>
							<span class="dpdf-salto__nombre">Salto de fila</span>
							<span class="dpdf-salto__pista">lo que sigue empieza abajo · no se imprime</span>
							<button
							type="button"
							class="dpdf-salto__quitar dpdf-no-arrastra"
							title="Quitar este salto de fila"
							aria-label="Quitar este salto de fila"
							@click="disenador.quitar_item(zona, item)">
								<i class="bi bi-x-lg"></i>
							</button>
						</div>
					</div>
				</template>
			</draggable>

			<!-- Zona vacía: el texto va encima de la zona de soltar, sin tapar el arrastre -->
			<div
			v-if="!lista.length"
			class="dpdf-zona__vacia">
				<i class="bi bi-box-arrow-in-down"></i>
				<span>
					Arrastrá una caja acá
					<small class="dpdf-zona__vacia-nota">Mientras esté vacía, no ocupa lugar en el PDF.</small>
				</span>
			</div>
		</div>

		<button
		type="button"
		class="dpdf-zona__agregar"
		:data-testid="'agregar-caja-' + zona + '-disenador-pdf'"
		:aria-label="'Agregar una caja a ' + titulo"
		@click="disenador.agregar_caja(zona)">
			<i class="bi bi-plus-lg"></i>
			Agregar caja
		</button>
	</section>
</template>
<script>
import draggable from 'vuedraggable'
import CajaDelDisenador from './CajaDelDisenador'
import BloqueFijo from './BloqueFijo'
import { TIPO_CAJA, TIPO_FIJO, identidad } from './estado_del_disenador'

/*
	Grupo común de las listas de las zonas: las dos zonas comparten el nombre, así una caja o un
	salto de fila van y vienen entre ellas; la "Caja nueva" y el "Salto de fila" de la bandeja se
	clonan acá. Los bloques fijos también están en este grupo, pero el `move` del diseñador no los
	deja salir de su zona.

	🔴 `put` es la LISTA de grupos que acepta, no `true`: en SortableJS `put: true` acepta elementos
	de CUALQUIER grupo (toFn: value === true → true sin mirar el nombre), así que una zona aceptaba
	un campo suelto. El `move` del diseñador lo vuelve a rechazar.
*/
const GRUPO_DE_CAJAS = {
	name: 'pdf-cajas',
	pull: true,
	put: ['pdf-cajas'],
}

/**
 * Zona de la hoja del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * Recibe la lista de trabajo de la zona y la deja mutar a vuedraggable por referencia (`:list`),
 * como EtapaDelEditor.vue: el diseñador (Index.vue) es el dueño de la lista y ve los cambios sin
 * eventos. Las acciones (agregar, quitar, el `move`, el inicio y el fin de un arrastre) las
 * resuelve el diseñador, que llega por `inject`.
 */
export default {
	name: 'ZonaDelDisenador',
	inject: ['disenador'],
	components: {
		draggable,
		CajaDelDisenador,
		BloqueFijo,
	},
	props: {
		/* 'superior' | 'pie' */
		zona: {
			type: String,
			required: true,
		},
		/* Lista de trabajo de la zona (la muta vuedraggable) */
		lista: {
			type: Array,
			required: true,
		},
		/* Título de la zona ("Arriba de la tabla", "Pie de página") */
		titulo: {
			type: String,
			required: true,
		},
		/* Cuándo sale en el PDF ("sale en todas las hojas", "en la última hoja"...) */
		subtitulo: {
			type: String,
			default: '',
		},
		/* Ícono de la zona (clase de Bootstrap Icons) */
		icono: {
			type: String,
			default: 'bi-layout-text-window',
		},
	},
	data() {
		return {
			/* Constantes para el template */
			TIPO_CAJA: TIPO_CAJA,
			TIPO_FIJO: TIPO_FIJO,
			/* Opciones del grupo de arrastre (ver GRUPO_DE_CAJAS) */
			grupo: GRUPO_DE_CAJAS,
			/* true mientras se tira del borde de una caja (o del bloque del cliente de ARCA) de esta zona: resalta las guías */
			redimensionando: false,
		}
	},
	computed: {
		/**
		 * Cantidad de cajas de la zona (sin saltos de fila ni bloques fijos).
		 *
		 * @returns {number}
		 */
		cantidad_de_cajas() {
			return this.lista.filter(function (item) {
				return item.tipo === TIPO_CAJA
			}).length
		},
		/**
		 * Si se está arrastrando algo que esta zona puede recibir (una caja, un salto o la fuente).
		 *
		 * @returns {boolean}
		 */
		recibe() {
			let arrastrando = this.disenador.arrastrando
			return !!(arrastrando && (arrastrando.tipo === 'caja' || arrastrando.tipo === 'salto' || arrastrando.tipo === 'fuente'))
		},
		/**
		 * Clases de estado de la zona.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-zona--redimensionando': this.redimensionando,
				'dpdf-zona--vacia': !this.lista.length,
				'dpdf-zona--recibe': this.recibe,
			}
		},
	},
	methods: {
		/**
		 * Identidad de un ítem (key del v-for).
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
// Sin `scoped`: el clon de Sortable que sigue al puntero cuelga de <body> y las reglas del hueco y
// del clon (dpdf-hueco / dpdf-levantado, en Index.vue) tienen que alcanzarlo. Colores solo por token.
.dpdf-zona
	margin: 12px 0 14px

.dpdf-zona__cabecera
	display: flex
	align-items: center
	gap: 6px
	margin-bottom: 6px
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.3

.dpdf-zona__icono
	flex: 0 0 auto
	color: var(--color-primary)

.dpdf-zona__titulo
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.03em
	color: var(--color-text-primary)

.dpdf-zona__subtitulo
	flex: 1 1 auto
	min-width: 0
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.dpdf-zona__cantidad
	flex: 0 0 auto
	white-space: nowrap

.dpdf-zona__grilla
	position: relative

// Las guías: mismas 12 columnas y mismo gutter que la lista de arriba, así cada franja coincide
// con el contenido de una caja de una columna. Terminan 10px antes del final porque la última fila
// de cajas tiene ese margen abajo.
.dpdf-zona__guias
	position: absolute
	top: 0
	bottom: 10px
	left: -8px
	right: -8px
	display: flex
	pointer-events: none

.dpdf-zona__guia
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

.dpdf-zona--redimensionando .dpdf-zona__guia::before
	background: var(--bg-nav-hover)
	box-shadow: inset 0 0 0 1px var(--color-border)

// La lista: la fila de 12 columnas y cada ítem con su N/12 leído de data-cols (también el hueco de
// lo que se arrastra, que trae su data-cols: al pasar por la zona ya ocupa lo que va a ocupar).
// min-height para que una zona vacía siga siendo un lugar donde soltar.
.dpdf-zona__lista
	position: relative
	z-index: 1
	display: flex
	flex-wrap: wrap
	align-items: stretch
	align-content: flex-start
	min-height: 64px
	margin: 0 -8px

	> *
		flex: 0 0 100%
		max-width: 100%
		min-width: 0
		padding: 0 8px
		margin-bottom: 10px

		@for $columnas from 1 through 12
			&[data-cols="#{$columnas}"]
				flex-basis: calc(100% * #{$columnas} / 12)
				max-width: calc(100% * #{$columnas} / 12)

.dpdf-zona__vacia
	position: absolute
	top: 0
	left: 0
	right: 0
	z-index: 0
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	min-height: 54px
	padding: 8px 12px
	border: 1.5px dashed var(--color-border)
	border-radius: 8px
	color: var(--color-text-secondary)
	font-size: 0.8rem
	text-align: center
	pointer-events: none

	i
		font-size: 1.05rem

.dpdf-zona__vacia-nota
	display: block
	font-size: 0.7rem

// Mientras se arrastra una caja o un salto: la zona se ofrece como destino
.dpdf-zona--recibe .dpdf-zona__vacia
	border-color: var(--color-primary)
	color: var(--color-primary)

// Cuando el hueco entra a una zona vacía, el texto se corre (:has() es mejora progresiva)
.dpdf-zona__grilla:has(.dpdf-hueco) .dpdf-zona__vacia
	opacity: 0

.dpdf-zona__agregar
	display: inline-flex
	align-items: center
	gap: 5px
	margin-top: -2px
	padding: 3px 10px
	border: 1px dashed var(--color-border)
	border-radius: 999px
	background: var(--bg-card)
	color: var(--color-primary)
	font-size: 0.75rem
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

// ── Salto de fila ────────────────────────────────────────────────────────────────────────────
// Una franja fina punteada y sin fondo: en el PDF no ocupa lugar, solo corta la fila
.dpdf-salto
	position: relative
	display: flex
	min-width: 0

	.dpdf-salto__tarjeta
		display: flex
		align-items: center
		gap: 8px
		flex: 1 1 auto
		min-width: 0
		padding: 2px 6px 2px 8px
		border: 1px dashed var(--color-border)
		border-radius: 8px
		background: var(--bg-card)
		color: var(--color-text-secondary)
		cursor: grab
		user-select: none
		transition: border-color .15s ease

	&:hover .dpdf-salto__tarjeta
		border-color: var(--color-primary)

	.dpdf-salto__agarre,
	.dpdf-salto__icono
		flex: 0 0 auto
		font-size: 0.8rem

	.dpdf-salto__nombre
		flex: 0 0 auto
		font-size: 0.74rem
		font-weight: 500

	.dpdf-salto__pista
		flex: 1 1 auto
		min-width: 0
		font-size: 0.7rem
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.dpdf-salto__quitar
		display: inline-flex
		align-items: center
		justify-content: center
		flex: 0 0 22px
		width: 22px
		height: 22px
		padding: 0
		border: 0
		border-radius: 50%
		background: transparent
		color: var(--color-text-secondary)
		font-size: 0.72rem
		cursor: pointer

		&:hover
			background: var(--btn-peligro-fondo)
			color: var(--btn-peligro-texto)

		&:focus
			outline: none

		&:focus-visible
			box-shadow: 0 0 0 2px var(--color-primary)

	&.dpdf-salto--destacado .dpdf-salto__tarjeta
		animation: dpdf-destello 1.4s ease
</style>
