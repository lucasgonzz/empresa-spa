<template>
	<!--
		Un campo de Vender adentro de una etapa del editor. Este <div> es el item que mueve
		vuedraggable (clase editor-diseno-arrastrable) y el que ocupa sus N/12 columnas en la grilla:
		el ancho lo pone la lista de la etapa leyendo `data-cols` (EtapaDelEditor.vue).

		Toda la tarjeta se agarra para arrastrar, MENOS las manijas de ancho y los botones: esos
		llevan la clase editor-diseno-no-arrastra, que es el `filter` de Sortable.

		`data-key` y `data-obligatorio` los leen el editor (quien se esta arrastrando) y la bandeja
		(si tiene que rechazarlo).
	-->
	<div
	class="editor-elemento editor-diseno-arrastrable"
	:class="clases"
	:data-cols="item.cols"
	:data-key="item.key"
	:data-obligatorio="obligatorio ? 'si' : 'no'"
	role="group"
	:aria-label="etiqueta_accesible">

		<!-- Manija del borde izquierdo: tirando hacia afuera (a la izquierda) el campo se agranda -->
		<span
		v-if="!es_separador"
		key="manija-izquierda"
		class="editor-elemento__manija editor-elemento__manija--izquierda editor-diseno-no-arrastra"
		title="Tirá para cambiar el ancho"
		aria-hidden="true"
		@pointerdown="iniciar_redimension($event, 'izquierda')"
		@pointermove="mover_redimension"
		@pointerup="terminar_redimension"
		@pointercancel="terminar_redimension"
		@lostpointercapture="terminar_redimension"></span>

		<!-- Separador: una fila finita con su linea -->
		<div
		v-if="es_separador"
		class="editor-elemento__tarjeta editor-elemento__tarjeta--separador editor-diseno-caja">
			<i class="bi bi-grip-vertical editor-elemento__agarre"></i>
			<span class="editor-elemento__nombre editor-elemento__nombre--separador">Separador</span>
			<span class="editor-elemento__linea"></span>
			<button
			type="button"
			class="editor-elemento__boton editor-diseno-no-arrastra"
			title="Quitar este separador"
			aria-label="Quitar este separador"
			@click="$emit('sacar', item)">
				<i class="bi bi-x-lg"></i>
			</button>
		</div>

		<!-- Campo -->
		<div
		v-else
		class="editor-elemento__tarjeta editor-diseno-caja">

			<div class="editor-elemento__cabecera">
				<span
				class="editor-elemento__nombre"
				:title="nombre">{{ nombre }}</span>

				<!-- Ancho: − N/12 + (los botones se ven al pasar el mouse; en pantallas tactiles, siempre) -->
				<span class="editor-elemento__ancho">
					<button
					type="button"
					class="editor-elemento__boton editor-elemento__boton--ancho editor-diseno-no-arrastra"
					:disabled="item.cols <= 1"
					title="Achicar una columna"
					:aria-label="'Achicar ' + nombre + ' una columna'"
					@click="cambiar_cols(-1)">
						<i class="bi bi-dash-lg"></i>
					</button>
					<span
					class="editor-elemento__cols"
					:title="'Ocupa ' + item.cols + ' de las 12 columnas'">{{ item.cols }}/12</span>
					<button
					type="button"
					class="editor-elemento__boton editor-elemento__boton--ancho editor-diseno-no-arrastra"
					:disabled="item.cols >= 12"
					title="Agrandar una columna"
					:aria-label="'Agrandar ' + nombre + ' una columna'"
					@click="cambiar_cols(1)">
						<i class="bi bi-plus-lg"></i>
					</button>
				</span>

				<!--
					Obligatorio: candado en lugar de la ✕, con el motivo. Es enfocable para que el
					motivo tambien llegue por teclado y lector de pantalla; NO lleva la clase del
					filtro porque arrastrar un obligatorio si se puede (lo que no se puede es sacarlo).
				-->
				<span
				v-if="obligatorio"
				class="editor-elemento__candado"
				tabindex="0"
				role="img"
				:title="motivo_obligatorio"
				:aria-label="motivo_obligatorio">
					<i class="bi bi-lock-fill"></i>
				</span>
				<button
				v-else
				type="button"
				class="editor-elemento__boton editor-elemento__boton--sacar editor-diseno-no-arrastra"
				title="Sacar de Vender (va a la bandeja)"
				:aria-label="'Sacar ' + nombre + ' de Vender'"
				@click="$emit('sacar', item)">
					<i class="bi bi-x-lg"></i>
				</button>
			</div>

			<!-- A una sola columna no entra ningun dibujo: queda el nombre y el ancho -->
			<vista-previa-de-elemento
			v-if="item.cols > 1"
			:clave="item.key"></vista-previa-de-elemento>

			<p
			v-if="aparece_cuando"
			class="editor-elemento__aparece"
			:title="'Cuándo se ve en Vender: ' + aparece_cuando">
				<i class="bi bi-eye"></i>
				<span>{{ aparece_cuando }}</span>
			</p>
		</div>

		<!--
			Mientras se tira de un borde: el ancho en grande, para no tener que buscarlo. Las manijas y
			esta insignia llevan `key` para que Vue nunca reutilice el nodo de una manija para dibujar
			la insignia (perderia la captura del puntero en pleno tirón).
		-->
		<span
		v-if="redimensionando"
		key="insignia"
		class="editor-elemento__insignia"
		aria-hidden="true">{{ item.cols }}/12</span>

		<!-- Manija del borde derecho: tirando hacia afuera (a la derecha) el campo se agranda -->
		<span
		v-if="!es_separador"
		key="manija-derecha"
		class="editor-elemento__manija editor-elemento__manija--derecha editor-diseno-no-arrastra"
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
import VistaPreviaDeElemento from './VistaPreviaDeElemento'
import { KEY_SEPARADOR, elemento, acotar_cols } from '@/components/vender/layout/elementos'

/**
 * Tarjeta de un campo de Vender en el lienzo del editor (mision diseno-vender-configurable,
 * 28/9/2026): nombre, vista previa del control, ancho en columnas, "cuando aparece" y los controles
 * para cambiar el ancho y sacarlo.
 *
 * 🔴 `item` se muta EN EL LUGAR (item.cols), a proposito: es un objeto de las listas de trabajo del
 * editor, las mismas que vuedraggable muta por referencia (`:list`). Es el mismo patron que
 * RowList.vue del diseñador de encabezados, y hace que el editor vea el cambio sin cadena de eventos.
 *
 * El ancho se cambia de dos formas:
 * - Tirando de un borde (pointer events + setPointerCapture: los movimientos le siguen llegando a
 *   la manija aunque el puntero se salga de ella). El ancho salta de a una columna:
 *   cols = redondear(cols_inicial + Δx·signo / (anchoDeLaGrilla / 12)), acotado a 1..12. Borde
 *   derecho hacia la derecha agranda; borde izquierdo hacia la izquierda TAMBIEN agranda (signo -1).
 *   El orden de los campos no cambia: el campo crece hacia el lado en que fluye la fila.
 * - Con los botones − / +, que ademas son el camino por teclado.
 */
export default {
	name: 'ElementoDelEditor',
	components: {
		VistaPreviaDeElemento,
	},
	props: {
		/* Item de la lista de trabajo: {key, cols} o {key: 'separador', id, cols: 12} */
		item: {
			type: Object,
			required: true,
		},
		/* Si hay que resaltarlo un momento (recien agregado desde la bandeja) */
		destacado: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/* true mientras se tira de una de las dos manijas */
			redimensionando: false,
			/* 'izquierda' | 'derecha': de que borde se esta tirando */
			lado: null,
			/* Posicion X del puntero al empezar a tirar */
			x_inicial: 0,
			/* Ancho (en columnas) que tenia el campo al empezar a tirar */
			cols_inicial: 0,
			/* Ancho en px de UNA columna de la grilla, medido al empezar a tirar */
			ancho_de_columna: 0,
			/* Puntero que esta tirando (con dos dedos en una tablet solo cuenta el primero) */
			id_de_puntero: null,
		}
	},
	computed: {
		/**
		 * Si el item es un separador (linea a lo ancho, sin ancho editable).
		 *
		 * @returns {boolean}
		 */
		es_separador() {
			return this.item.key === KEY_SEPARADOR
		},
		/**
		 * Elemento del catalogo, o null (separador).
		 *
		 * @returns {Object|null}
		 */
		definicion() {
			return elemento(this.item.key)
		},
		/**
		 * Nombre que se muestra en la tarjeta.
		 *
		 * @returns {string}
		 */
		nombre() {
			if (this.es_separador) {
				return 'Separador'
			}
			return this.definicion ? this.definicion.nombre : this.item.key
		},
		/**
		 * Si el campo no se puede sacar del diseño (se mueve y se le cambia el ancho, nada mas).
		 *
		 * @returns {boolean}
		 */
		obligatorio() {
			return !!(this.definicion && this.definicion.obligatorio)
		},
		/**
		 * Texto del candado de un obligatorio.
		 *
		 * @returns {string}
		 */
		motivo_obligatorio() {
			return (this.definicion && this.definicion.motivo_obligatorio) || 'No se puede sacar este campo.'
		},
		/**
		 * Cuando se ve el campo en Vender, si no se ve siempre (null si se ve siempre).
		 *
		 * @returns {string|null}
		 */
		aparece_cuando() {
			return this.definicion ? this.definicion.aparece_cuando : null
		},
		/**
		 * Lo que lee un lector de pantalla al entrar a la tarjeta.
		 *
		 * @returns {string}
		 */
		etiqueta_accesible() {
			if (this.es_separador) {
				return 'Separador'
			}
			return this.nombre + ', ' + this.item.cols + ' de 12 columnas' + (this.obligatorio ? ', obligatorio' : '')
		},
		/**
		 * Clases de estado de la tarjeta.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'editor-elemento--separador': this.es_separador,
				'editor-elemento--obligatorio': this.obligatorio,
				'editor-elemento--redimensionando': this.redimensionando,
				'editor-elemento--angosto': !this.es_separador && this.item.cols <= 2,
				'editor-elemento--destacado': this.destacado,
			}
		},
	},
	beforeDestroy() {
		/* Si la tarjeta se destruye a mitad de un tirón (p. ej. se cerro el modal), avisar igual */
		if (this.redimensionando) {
			this.redimensionando = false
			this.$emit('redimension', false)
		}
	},
	methods: {
		/**
		 * Cambia el ancho una columna con los botones − / +, acotado a 1..12.
		 *
		 * @param {number} paso -1 o 1
		 * @returns {void}
		 */
		cambiar_cols(paso) {
			this.item.cols = acotar_cols(this.item.cols + paso, this.item.cols)
		},
		/**
		 * Empieza a tirar de un borde: mide la grilla, toma el puntero y avisa a la etapa (que
		 * resalta las guias de las 12 columnas).
		 *
		 * El ancho de UNA columna sale del ancho de la lista de la etapa (el padre de esta tarjeta):
		 * los items ocupan calc(100% * N / 12) de esa lista, asi que una columna es su ancho / 12.
		 *
		 * @param {PointerEvent} evento pointerdown sobre la manija
		 * @param {string} lado 'izquierda' | 'derecha'
		 * @returns {void}
		 */
		iniciar_redimension(evento, lado) {
			/* Solo el boton principal del mouse (o un dedo, o el lapiz) */
			if (evento.button !== undefined && evento.button !== 0) {
				return
			}
			if (this.redimensionando) {
				return
			}

			let lista = this.$el.parentElement
			let ancho_de_la_lista = lista ? lista.getBoundingClientRect().width : 0

			if (!ancho_de_la_lista) {
				return
			}

			/* Sin esto el navegador empieza a seleccionar texto (mouse) o a scrollear (tactil) */
			evento.preventDefault()

			this.lado = lado
			this.x_inicial = evento.clientX
			this.cols_inicial = this.item.cols
			this.ancho_de_columna = ancho_de_la_lista / 12
			this.id_de_puntero = evento.pointerId
			this.redimensionando = true

			/* Con la captura, los pointermove siguen llegando a la manija aunque el puntero salga de ella */
			try {
				evento.currentTarget.setPointerCapture(evento.pointerId)
			} catch (e) {
				console.log('diseño de vender: no se pudo capturar el puntero', e)
			}

			this.$emit('redimension', true)
		},
		/**
		 * Recalcula el ancho mientras se tira: salta de a una columna, nunca por pixeles.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		mover_redimension(evento) {
			if (!this.redimensionando || evento.pointerId !== this.id_de_puntero) {
				return
			}

			/* Hacia afuera siempre agranda: a la derecha en el borde derecho, a la izquierda en el izquierdo */
			let signo = this.lado === 'derecha' ? 1 : -1
			let desplazamiento = (evento.clientX - this.x_inicial) * signo
			let cols = acotar_cols(Math.round(this.cols_inicial + desplazamiento / this.ancho_de_columna), this.cols_inicial)

			if (cols !== this.item.cols) {
				this.item.cols = cols
			}
		},
		/**
		 * Termina de tirar (se solto, se cancelo el gesto o se perdio la captura). Puede llegar dos
		 * veces seguidas (pointerup y despues lostpointercapture): la segunda no hace nada.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		terminar_redimension(evento) {
			if (!this.redimensionando) {
				return
			}
			if (evento && evento.pointerId !== undefined && evento.pointerId !== this.id_de_puntero) {
				return
			}

			this.redimensionando = false

			try {
				if (evento && evento.currentTarget && evento.currentTarget.hasPointerCapture && evento.currentTarget.hasPointerCapture(this.id_de_puntero)) {
					evento.currentTarget.releasePointerCapture(this.id_de_puntero)
				}
			} catch (e) {
				console.log('diseño de vender: no se pudo soltar el puntero', e)
			}

			this.id_de_puntero = null
			this.$emit('redimension', false)
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped` a proposito: mientras se arrastra, Sortable dibuja un clon de esta tarjeta colgado
// de <body> (fallbackOnBody), fuera del modal, y el clon tiene que verse igual que la tarjeta. Por
// eso ninguna regla depende de un ancestro: todo cuelga de las clases editor-elemento*.
//
// El ancho (flex-basis N/12), el gutter y el margen de abajo los pone la lista de la etapa
// (EtapaDelEditor.vue), que es la que conoce la grilla. Colores solo por token.
.editor-elemento
	position: relative
	display: flex
	min-width: 0

	.editor-elemento__tarjeta
		display: flex
		flex-direction: column
		gap: 7px
		flex: 1 1 auto
		min-width: 0
		padding: 8px 10px 10px
		border: 1px solid var(--color-border)
		border-radius: 10px
		background: var(--bg-card)
		cursor: grab
		user-select: none
		transition: border-color .15s ease, box-shadow .15s ease, background .15s ease

	// Pasar el mouse dice "esto se agarra": borde del color primario y aparecen las manijas
	&:hover .editor-elemento__tarjeta
		border-color: var(--color-primary)

	.editor-elemento__cabecera
		display: flex
		align-items: center
		// Si no entra todo en un renglon (campo angosto), el ancho y la ✕ bajan al segundo
		flex-wrap: wrap
		gap: 4px 6px
		min-width: 0

	.editor-elemento__nombre
		flex: 1 1 auto
		min-width: 0
		font-size: 0.8rem
		font-weight: 600
		line-height: 1.3
		color: var(--color-text-primary)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.editor-elemento__ancho
		display: inline-flex
		align-items: center
		gap: 2px
		flex: 0 0 auto

	.editor-elemento__cols
		min-width: 38px
		padding: 1px 6px
		border-radius: 999px
		background: var(--bg-section)
		color: var(--color-text-secondary)
		font-size: 0.7rem
		font-weight: 600
		text-align: center
		font-variant-numeric: tabular-nums

	// Botones redondos chiquitos: − / + y la ✕
	.editor-elemento__boton
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
		line-height: 1
		cursor: pointer
		transition: background .15s ease, color .15s ease, opacity .15s ease

		&:hover:not(:disabled)
			background: var(--bg-hover)
			color: var(--color-text-primary)

		&:disabled
			opacity: .35
			cursor: default

		&:focus
			outline: none

		&:focus-visible
			box-shadow: 0 0 0 2px var(--color-primary)

	// − y + ocupan su lugar siempre (el renglon no salta al pasar el mouse), pero solo se ven al
	// pasar el mouse o al enfocar algo de la tarjeta con el teclado. Van con las dos clases para
	// ganarle a `.editor-elemento__boton:disabled` de arriba: sin eso, el − deshabilitado (campo de
	// una columna) quedaria a la vista mientras el + esta oculto.
	.editor-elemento__boton.editor-elemento__boton--ancho
		opacity: 0

	&:hover .editor-elemento__boton.editor-elemento__boton--ancho,
	&:focus-within .editor-elemento__boton.editor-elemento__boton--ancho
		opacity: 1

		&:disabled
			opacity: .35

	.editor-elemento__boton--sacar:hover:not(:disabled)
		background: var(--btn-peligro-fondo)
		color: var(--btn-peligro-texto)

	.editor-elemento__candado
		display: inline-flex
		align-items: center
		justify-content: center
		flex: 0 0 22px
		height: 22px
		border-radius: 50%
		color: var(--color-text-secondary)
		font-size: 0.72rem
		cursor: help

		&:focus
			outline: none

		&:focus-visible
			box-shadow: 0 0 0 2px var(--color-primary)

	// "Cuando aparece": gris y en dos renglones como maximo (el texto entero va en el title)
	.editor-elemento__aparece
		display: flex
		align-items: flex-start
		gap: 5px
		margin: 0
		color: var(--color-text-secondary)
		font-size: 0.7rem
		line-height: 1.3

		i
			flex: 0 0 auto
			margin-top: 1px

		span
			display: -webkit-box
			-webkit-line-clamp: 2
			-webkit-box-orient: vertical
			overflow: hidden

	// Manijas de los bordes. Van sobre el gutter, centradas en el borde de la tarjeta: el item
	// tiene 8px de padding a cada lado, asi que el borde cae a 8px y la manija de 12px va a 2px.
	.editor-elemento__manija
		position: absolute
		top: 0
		bottom: 0
		z-index: 2
		display: flex
		align-items: center
		justify-content: center
		width: 12px
		cursor: ew-resize
		// Sin esto, en una pantalla tactil tirar de la manija scrollea la pagina
		touch-action: none

		// La marquita visible: una pildora vertical
		&::before
			content: ''
			width: 4px
			height: 28px
			max-height: 70%
			border-radius: 999px
			background: var(--color-primary)
			opacity: 0
			transition: opacity .15s ease

	.editor-elemento__manija--izquierda
		left: 2px

	.editor-elemento__manija--derecha
		right: 2px

	&:hover .editor-elemento__manija::before
		opacity: .5

	.editor-elemento__manija:hover::before
		opacity: 1

	// Mientras se tira: borde primario con anillo suave, manijas firmes
	&.editor-elemento--redimensionando
		.editor-elemento__tarjeta
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
			cursor: ew-resize

		.editor-elemento__manija::before
			opacity: 1

	// La insignia grande "N/12" del medio de la tarjeta mientras se tira. El texto va en --bg-card:
	// blanco sobre el azul en claro, gris oscuro sobre el azul claro en oscuro.
	.editor-elemento__insignia
		position: absolute
		top: 50%
		left: 50%
		z-index: 3
		transform: translate(-50%, -50%)
		padding: 4px 12px
		border-radius: 999px
		background: var(--color-primary)
		color: var(--bg-card)
		font-size: 0.85rem
		font-weight: 700
		white-space: nowrap
		font-variant-numeric: tabular-nums
		box-shadow: 0 4px 12px var(--shadow-color)
		pointer-events: none

	// Obligatorio: nada especial en la tarjeta; el candado ya lo dice
	// Separador: una fila finita, sin vista previa ni ancho
	.editor-elemento__tarjeta--separador
		flex-direction: row
		align-items: center
		gap: 8px
		padding: 5px 6px 5px 8px
		border-style: dashed

	.editor-elemento__agarre
		flex: 0 0 auto
		color: var(--color-text-secondary)
		font-size: 0.8rem

	.editor-elemento__nombre--separador
		flex: 0 0 auto
		font-weight: 500
		color: var(--color-text-secondary)

	.editor-elemento__linea
		flex: 1 1 auto
		height: 0
		border-top: 1px solid var(--color-border)

	// Campo angosto (1 o 2 columnas): menos aire para que entre lo importante
	&.editor-elemento--angosto
		.editor-elemento__tarjeta
			padding: 7px 7px 8px

		.editor-elemento__cols
			min-width: 34px
			padding: 1px 4px

	// Recien agregado desde la bandeja: un destello del borde para encontrarlo
	&.editor-elemento--destacado .editor-elemento__tarjeta
		animation: editor-elemento-destello 1.4s ease

@keyframes editor-elemento-destello
	0%
		box-shadow: 0 0 0 0 var(--metodo-pago-focus-ring)
		border-color: var(--color-primary)
	30%
		box-shadow: 0 0 0 6px var(--metodo-pago-focus-ring)
		border-color: var(--color-primary)
	100%
		box-shadow: 0 0 0 0 var(--metodo-pago-focus-ring)

// Pantallas tactiles (sin mouse que "pase por encima"): manijas y − / + siempre a la vista, y
// manijas mas anchas para el dedo (16px: justo el gutter entre dos tarjetas).
@media (hover: none)
	.editor-elemento
		.editor-elemento__boton.editor-elemento__boton--ancho
			opacity: 1

			&:disabled
				opacity: .35

		.editor-elemento__manija
			width: 16px

			&::before
				opacity: .45

		.editor-elemento__manija--izquierda
			left: 0

		.editor-elemento__manija--derecha
			right: 0
</style>
