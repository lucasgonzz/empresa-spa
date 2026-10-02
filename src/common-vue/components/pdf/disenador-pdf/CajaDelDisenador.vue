<template>
	<!--
		Una caja (cuadrante) de una zona del diseñador de PDF. Este <div> es el ítem que mueve
		vuedraggable en la zona (clase dpdf-item-de-zona) y el que ocupa sus N/12 columnas: el ancho
		lo pone la lista de la zona leyendo `data-cols` (ZonaDelDisenador.vue), igual que en el editor
		de Diseños de Vender.

		Toda la caja se agarra para arrastrar, MENOS las manijas, los botones y el título: esos llevan
		la clase dpdf-no-arrastra, que es el `filter` de Sortable. Adentro va otra lista arrastrable,
		la de sus campos (grupo pdf-campos): Sortable resuelve la anidación solo, el arrastre lo toma
		la lista más de adentro que tenga un ítem bajo el puntero.
	-->
	<div
	class="dpdf-caja dpdf-item-de-zona"
	:class="clases"
	:data-cols="caja.cols"
	data-tipo="caja"
	:data-id="caja.id"
	:data-testid="'caja-' + caja.id + '-disenador-pdf'"
	role="group"
	:aria-label="etiqueta_accesible">

		<!-- Manija del borde izquierdo: tirando hacia afuera (a la izquierda) la caja se agranda -->
		<span
		key="manija-izquierda"
		class="dpdf-caja__manija dpdf-caja__manija--izquierda dpdf-no-arrastra"
		title="Tirá para cambiar el ancho"
		aria-hidden="true"
		@pointerdown="iniciar_redimension($event, 'izquierda')"
		@pointermove="mover_redimension"
		@pointerup="terminar_redimension"
		@pointercancel="terminar_redimension"
		@lostpointercapture="terminar_redimension"></span>

		<div
		class="dpdf-caja__tarjeta"
		:class="'dpdf-caja__tarjeta--' + caja.estilo"
		@click="seleccionar">

			<!--
				Cabecera: agarre, el título editable en el lugar (se imprime arriba de los campos, en
				negrita gris como en el PDF), los tres estilos y la ✕. En una caja angosta los estilos
				quedan solo en el panel de propiedades.
			-->
			<div class="dpdf-caja__cabecera">
				<i
				class="bi bi-grip-vertical dpdf-caja__agarre"
				title="Arrastrá para mover la caja"
				aria-hidden="true"></i>

				<input
				v-if="caja.cols > 1"
				type="text"
				class="dpdf-caja__titulo dpdf-no-arrastra"
				:value="caja.titulo"
				:maxlength="disenador.limites.max_titulo"
				placeholder="Título (opcional)"
				autocomplete="off"
				:aria-label="'Título de la caja (se imprime arriba de sus campos)'"
				:style="estilo_del_titulo"
				:data-testid="'titulo-caja-' + caja.id + '-disenador-pdf'"
				@input="caja.titulo = $event.target.value"
				@focus="seleccionar"
				@click.stop>
				<span
				v-else
				class="dpdf-caja__relleno"></span>

				<span
				v-if="caja.cols > 3"
				class="dpdf-caja__estilos"
				role="group"
				aria-label="Estilo de la caja">
					<button
					v-for="estilo in disenador.limites.estilos_de_caja"
					:key="estilo"
					type="button"
					class="dpdf-caja__boton dpdf-no-arrastra"
					:class="{ 'dpdf-caja__boton--activo': caja.estilo === estilo }"
					:title="nombre_del_estilo(estilo)"
					:aria-label="'Estilo: ' + nombre_del_estilo(estilo)"
					:aria-pressed="caja.estilo === estilo ? 'true' : 'false'"
					@click.stop="caja.estilo = estilo">
						<i
						class="bi"
						:class="icono_del_estilo(estilo)"></i>
					</button>
				</span>

				<button
				type="button"
				class="dpdf-caja__boton dpdf-caja__boton--quitar dpdf-no-arrastra"
				title="Quitar la caja"
				:aria-label="'Quitar la caja ' + nombre_accesible"
				:data-testid="'quitar-caja-' + caja.id + '-disenador-pdf'"
				@click.stop="disenador.quitar_item(zona, caja)">
					<i class="bi bi-x-lg"></i>
				</button>
			</div>

			<!-- Los campos: lista arrastrable entre las cajas de las dos zonas y la bandeja -->
			<div class="dpdf-caja__cuerpo">
				<draggable
				class="dpdf-caja__campos"
				:list="caja.campos"
				:group="grupo"
				:move="disenador.permitir_movimiento"
				:animation="150"
				draggable=".dpdf-item-de-caja"
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
				data-lista="campos"
				:data-caja="caja.id"
				@start="disenador.al_empezar_arrastre($event)"
				@end="disenador.al_terminar_arrastre($event)">
					<campo-de-caja
					v-for="campo in caja.campos"
					:key="campo.ui_id"
					:campo="campo"
					:cols_de_la_caja="caja.cols"></campo-de-caja>
				</draggable>

				<!-- Caja vacía: el texto va encima de la zona de soltar, sin tapar el arrastre -->
				<div
				v-if="!caja.campos.length"
				class="dpdf-caja__vacia">
					<i class="bi bi-box-arrow-in-down"></i>
					<span>Arrastrá campos acá</span>
				</div>
			</div>

			<!--
				Pie: el ancho (− N/12 +), pegado abajo a la derecha como en Vender. Los botones se ven al
				pasar el mouse o al enfocar algo de la caja con el teclado (en pantallas táctiles,
				siempre), y son el camino por teclado para cambiar el ancho.
			-->
			<div class="dpdf-caja__pie">
				<span class="dpdf-caja__ancho">
					<button
					type="button"
					class="dpdf-caja__boton dpdf-caja__boton--ancho dpdf-no-arrastra"
					:disabled="caja.cols <= 1"
					title="Achicar una columna"
					:aria-label="'Achicar la caja ' + nombre_accesible + ' una columna'"
					@click.stop="cambiar_cols(-1)">
						<i class="bi bi-dash-lg"></i>
					</button>
					<span
					class="dpdf-caja__cols"
					:title="'Ocupa ' + caja.cols + ' de las 12 columnas'">{{ caja.cols }}/12</span>
					<button
					type="button"
					class="dpdf-caja__boton dpdf-caja__boton--ancho dpdf-no-arrastra"
					:disabled="caja.cols >= 12"
					title="Agrandar una columna"
					:aria-label="'Agrandar la caja ' + nombre_accesible + ' una columna'"
					@click.stop="cambiar_cols(1)">
						<i class="bi bi-plus-lg"></i>
					</button>
				</span>
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
		class="dpdf-caja__insignia"
		aria-hidden="true">{{ caja.cols }}/12</span>

		<!-- Manija del borde derecho: tirando hacia afuera (a la derecha) la caja se agranda -->
		<span
		key="manija-derecha"
		class="dpdf-caja__manija dpdf-caja__manija--derecha dpdf-no-arrastra"
		title="Tirá para cambiar el ancho"
		aria-hidden="true"
		@pointerdown="iniciar_redimension($event, 'derecha')"
		@pointermove="mover_redimension"
		@pointerup="terminar_redimension"
		@pointercancel="terminar_redimension"
		@lostpointercapture="terminar_redimension"></span>
	</div>
</template>
<script>
import draggable from 'vuedraggable'
import CampoDeCaja from './CampoDeCaja'
import redimension_por_columnas from './redimension_por_columnas'
import { nombre_del_estilo, icono_del_estilo } from './estilos_de_caja'

/*
	Grupo de las listas de campos: todas las cajas (de las dos zonas) y la bandeja comparten el
	nombre, así un campo va y viene entre cualquiera de ellas. Declarado afuera para no crear un
	objeto nuevo en cada render (vuedraggable le pasa sus atributos a Sortable cada vez que cambian).

	🔴 `put` es la LISTA de grupos que acepta, no `true`: en SortableJS `put: true` acepta elementos
	de CUALQUIER grupo (toFn: value === true → true sin mirar el nombre), y una "Caja nueva" soltada
	sobre una caja terminaba adentro de sus campos. El `move` del diseñador lo vuelve a rechazar.
*/
const GRUPO_DE_CAMPOS = {
	name: 'pdf-campos',
	pull: true,
	put: ['pdf-campos'],
}

/* Milímetros de un punto tipográfico y tamaño del título de una caja en el PDF (plan §4.4: 9 pt) */
const MM_POR_PUNTO = 0.3528
const PUNTOS_DEL_TITULO = 9

/**
 * Caja de una zona del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * 🔴 `caja` se muta EN EL LUGAR (cols, titulo, estilo), a propósito: es un objeto de las listas de
 * trabajo del diseñador, las mismas que vuedraggable muta por referencia (`:list`). Es el patrón de
 * ElementoDelEditor.vue (Diseños de Vender) y hace que el diseñador vea el cambio sin eventos.
 *
 * El ancho (manijas de los dos bordes y − / +, acotado a 1..12) lo pone el mixin
 * redimension_por_columnas.js, el mismo que usa el bloque del cliente de la factura de ARCA.
 */
export default {
	name: 'CajaDelDisenador',
	inject: ['disenador'],
	mixins: [redimension_por_columnas],
	components: {
		draggable,
		CampoDeCaja,
	},
	props: {
		/* Caja de trabajo: {tipo: 'caja', id, cols, titulo, estilo, campos} */
		caja: {
			type: Object,
			required: true,
		},
		/* Zona donde está: 'superior' | 'pie' (para quitarla) */
		zona: {
			type: String,
			required: true,
		},
	},
	data() {
		return {
			/* Opciones del grupo de arrastre de los campos (ver GRUPO_DE_CAMPOS) */
			grupo: GRUPO_DE_CAMPOS,
		}
	},
	computed: {
		/**
		 * Lo que se ensancha con las manijas y − / + (lo pide el mixin redimension_por_columnas).
		 *
		 * @returns {Object}
		 */
		item_redimensionable() {
			return this.caja
		},
		/**
		 * Ancho mínimo de una caja: una columna (lo pide el mixin redimension_por_columnas).
		 *
		 * @returns {number}
		 */
		cols_minimo() {
			return 1
		},
		/**
		 * Cómo se nombra la caja para un lector de pantalla y en los botones: su título, o "sin título".
		 *
		 * @returns {string}
		 */
		nombre_accesible() {
			let titulo = String(this.caja.titulo || '').trim()
			return titulo ? '«' + titulo + '»' : 'sin título'
		},
		/**
		 * Lo que lee un lector de pantalla al entrar a la caja.
		 *
		 * @returns {string}
		 */
		etiqueta_accesible() {
			let cantidad = this.caja.campos.length
			return 'Caja ' + this.nombre_accesible + ', ' + this.caja.cols + ' de 12 columnas, '
				+ cantidad + (cantidad === 1 ? ' campo' : ' campos')
				+ (this.seleccionada ? ', seleccionada' : '')
		},
		/**
		 * Si esta caja es la seleccionada.
		 *
		 * @returns {boolean}
		 */
		seleccionada() {
			let seleccion = this.disenador.seleccion_actual
			return !!(seleccion && seleccion.tipo === 'caja' && seleccion.item === this.caja)
		},
		/**
		 * Letra del título, escalada a la hoja como el resto de la vista previa.
		 *
		 * @returns {Object}
		 */
		estilo_del_titulo() {
			let letra = Math.max(8, PUNTOS_DEL_TITULO * MM_POR_PUNTO * this.disenador.escala)
			return {
				fontSize: letra.toFixed(1) + 'px',
			}
		},
		/**
		 * Clases de estado de la caja.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-caja--seleccionada': this.seleccionada,
				'dpdf-caja--redimensionando': this.redimensionando,
				'dpdf-caja--angosta': this.caja.cols <= 3,
				'dpdf-caja--una-columna': this.caja.cols === 1,
				'dpdf-caja--destacada': this.disenador.destacado === 'caja:' + this.caja.id,
			}
		},
	},
	methods: {
		/**
		 * Nombre de un estilo de caja (ver estilos_de_caja.js).
		 *
		 * @param {string} estilo
		 * @returns {string}
		 */
		nombre_del_estilo(estilo) {
			return nombre_del_estilo(estilo)
		},
		/**
		 * Ícono de un estilo de caja.
		 *
		 * @param {string} estilo
		 * @returns {string}
		 */
		icono_del_estilo(estilo) {
			return icono_del_estilo(estilo)
		},
		/**
		 * Selecciona la caja (el panel de propiedades pasa a mostrarla).
		 *
		 * @returns {void}
		 */
		seleccionar() {
			this.disenador.seleccionar('caja', this.caja)
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: mientras se arrastra, Sortable dibuja un clon de la caja colgado de <body>
// (fallbackOnBody), fuera del modal, y el clon tiene que verse igual. Ninguna regla depende de un
// ancestro: todo cuelga de las clases dpdf-caja*. El ancho (flex-basis N/12), el gutter y el margen
// de abajo los pone la lista de la zona (ZonaDelDisenador.vue). Colores solo por token. Las manijas,
// el ancho − N/12 +, la insignia y los botones redondos salen de los mixins de _ancho_por_columnas
// (los mismos del bloque del cliente de ARCA).
@import '@/common-vue/components/pdf/disenador-pdf/_ancho_por_columnas'

.dpdf-caja
	position: relative
	display: flex
	min-width: 0

	// La tarjeta se ve como el estilo de la caja en el PDF (borde, gris o sin recuadro)
	.dpdf-caja__tarjeta
		display: flex
		flex-direction: column
		gap: 4px
		flex: 1 1 auto
		min-width: 0
		padding: 6px 8px 6px
		border-radius: 6px
		cursor: grab
		user-select: none
		transition: border-color .15s ease, box-shadow .15s ease, background .15s ease

	// borde: el recuadro de línea fina del PDF. El fondo es el del papel (--bg-card), opaco a
	// propósito: tapa las guías de la zona, como el papel del PDF
	.dpdf-caja__tarjeta--borde
		border: 1px solid var(--color-text-secondary)
		background: var(--bg-card)

	// gris: fondo gris claro con borde suave (el de los totales de siempre)
	.dpdf-caja__tarjeta--gris
		border: 1px solid var(--color-border)
		background: var(--bg-section)

	// ninguno: sin recuadro en el PDF; acá, un contorno punteado tenue para ver dónde está
	.dpdf-caja__tarjeta--ninguno
		border: 1px dashed var(--color-border)
		background: var(--bg-card)

	// Pasar el mouse dice "esto se agarra": un anillo del color primario (no una sombra)
	&:hover .dpdf-caja__tarjeta
		box-shadow: 0 0 0 1px var(--color-primary)

	.dpdf-caja__cabecera
		display: flex
		align-items: center
		flex-wrap: nowrap
		gap: 4px
		min-width: 0

	.dpdf-caja__agarre
		flex: 0 0 auto
		color: var(--color-text-secondary)
		font-size: 0.78rem

	.dpdf-caja__relleno
		flex: 1 1 auto

	// El título en el lugar: se imprime en negrita gris, así que se escribe en negrita gris
	.dpdf-caja__titulo
		flex: 1 1 auto
		min-width: 0
		height: auto
		padding: 1px 4px
		border: 1px solid transparent
		border-radius: 4px
		background: transparent
		color: var(--color-text-secondary)
		font-family: Arial, Helvetica, sans-serif
		font-weight: 700
		line-height: 1.3
		cursor: text
		transition: border-color .15s ease, background .15s ease

		&::placeholder
			color: var(--color-text-secondary)
			font-weight: 400
			font-style: italic
			opacity: .75

		&:hover
			border-color: var(--color-border)

		&:focus
			outline: none
			border-color: var(--color-primary)
			background: var(--bg-card)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

	.dpdf-caja__estilos
		display: inline-flex
		align-items: center
		gap: 1px
		flex: 0 0 auto

	// Botones redondos chiquitos: estilos, − / + y la ✕
	.dpdf-caja__boton
		+dpdf-boton-redondo

	.dpdf-caja__boton--activo
		background: var(--bg-nav-hover)
		color: var(--color-primary)

	.dpdf-caja__boton--quitar:hover:not(:disabled)
		background: var(--btn-peligro-fondo)
		color: var(--btn-peligro-texto)

	// El cuerpo: la lista de campos. min-height para que una caja vacía siga siendo zona de soltar
	.dpdf-caja__cuerpo
		position: relative
		flex: 1 1 auto
		min-width: 0

	.dpdf-caja__campos
		position: relative
		z-index: 1
		display: flex
		flex-direction: column
		gap: 1px
		min-height: 34px
		padding: 2px 0

	.dpdf-caja__vacia
		position: absolute
		top: 0
		left: 0
		right: 0
		bottom: 0
		z-index: 0
		display: flex
		align-items: center
		justify-content: center
		gap: 6px
		padding: 4px 6px
		border: 1.5px dashed var(--color-border)
		border-radius: 6px
		color: var(--color-text-secondary)
		font-size: 0.74rem
		text-align: center
		pointer-events: none

	// El pie: el ancho a la derecha
	.dpdf-caja__pie
		display: flex
		justify-content: flex-end
		min-width: 0

	// El ancho − N/12 +: − y + se ven al pasar el mouse, al enfocar algo de la caja o con la caja
	// seleccionada
	+dpdf-ancho('dpdf-caja', 'dpdf-caja--seleccionada')

	// Manijas de los dos bordes
	+dpdf-manijas('dpdf-caja')

	// Seleccionada: anillo primario por fuera (el borde de adentro es el del estilo de la caja)
	&.dpdf-caja--seleccionada .dpdf-caja__tarjeta
		box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)

	// Mientras se tira: anillo suave y manijas firmes
	&.dpdf-caja--redimensionando
		.dpdf-caja__tarjeta
			box-shadow: 0 0 0 2px var(--color-primary), 0 0 0 5px var(--metodo-pago-focus-ring)
			cursor: ew-resize

		.dpdf-caja__manija::before
			opacity: 1

	// La insignia grande "N/12" del medio de la caja mientras se tira
	+dpdf-insignia('dpdf-caja')

	// Caja angosta (3 columnas o menos): menos aire
	&.dpdf-caja--angosta .dpdf-caja__tarjeta
		padding: 5px 5px 5px

	// Una sola columna: sin título en el lugar (queda en el panel) y el ancho en vertical
	&.dpdf-caja--una-columna
		.dpdf-caja__cabecera
			flex-direction: column-reverse
			gap: 2px

		.dpdf-caja__pie
			justify-content: center

		.dpdf-caja__ancho
			flex-direction: column-reverse

		.dpdf-caja__cols
			min-width: 0
			padding: 1px 3px

	// Recién agregada: un destello del borde para encontrarla
	&.dpdf-caja--destacada .dpdf-caja__tarjeta
		animation: dpdf-destello 1.4s ease

// Pantallas táctiles: manijas y − / + siempre a la vista, y manijas más anchas para el dedo
@media (hover: none)
	.dpdf-caja
		+dpdf-ancho-tactil('dpdf-caja')
</style>
