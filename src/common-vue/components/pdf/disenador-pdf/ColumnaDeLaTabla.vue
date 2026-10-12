<template>
	<!--
		Una columna de la tabla de artículos en la hoja del diseñador de PDF (misión
		diseno-ticket-comandera, 9/10/2026; plan §7.2). Es el ítem que mueve vuedraggable en la fila de
		la tabla (clase dpdf-item-de-tabla) y el que ocupa sus N medias columnas: el ancho lo pone la
		fila leyendo la variable --dpdf-cols (TablaDelDisenador.vue). Va con la variable y no con un
		ancho en línea para que el hueco de una columna que se arrastra DESDE LA BANDEJA (otro
		elemento, que también trae su --dpdf-cols) ocupe en la fila lo que va a ocupar al soltarla.

		Se dibuja como una columna de la tabla del PDF: el rótulo arriba, en el encabezado gris, y dos
		renglones de muestra. Toda la columna se agarra para arrastrar (reordenar), MENOS las manijas y
		los botones (clase dpdf-no-arrastra, el `filter` de Sortable). Un clic (o Enter) la selecciona:
		el panel de propiedades muestra su ancho, el salto de línea y "Quitar de la tabla".

		En un ticket de comandera (plan §7.3) mide sus caracteres del rollo (`en_el_rollo`, de
		tabla_en_el_rollo) y se dibuja como la imprime la comandera: el rótulo en negrita, la línea de
		guiones, dos ítems de muestra y la línea del final, con el espacio que la separa de la
		siguiente adentro (así las columnas, una al lado de la otra, dan el renglón entero).
	-->
	<div
	class="dpdf-columna dpdf-item-de-tabla"
	:class="clases"
	:style="estilo_de_la_columna"
	data-tipo="columna"
	:data-ui="columna.ui_id"
	:data-testid="'columna-' + columna.value_resolver + '-disenador-pdf'"
	tabindex="0"
	role="group"
	:aria-label="etiqueta_accesible"
	@keydown.enter.self.prevent="seleccionar"
	@keydown.space.self.prevent="seleccionar">

		<!-- Manija del borde izquierdo: tirando hacia afuera (a la izquierda) la columna se agranda -->
		<span
		key="manija-izquierda"
		class="dpdf-columna__manija dpdf-columna__manija--izquierda dpdf-no-arrastra"
		title="Tirá para cambiar el ancho"
		aria-hidden="true"
		@click.stop
		@pointerdown="iniciar_redimension($event, 'izquierda')"
		@pointermove="mover_redimension"
		@pointerup="terminar_redimension"
		@pointercancel="terminar_redimension"
		@lostpointercapture="terminar_redimension"></span>

		<div
		class="dpdf-columna__tarjeta"
		@click="seleccionar">
			<!-- Ticket: lo que imprime la comandera en esta columna (solo ilustración) -->
			<renglones-de-ticket
			v-if="en_el_rollo"
			class="dpdf-columna__rollo"
			:renglones="en_el_rollo.renglones"
			:title="columna.nombre + ' · se imprime «' + columna.rotulo + '»'"
			aria-hidden="true"></renglones-de-ticket>

			<!-- El encabezado gris de la tabla del PDF, con el rótulo que se imprime -->
			<div
			v-if="!en_el_rollo"
			class="dpdf-columna__encabezado">
				<span
				class="dpdf-columna__rotulo"
				:title="columna.nombre + ' · se imprime «' + columna.rotulo + '»'">{{ columna.rotulo }}</span>
				<i
				v-if="columna.salto"
				class="bi bi-text-wrap dpdf-columna__salto"
				title="Con salto de línea: un texto largo sigue abajo"
				aria-hidden="true"></i>
			</div>

			<!-- Dos renglones de muestra: lo que importa es el ancho -->
			<div
			v-if="!en_el_rollo"
			class="dpdf-columna__renglones"
			aria-hidden="true">
				<span class="dpdf-columna__raya"></span>
				<span class="dpdf-columna__raya dpdf-columna__raya--corta"></span>
			</div>

			<!--
				El ancho, pegado abajo como en las cajas: − N/24 + en una columna que tiene lugar para
				los botones; en una angosta, solo el número (el − / + está en el panel). Los botones se
				ven al pasar el mouse, al enfocar la columna o con la columna seleccionada (en pantallas
				táctiles, siempre).
			-->
			<div class="dpdf-columna__pie">
				<!-- Ticket: el salto de línea, abajo (el rótulo ya es el que se imprime) -->
				<i
				v-if="en_el_rollo && columna.salto"
				class="bi bi-text-wrap dpdf-columna__salto"
				title="Con salto de línea: un texto largo sigue abajo"
				aria-hidden="true"></i>
				<span
				v-if="con_botones"
				class="dpdf-columna__ancho">
					<button
					type="button"
					class="dpdf-columna__boton dpdf-columna__boton--ancho dpdf-no-arrastra"
					:disabled="columna.cols <= cols_minimo"
					title="Achicar media columna"
					:aria-label="'Achicar la columna ' + columna.nombre + ' media columna'"
					@click.stop="cambiar_cols(-1)">
						<i class="bi bi-dash-lg"></i>
					</button>
					<span
					class="dpdf-columna__cols"
					:title="titulo_del_ancho">{{ columna.cols }}/{{ total_de_columnas }}</span>
					<button
					type="button"
					class="dpdf-columna__boton dpdf-columna__boton--ancho dpdf-no-arrastra"
					:disabled="columna.cols >= total_de_columnas"
					title="Agrandar media columna"
					:aria-label="'Agrandar la columna ' + columna.nombre + ' media columna'"
					@click.stop="cambiar_cols(1)">
						<i class="bi bi-plus-lg"></i>
					</button>
				</span>
				<span
				v-else
				class="dpdf-columna__cols dpdf-columna__cols--solo"
				:title="titulo_del_ancho">{{ columna.cols }}</span>
			</div>
		</div>

		<!--
			Mientras se tira de un borde: el ancho en grande. Las manijas y esta insignia llevan `key`
			para que Vue nunca reutilice el nodo de una manija para dibujar la insignia (perdería la
			captura del puntero en pleno tirón).
		-->
		<span
		v-if="redimensionando"
		key="insignia"
		class="dpdf-columna__insignia"
		aria-hidden="true">{{ columna.cols }}/{{ total_de_columnas }}</span>

		<!-- Manija del borde derecho: tirando hacia afuera (a la derecha) la columna se agranda -->
		<span
		key="manija-derecha"
		class="dpdf-columna__manija dpdf-columna__manija--derecha dpdf-no-arrastra"
		title="Tirá para cambiar el ancho"
		aria-hidden="true"
		@click.stop
		@pointerdown="iniciar_redimension($event, 'derecha')"
		@pointermove="mover_redimension"
		@pointerup="terminar_redimension"
		@pointercancel="terminar_redimension"
		@lostpointercapture="terminar_redimension"></span>
	</div>
</template>
<script>
import redimension_por_columnas from './redimension_por_columnas'
import RenglonesDeTicket from './RenglonesDeTicket'

/* Desde cuántas medias columnas entra el − N/24 + adentro de la columna (si no, solo el número) */
const COLS_PARA_LOS_BOTONES = 5

/**
 * Columna de la tabla de artículos en el diseñador de PDF (misión diseno-ticket-comandera,
 * 9/10/2026).
 *
 * 🔴 `columna` se muta EN EL LUGAR (cols), como la caja: es un objeto de `tabla.visibles` del
 * diseñador, la lista que vuedraggable muta por referencia. El ancho (manijas de los dos bordes y
 * − / +) lo pone el mixin redimension_por_columnas.js, el mismo de las cajas, con la grilla de la
 * tabla (24 medias columnas) y el tope de lo libre en la fila: la suma nunca pasa de la grilla, y
 * pedir más avisa (avisar_tope_de_ancho).
 */
export default {
	name: 'ColumnaDeLaTabla',
	inject: ['disenador'],
	mixins: [redimension_por_columnas],
	components: {
		RenglonesDeTicket,
	},
	props: {
		/* Columna de trabajo (ver tabla_del_disenador.js) */
		columna: {
			type: Object,
			required: true,
		},
		/*
			Solo en un ticket: la columna en el rollo ({ancho, contenido, numerica, renglones}, de
			tabla_en_el_rollo). En una hoja, null.
		*/
		en_el_rollo: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * El ancho de la columna: en una hoja, sus medias columnas (la fila lee --dpdf-cols); en un
		 * ticket, además, sus caracteres del rollo en px (el renglón entero mide N caracteres).
		 *
		 * @returns {Object}
		 */
		estilo_de_la_columna() {
			if (!this.en_el_rollo) {
				return { '--dpdf-cols': this.columna.cols }
			}
			let ancho = (this.en_el_rollo.ancho * this.disenador.caracter_del_rollo_px).toFixed(2) + 'px'
			return {
				'--dpdf-cols': this.columna.cols,
				flex: '0 1 ' + ancho,
				maxWidth: ancho,
			}
		},
		/**
		 * Lo que se ensancha con las manijas y − / + (lo pide el mixin redimension_por_columnas).
		 *
		 * @returns {Object}
		 */
		item_redimensionable() {
			return this.columna
		},
		/**
		 * Ancho mínimo: media columna (lo pide el mixin).
		 *
		 * @returns {number}
		 */
		cols_minimo() {
			return 1
		},
		/**
		 * Medias columnas de la grilla de la tabla (redefine el 12 de las zonas del mixin).
		 *
		 * @returns {number}
		 */
		total_de_columnas() {
			return this.disenador.total_de_la_tabla
		},
		/**
		 * Hasta dónde puede crecer: sus medias columnas más las libres de la fila (redefine el del
		 * mixin). Así tirar de una manija nunca pasa la suma de la grilla.
		 *
		 * @returns {number}
		 */
		cols_maximo() {
			return this.disenador.cols_maximo_de_columna(this.columna)
		},
		/**
		 * Si la columna tiene lugar para el − N/24 + adentro.
		 *
		 * @returns {boolean}
		 */
		con_botones() {
			return this.columna.cols >= COLS_PARA_LOS_BOTONES
		},
		/**
		 * El title del ancho: medias columnas y su equivalente en milímetros en esta hoja.
		 *
		 * @returns {string}
		 */
		titulo_del_ancho() {
			if (this.en_el_rollo) {
				return 'Ocupa ' + this.columna.cols + ' de las ' + this.total_de_columnas + ' medias columnas: '
					+ this.en_el_rollo.contenido + (this.en_el_rollo.contenido === 1 ? ' carácter' : ' caracteres') + ' en la comandera'
			}
			return 'Ocupa ' + this.columna.cols + ' de las ' + this.total_de_columnas + ' medias columnas (unos '
				+ this.disenador.mm_de_columna(this.columna) + ' mm en esta hoja)'
		},
		/**
		 * Si esta columna es la seleccionada.
		 *
		 * @returns {boolean}
		 */
		seleccionada() {
			let seleccion = this.disenador.seleccion_actual
			return !!(seleccion && seleccion.tipo === 'columna' && seleccion.item === this.columna)
		},
		/**
		 * Lo que lee un lector de pantalla al entrar a la columna.
		 *
		 * @returns {string}
		 */
		etiqueta_accesible() {
			return 'Columna ' + this.columna.nombre + ' de la tabla, ' + this.columna.cols + ' de '
				+ this.total_de_columnas + ' medias columnas' + (this.columna.salto ? ', con salto de línea' : '')
				+ (this.seleccionada ? ', seleccionada' : '. Enter para editarla')
		},
		/**
		 * Clases de estado de la columna.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-columna--seleccionada': this.seleccionada,
				'dpdf-columna--redimensionando': this.redimensionando,
				'dpdf-columna--angosta': this.columna.cols < 3,
				'dpdf-columna--destacada': this.disenador.destacado === this.columna.ui_id,
				'dpdf-columna--ticket': !!this.en_el_rollo,
			}
		},
	},
	methods: {
		/**
		 * Selecciona la columna (el panel de propiedades pasa a mostrarla).
		 *
		 * @returns {void}
		 */
		seleccionar() {
			this.disenador.seleccionar('columna', this.columna)
		},
		/**
		 * Se pidió más ancho del que hay libre en la fila (lo llama el mixin): el aviso de tope.
		 *
		 * @returns {void}
		 */
		avisar_tope_de_ancho() {
			this.disenador.avisar_tabla_completa()
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: mientras se arrastra, Sortable dibuja un clon de la columna colgado de <body>
// (fallbackOnBody), fuera del modal, y el clon tiene que verse igual. Todo cuelga de las clases
// dpdf-columna*. El ancho (flex-basis N/total, por --dpdf-cols) y el gutter los pone la fila de la
// tabla (TablaDelDisenador.vue). Colores solo por token. Los botones redondos, el − N/24 + y la
// insignia salen de los mixins de _ancho_por_columnas (los mismos de las cajas); las manijas son
// propias porque el gutter de la tabla es más fino (3px por lado, no 8).
@import '@/common-vue/components/pdf/disenador-pdf/_ancho_por_columnas'

.dpdf-columna
	position: relative
	display: flex
	min-width: 0

	&:focus
		outline: none

	&:focus-visible .dpdf-columna__tarjeta
		box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)

	// La columna como en la tabla del PDF: recuadro fino, encabezado gris y renglones
	.dpdf-columna__tarjeta
		display: flex
		flex-direction: column
		flex: 1 1 auto
		min-width: 0
		border: 1px solid var(--color-border)
		border-radius: 4px
		background: var(--bg-card)
		cursor: grab
		user-select: none
		overflow: hidden
		transition: border-color .15s ease, box-shadow .15s ease

	&:hover .dpdf-columna__tarjeta
		box-shadow: 0 0 0 1px var(--color-primary)

	.dpdf-columna__encabezado
		display: flex
		align-items: center
		gap: 3px
		min-width: 0
		padding: 4px 5px
		background: var(--bg-section)
		border-bottom: 1px solid var(--color-border-secondary)

	.dpdf-columna__rotulo
		flex: 1 1 auto
		min-width: 0
		color: var(--color-text-primary)
		font-family: Arial, Helvetica, sans-serif
		font-size: 0.68rem
		font-weight: 700
		line-height: 1.25
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.dpdf-columna__salto
		flex: 0 0 auto
		color: var(--color-primary)
		font-size: 0.7rem

	.dpdf-columna__renglones
		display: flex
		flex-direction: column
		gap: 6px
		padding: 7px 5px 4px

	.dpdf-columna__raya
		display: block
		height: 5px
		width: 78%
		border-radius: 3px
		background: var(--bg-section)

	.dpdf-columna__raya--corta
		width: 52%

	.dpdf-columna__pie
		display: flex
		justify-content: flex-end
		min-width: 0
		padding: 0 3px 3px

	// Botones redondos chiquitos (− / +)
	.dpdf-columna__boton
		+dpdf-boton-redondo

	// El ancho − N/24 +: − y + se ven al pasar el mouse, al enfocar o con la columna seleccionada
	+dpdf-ancho('dpdf-columna', 'dpdf-columna--seleccionada')

	// Solo el número, en una columna angosta
	.dpdf-columna__cols--solo
		min-width: 0
		padding: 1px 4px

	// Manijas: sobre el gutter de la tabla (3px por lado), centradas en el borde de la tarjeta
	.dpdf-columna__manija
		position: absolute
		top: 0
		bottom: 0
		z-index: 2
		display: flex
		align-items: center
		justify-content: center
		width: 10px
		cursor: ew-resize
		// Sin esto, en una pantalla táctil tirar de la manija scrollea la página
		touch-action: none

		&::before
			content: ''
			width: 4px
			height: 26px
			max-height: 70%
			border-radius: 999px
			background: var(--color-primary)
			opacity: 0
			transition: opacity .15s ease

	.dpdf-columna__manija--izquierda
		left: -2px

	.dpdf-columna__manija--derecha
		right: -2px

	&:hover .dpdf-columna__manija::before
		opacity: .5

	.dpdf-columna__manija:hover::before
		opacity: 1

	// Seleccionada: anillo primario por fuera
	&.dpdf-columna--seleccionada .dpdf-columna__tarjeta
		border-color: var(--color-primary)
		box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)

	// Mientras se tira: anillo suave y manijas firmes
	&.dpdf-columna--redimensionando
		.dpdf-columna__tarjeta
			box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)
			cursor: ew-resize

		.dpdf-columna__manija::before
			opacity: 1

	// La insignia grande "N/24" del medio de la columna mientras se tira
	+dpdf-insignia('dpdf-columna')

	// Columna angosta (1 o 2 medias columnas): el rótulo y el número, sin aire
	&.dpdf-columna--angosta
		.dpdf-columna__encabezado
			padding: 4px 2px

		.dpdf-columna__pie
			justify-content: center
			padding: 0 1px 3px

	// Recién agregada o mostrada: un destello del borde para encontrarla
	&.dpdf-columna--destacada .dpdf-columna__tarjeta
		animation: dpdf-destello 1.4s ease

// Pantallas táctiles: manijas y − / + siempre a la vista, y manijas más anchas para el dedo
@media (hover: none)
	.dpdf-columna
		.dpdf-columna__boton.dpdf-columna__boton--ancho
			opacity: 1

			&:disabled
				opacity: .35

		.dpdf-columna__manija
			width: 14px

			&::before
				opacity: .45

		.dpdf-columna__manija--izquierda
			left: -4px

		.dpdf-columna__manija--derecha
			right: -4px

// ── Ticket de comandera ────────────────────────────────────────────────────────────────────────
// La columna en el rollo: sin recuadro ni encabezado gris (la comandera no los dibuja), un contorno
// punteado tenue para ver dónde está, y sus renglones justo en sus caracteres. La letra de la
// interfaz para el pie; los renglones traen la de la comandera.
.dpdf-columna.dpdf-columna--ticket
	font-family: var(--font-family-sans-serif)

	.dpdf-columna__tarjeta
		border: 0
		border-radius: 0
		background: transparent
		box-shadow: inset 0 0 0 1px var(--color-border-secondary)

	&:hover .dpdf-columna__tarjeta
		box-shadow: inset 0 0 0 1px var(--color-primary)

	&.dpdf-columna--seleccionada .dpdf-columna__tarjeta,
	&.dpdf-columna--redimensionando .dpdf-columna__tarjeta
		box-shadow: inset 0 0 0 2px var(--color-primary)

	.dpdf-columna__rollo
		padding: 2px 0

	.dpdf-columna__pie
		align-items: center
		gap: 2px
		padding: 0 1px 2px

	.dpdf-columna__manija--izquierda
		left: -5px

	.dpdf-columna__manija--derecha
		right: -5px
</style>
