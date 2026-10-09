<template>
	<!--
		Bloque fijo de la factura de ARCA en una zona del diseñador: los datos del cliente que pide
		ARCA (arriba) o el cuadro de importes + QR + CAE (en el pie). Es un ítem de la lista de la zona
		(clase dpdf-item-de-zona). Se mueve dentro de su zona -- el `move` del diseñador rechaza
		llevarlo a la otra o a la bandeja -- y no tiene ✕: lo pide ARCA (decisión 4 del plan).

		El ancho lo dice el catálogo (`redimensionable` y `cols_min` de su definición en `fijos`): el
		del cliente cambia de ancho como una caja -- manijas en los dos bordes, − N/12 + y la insignia
		mientras se tira, de a una columna y acotado a cols_min..12 -- y con menos de 12 columnas deja
		lugar para una caja al lado; el del pie va siempre a lo ancho (data-cols 12), sin manijas.

		En un ticket de comandera (misión diseno-ticket-comandera, D8) son tres -- el del emisor, el
		del cliente y el del pie -- y van siempre a lo ancho del rollo. Se dibujan con su nombre y una
		muestra de lo que imprimen, en la letra de la comandera (el del pie, con un QR de muestra).
	-->
	<div
	class="dpdf-fijo dpdf-item-de-zona"
	:class="clases"
	:data-cols="cols"
	data-tipo="fijo"
	:data-key="fijo.key"
	:data-testid="'fijo-' + fijo.key + '-disenador-pdf'"
	tabindex="0"
	role="group"
	:aria-label="etiqueta_accesible"
	@click="seleccionar"
	@keydown.enter.self.prevent="seleccionar"
	@keydown.space.self.prevent="seleccionar">

		<!--
			Manija del borde izquierdo: tirando hacia afuera (a la izquierda) el bloque se agranda. El
			clic no llega al bloque (como en la caja, tirar de un borde no lo selecciona).
		-->
		<span
		v-if="redimensionable"
		key="manija-izquierda"
		class="dpdf-fijo__manija dpdf-fijo__manija--izquierda dpdf-no-arrastra"
		title="Tirá para cambiar el ancho"
		aria-hidden="true"
		@click.stop
		@pointerdown="iniciar_redimension($event, 'izquierda')"
		@pointermove="mover_redimension"
		@pointerup="terminar_redimension"
		@pointercancel="terminar_redimension"
		@lostpointercapture="terminar_redimension"></span>

		<div
		v-if="!es_ticket"
		class="dpdf-fijo__tarjeta">
			<i
			class="bi bi-grip-vertical dpdf-fijo__agarre"
			title="Arrastrá para moverlo dentro de su zona"
			aria-hidden="true"></i>
			<span
			class="dpdf-fijo__candado"
			:title="motivo"
			aria-hidden="true">
				<i class="bi bi-lock-fill"></i>
			</span>
			<div class="dpdf-fijo__textos">
				<!-- En un bloque angosto el nombre se corta con "…": el title lo muestra entero -->
				<span
				class="dpdf-fijo__nombre"
				:title="nombre">{{ nombre }}</span>
				<span
				v-if="descripcion"
				class="dpdf-fijo__descripcion">{{ descripcion }}</span>
			</div>
			<span
			v-if="tiene_importes"
			class="dpdf-fijo__estado"
			:class="{ 'dpdf-fijo__estado--apagado': !fijo.importes }">
				{{ fijo.importes ? 'Con el cuadro de importes' : 'Sin el cuadro de importes' }}
			</span>

			<!--
				El ancho (− N/12 +), como en una caja: los botones se ven al pasar el mouse o al enfocar
				el bloque con el teclado (en pantallas táctiles, siempre), y son el camino por teclado
				para cambiarlo.
			-->
			<span
			v-if="redimensionable"
			class="dpdf-fijo__ancho">
				<button
				type="button"
				class="dpdf-fijo__boton dpdf-fijo__boton--ancho dpdf-no-arrastra"
				:disabled="cols <= cols_minimo"
				title="Achicar una columna"
				:aria-label="'Achicar «' + nombre + '» una columna'"
				@click.stop="cambiar_cols(-1)">
					<i class="bi bi-dash-lg"></i>
				</button>
				<span
				class="dpdf-fijo__cols"
				:title="'Ocupa ' + cols + ' de las 12 columnas (de ' + cols_minimo + ' a 12)'">{{ cols }}/12</span>
				<button
				type="button"
				class="dpdf-fijo__boton dpdf-fijo__boton--ancho dpdf-no-arrastra"
				:disabled="cols >= 12"
				title="Agrandar una columna"
				:aria-label="'Agrandar «' + nombre + '» una columna'"
				@click.stop="cambiar_cols(1)">
					<i class="bi bi-plus-lg"></i>
				</button>
			</span>
		</div>

		<!-- Ticket: el nombre del bloque y una muestra de lo que imprime la comandera -->
		<div
		v-else
		class="dpdf-fijo__tarjeta dpdf-fijo__tarjeta--ticket">
			<span class="dpdf-fijo__cabecera">
				<span
				class="dpdf-fijo__candado"
				:title="motivo"
				aria-hidden="true">
					<i class="bi bi-lock-fill"></i>
				</span>
				<span
				class="dpdf-fijo__nombre"
				:title="nombre">{{ nombre }}</span>
				<span
				v-if="tiene_importes"
				class="dpdf-fijo__estado"
				:class="{ 'dpdf-fijo__estado--apagado': !fijo.importes }">
					{{ fijo.importes ? 'Con el IVA' : 'Sin el IVA' }}
				</span>
			</span>
			<renglones-de-ticket
			:renglones="muestra_en_el_rollo.renglones"
			aria-hidden="true"></renglones-de-ticket>
			<span
			v-if="muestra_en_el_rollo.qr"
			class="dpdf-fijo__qr"
			:style="estilo_del_qr"
			title="El código QR de ARCA (de muestra)"
			aria-hidden="true"></span>
			<span class="dpdf-fijo__muestra">Datos de muestra: salen los de la factura.</span>
		</div>

		<!--
			Mientras se tira de un borde: el ancho en grande. Las manijas y esta insignia llevan `key`
			para que Vue nunca reutilice el nodo de una manija para dibujar la insignia (perdería la
			captura del puntero en pleno tirón).
		-->
		<span
		v-if="redimensionando"
		key="insignia"
		class="dpdf-fijo__insignia"
		aria-hidden="true">{{ cols }}/12</span>

		<!-- Manija del borde derecho: tirando hacia afuera (a la derecha) el bloque se agranda -->
		<span
		v-if="redimensionable"
		key="manija-derecha"
		class="dpdf-fijo__manija dpdf-fijo__manija--derecha dpdf-no-arrastra"
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
import { cols_de_fijo, cols_minimo_de_fijo } from './estado_del_disenador'
import { fijo_de_muestra } from './vista_de_ticket'

/* Lado del QR de muestra del ticket, en renglones del rollo */
const RENGLONES_DEL_QR = 6

/* Lo que se dice del candado de un bloque fijo, según cambie de ancho o no */
const MOTIVO_DEL_CANDADO = 'Lo pide ARCA: se puede mover dentro de su zona, pero no sacar.'
const MOTIVO_DEL_CANDADO_CON_ANCHO = 'Lo pide ARCA: se puede mover dentro de su zona y cambiar de ancho, pero no sacar.'

/**
 * Bloque fijo de la factura de ARCA en el diseñador de PDF (misión diseno-pdf-configurable,
 * 1/10/2026). El nombre, la descripción y si cambia de ancho (y desde cuántas columnas) salen de
 * `fijos` del catálogo. Sus datos propios son `importes` (solo el del pie, se cambia desde el panel
 * de propiedades) y `cols` (solo el que cambia de ancho).
 *
 * 🔴 `fijo` se muta EN EL LUGAR (cols), como la caja: es el objeto de la lista de trabajo. El ancho
 * (manijas, − / + y la insignia) lo pone el mixin redimension_por_columnas.js, el mismo de la caja.
 */
export default {
	name: 'BloqueFijo',
	inject: ['disenador'],
	mixins: [redimension_por_columnas],
	components: {
		RenglonesDeTicket,
	},
	props: {
		/* Bloque de trabajo: {tipo: 'fijo', key, (cols), (importes)} */
		fijo: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Si el bloque está en un ticket de comandera.
		 *
		 * @returns {boolean}
		 */
		es_ticket() {
			return this.disenador.es_ticket
		},
		/**
		 * La muestra de lo que imprime el bloque en el rollo (vista_de_ticket.js, fijo_de_muestra):
		 * renglones y si lleva el QR.
		 *
		 * @returns {{renglones: Array, qr: boolean}}
		 */
		muestra_en_el_rollo() {
			if (!this.es_ticket) {
				return { renglones: [], qr: false }
			}
			return fijo_de_muestra(this.fijo.key, this.disenador.caracteres_del_rollo, this.fijo.importes !== false)
		},
		/**
		 * El tamaño del QR de muestra (un cuadrado de unos renglones de lado).
		 *
		 * @returns {Object}
		 */
		estilo_del_qr() {
			let lado = RENGLONES_DEL_QR * this.disenador.renglon_del_rollo_px
			return {
				width: lado + 'px',
				height: lado + 'px',
			}
		},
		/**
		 * Definición del bloque en el catálogo ({key, zona, nombre, descripcion, redimensionable,
		 * cols_min}), o null.
		 *
		 * @returns {Object|null}
		 */
		definicion() {
			return this.disenador.fijos_por_key[this.fijo.key] || null
		},
		/**
		 * Si el bloque cambia de ancho (lo dice el catálogo: el del cliente sí, el del pie no).
		 *
		 * @returns {boolean}
		 */
		redimensionable() {
			return !!(this.definicion && this.definicion.redimensionable)
		},
		/**
		 * Lo que se ensancha con las manijas y − / + (lo pide el mixin redimension_por_columnas).
		 *
		 * @returns {Object}
		 */
		item_redimensionable() {
			return this.fijo
		},
		/**
		 * Ancho mínimo: el `cols_min` del catálogo (lo pide el mixin redimension_por_columnas).
		 *
		 * @returns {number}
		 */
		cols_minimo() {
			return cols_minimo_de_fijo(this.definicion)
		},
		/**
		 * Columnas que ocupa en la grilla de la zona: las suyas si cambia de ancho; si no, 12.
		 *
		 * @returns {number}
		 */
		cols() {
			let cols = cols_de_fijo(this.definicion, this.fijo.cols)
			return cols === null ? 12 : cols
		},
		/**
		 * Texto del candado.
		 *
		 * @returns {string}
		 */
		motivo() {
			return this.redimensionable ? MOTIVO_DEL_CANDADO_CON_ANCHO : MOTIVO_DEL_CANDADO
		},
		/**
		 * Nombre del bloque.
		 *
		 * @returns {string}
		 */
		nombre() {
			return this.definicion ? this.definicion.nombre : this.fijo.key
		},
		/**
		 * Explicación del bloque.
		 *
		 * @returns {string}
		 */
		descripcion() {
			return this.definicion ? this.definicion.descripcion : ''
		},
		/**
		 * Si el bloque tiene la opción del cuadro de importes (solo el del pie la trae).
		 *
		 * @returns {boolean}
		 */
		tiene_importes() {
			return Object.prototype.hasOwnProperty.call(this.fijo, 'importes')
		},
		/**
		 * Si este bloque es el seleccionado.
		 *
		 * @returns {boolean}
		 */
		seleccionado() {
			let seleccion = this.disenador.seleccion_actual
			return !!(seleccion && seleccion.item === this.fijo)
		},
		/**
		 * Lo que lee un lector de pantalla al llegar al bloque.
		 *
		 * @returns {string}
		 */
		etiqueta_accesible() {
			return this.nombre + ', bloque fijo de ARCA'
				+ (this.redimensionable ? ', ' + this.cols + ' de 12 columnas' : '')
				+ (this.seleccionado ? ', seleccionado' : '') + '. ' + this.motivo
		},
		/**
		 * Clases de estado.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-fijo--seleccionado': this.seleccionado,
				'dpdf-fijo--redimensionando': this.redimensionando,
				'dpdf-fijo--destacado': this.disenador.destacado === 'fijo:' + this.fijo.key,
				'dpdf-fijo--ticket': this.es_ticket,
			}
		},
	},
	methods: {
		/**
		 * Selecciona el bloque (el panel muestra su descripción y, según el bloque, el ancho o los
		 * importes).
		 *
		 * @returns {void}
		 */
		seleccionar() {
			this.disenador.seleccionar('fijo', this.fijo)
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: el clon de Sortable que sigue al puntero cuelga de <body>. Colores solo por token.
// El ancho (flex-basis N/12), el gutter y el margen de abajo los pone la lista de la zona
// (ZonaDelDisenador.vue). Las manijas, el ancho − N/12 +, la insignia y los botones redondos del
// bloque que cambia de ancho salen de los mixins de _ancho_por_columnas (los mismos de la caja).
@import '@/common-vue/components/pdf/disenador-pdf/_ancho_por_columnas'

.dpdf-fijo
	position: relative
	display: flex
	min-width: 0

	&:focus
		outline: none

	&:focus-visible .dpdf-fijo__tarjeta
		box-shadow: 0 0 0 2px var(--color-primary)

	// La tarjeta del bloque fijo: el mismo lenguaje que los bloques con candado de Vender
	.dpdf-fijo__tarjeta
		display: flex
		align-items: center
		gap: 8px
		flex: 1 1 auto
		min-width: 0
		padding: 8px 12px
		border: 1px solid var(--color-border-secondary)
		border-radius: 8px
		background: var(--bg-section)
		color: var(--color-text-secondary)
		cursor: grab
		user-select: none
		transition: border-color .15s ease, box-shadow .15s ease

	&:hover .dpdf-fijo__tarjeta
		border-color: var(--color-primary)

	.dpdf-fijo__agarre,
	.dpdf-fijo__candado
		flex: 0 0 auto
		font-size: 0.8rem

	.dpdf-fijo__textos
		display: flex
		flex-direction: column
		gap: 1px
		flex: 1 1 auto
		min-width: 0

	.dpdf-fijo__nombre
		color: var(--color-text-primary)
		font-size: 0.8rem
		font-weight: 600
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.dpdf-fijo__descripcion
		font-size: 0.72rem
		line-height: 1.3
		display: -webkit-box
		-webkit-line-clamp: 2
		-webkit-box-orient: vertical
		overflow: hidden

	.dpdf-fijo__estado
		flex: 0 0 auto
		padding: 2px 8px
		border-radius: 999px
		background: var(--bg-nav-hover)
		color: var(--color-primary)
		font-size: 0.7rem
		font-weight: 600
		white-space: nowrap

	.dpdf-fijo__estado--apagado
		background: var(--bg-card)
		color: var(--color-text-secondary)

	// − / + del ancho (solo el bloque que cambia de ancho)
	.dpdf-fijo__boton
		+dpdf-boton-redondo

	// El ancho − N/12 +, al final de la tarjeta: − y + se ven al pasar el mouse, al enfocar el
	// bloque o con el bloque seleccionado
	+dpdf-ancho('dpdf-fijo', 'dpdf-fijo--seleccionado')

	// Manijas de los dos bordes
	+dpdf-manijas('dpdf-fijo')

	&.dpdf-fijo--seleccionado .dpdf-fijo__tarjeta
		border-color: var(--color-primary)
		box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)

	// Mientras se tira: anillo suave y manijas firmes
	&.dpdf-fijo--redimensionando
		.dpdf-fijo__tarjeta
			border-color: var(--color-primary)
			box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)
			cursor: ew-resize

		.dpdf-fijo__manija::before
			opacity: 1

	// La insignia grande "N/12" del medio del bloque mientras se tira
	+dpdf-insignia('dpdf-fijo')

	&.dpdf-fijo--destacado .dpdf-fijo__tarjeta
		animation: dpdf-destello 1.4s ease

// Pantallas táctiles: manijas y − / + siempre a la vista, y manijas más anchas para el dedo
@media (hover: none)
	.dpdf-fijo
		+dpdf-ancho-tactil('dpdf-fijo')

// ── Ticket de comandera ────────────────────────────────────────────────────────────────────────
// El bloque en el rollo: el nombre arriba (con la letra de la interfaz) y la muestra en la letra de
// la comandera, a todo el ancho, sobre un fondo apenas gris (son datos de muestra, no se editan).
@import '@/common-vue/components/pdf/disenador-pdf/_ticket'

.dpdf-fijo.dpdf-fijo--ticket
	font-family: var(--font-family-sans-serif)

	.dpdf-fijo__tarjeta--ticket
		flex-direction: column
		align-items: stretch
		gap: 3px
		padding: 3px 0 5px
		border: 0
		border-radius: 3px
		outline: 1px dashed var(--color-border)
		outline-offset: 0

	&.dpdf-fijo--seleccionado .dpdf-fijo__tarjeta--ticket
		outline-color: var(--color-primary)

	.dpdf-fijo__cabecera
		display: flex
		align-items: center
		gap: 6px
		min-width: 0
		color: var(--color-text-secondary)

	.dpdf-fijo__nombre
		flex: 1 1 auto
		min-width: 0
		font-size: 0.74rem

	.dpdf-fijo__qr
		align-self: center
		margin: 4px 0 2px
		+dpdf-qr-de-muestra

	.dpdf-fijo__muestra
		color: var(--color-text-secondary)
		font-size: 0.66rem
		font-style: italic
		text-align: center
</style>
