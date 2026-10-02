<template>
	<!--
		Un campo adentro de una caja del diseñador de PDF. Este <div> es el ítem que mueve
		vuedraggable (clase dpdf-item-de-caja, la del `draggable` de la lista de campos de la caja) y
		el que se selecciona con un clic, o con Enter / Espacio desde el teclado.

		La vista previa imita el renglón del PDF (plan §4.4): "Rótulo: ejemplo" con el tamaño
		escalado a la hoja, la negrita, la cursiva y la alineación del campo. La ✕ lleva la clase
		dpdf-no-arrastra (el `filter` de Sortable): apretarla no arranca un arrastre.
	-->
	<div
	class="dpdf-campo dpdf-item-de-caja"
	:class="clases"
	:data-key="campo.key"
	:data-ui="campo.ui_id"
	data-tipo="campo"
	:data-testid="id_de_prueba"
	tabindex="0"
	role="group"
	:aria-label="etiqueta_accesible"
	:title="titulo"
	@click.stop="seleccionar"
	@keydown.enter.self.prevent="seleccionar"
	@keydown.space.self.prevent="seleccionar">

		<i
		class="bi bi-grip-vertical dpdf-campo__agarre"
		aria-hidden="true"></i>

		<!-- Solo ilustración: el nombre del campo ya lo lee el aria-label del renglón -->
		<div
		class="dpdf-campo__vista"
		:class="'dpdf-campo__vista--' + (estilo.alineacion || 'izquierda')"
		:style="estilo_de_la_vista"
		aria-hidden="true">
			<span
			v-for="(renglon, indice) in renglones"
			:key="indice"
			class="dpdf-campo__renglon">
				<span
				v-if="indice === 0 && rotulo"
				class="dpdf-campo__rotulo">{{ rotulo }}: </span>
				<span
				class="dpdf-campo__valor"
				:class="clase_del_valor">{{ renglon }}</span>
			</span>
			<!--
				Texto libre largo para el ancho de la caja: un aviso suave (no se imprime y no bloquea).
				Acá va corto; el completo, en el title y en el panel de propiedades.
			-->
			<span
			v-if="texto_largo"
			class="dpdf-campo__aviso"
			:title="aviso_de_texto_largo">
				<i class="bi bi-exclamation-triangle"></i>
				Puede no entrar en la hoja
			</span>
		</div>

		<button
		type="button"
		class="dpdf-campo__quitar dpdf-no-arrastra"
		title="Sacar de la caja"
		:aria-label="'Sacar ' + nombre + ' de la caja'"
		@click.stop="disenador.quitar_campo(campo)">
			<i class="bi bi-x-lg"></i>
		</button>
	</div>
</template>
<script>
import { KEY_TEXTO_LIBRE, estilo_efectivo, etiqueta_efectiva, texto_libre_largo, aviso_de_texto_largo } from './estado_del_disenador'

/* Milímetros que mide un punto tipográfico (1 pt = 1/72 de pulgada = 0,3528 mm) */
const MM_POR_PUNTO = 0.3528

/* Alto de línea del PDF por cada punto de letra (plan §4.4: 9 pt → 4,5 mm) */
const ALTO_DE_LINEA_MM_POR_PUNTO = 0.5

/* Letra mínima de la vista previa (px): por debajo, la de 6 pt deja de leerse en pantalla */
const LETRA_MINIMA_PX = 7

/* Renglones que muestra como máximo un campo de tipo lista (plan §8.3) */
const RENGLONES_DE_UNA_LISTA = 2

/* Renglones que muestra como máximo el texto libre en la caja (el resto, en el panel) */
const RENGLONES_DEL_TEXTO_LIBRE = 3

/**
 * Renglón de un campo en una caja del diseñador de PDF (misión diseno-pdf-configurable,
 * 1/10/2026).
 *
 * Presentacional: lo que muestra sale del campo (`campo`, mutado en el lugar por el panel de
 * propiedades) y de su definición en el catálogo (nombre, rótulo, ejemplo y estilo por defecto).
 * Las acciones (seleccionar, sacar) las resuelve el diseñador, que llega por `inject`.
 */
export default {
	name: 'CampoDeCaja',
	inject: ['disenador'],
	props: {
		/* Campo de trabajo: {ui_id, key, etiqueta, tamano, negrita, cursiva, alineacion, (id, texto)} */
		campo: {
			type: Object,
			required: true,
		},
		/* Columnas de la caja donde está (para avisar un texto libre largo para ese ancho) */
		cols_de_la_caja: {
			type: Number,
			default: 12,
		},
	},
	computed: {
		/**
		 * El data-testid del renglón: "campo-<key>-disenador-pdf", y el texto libre (que puede ir
		 * varias veces) con su id: "campo-texto_libre-<id>-disenador-pdf". Lo dinámico va en el medio
		 * y el final es fijo, así ningún testid es prefijo de otro (venta_fecha / venta_fecha_entrega;
		 * regla de e2e/chequear-prefijos-de-testid.js).
		 *
		 * @returns {string}
		 */
		id_de_prueba() {
			if (this.campo.key === KEY_TEXTO_LIBRE) {
				return 'campo-' + KEY_TEXTO_LIBRE + '-' + this.campo.id + '-disenador-pdf'
			}
			return 'campo-' + this.campo.key + '-disenador-pdf'
		},
		/**
		 * Si es un texto libre largo para el ancho de su caja: puede no entrar en la hoja (el PDF no
		 * parte una caja entre hojas). Aviso suave, no bloquea.
		 *
		 * @returns {boolean}
		 */
		texto_largo() {
			return texto_libre_largo(this.campo, this.cols_de_la_caja)
		},
		/**
		 * El aviso completo del texto largo (para el title).
		 *
		 * @returns {string}
		 */
		aviso_de_texto_largo() {
			return aviso_de_texto_largo(this.cols_de_la_caja)
		},
		/**
		 * Definición del catálogo, o null si la key ya no existe (un campo que se retiró).
		 *
		 * @returns {Object|null}
		 */
		definicion() {
			return this.disenador.definiciones[this.campo.key] || null
		},
		/**
		 * Si es el texto que escribe el usuario.
		 *
		 * @returns {boolean}
		 */
		es_texto_libre() {
			return this.campo.key === KEY_TEXTO_LIBRE
		},
		/**
		 * Nombre del campo en la bandeja (o su key si ya no existe).
		 *
		 * @returns {string}
		 */
		nombre() {
			return this.definicion ? this.definicion.nombre : this.campo.key
		},
		/**
		 * Estilo con que se imprime (el del campo o, donde es null, el del catálogo).
		 *
		 * @returns {Object}
		 */
		estilo() {
			return estilo_efectivo(this.campo, this.definicion)
		},
		/**
		 * Rótulo que va delante del valor ('' = sin rótulo).
		 *
		 * @returns {string}
		 */
		rotulo() {
			if (!this.definicion && !this.es_texto_libre) {
				return ''
			}
			return etiqueta_efectiva(this.campo, this.definicion)
		},
		/**
		 * Los renglones de la vista previa: el ejemplo del catálogo (una lista muestra hasta dos),
		 * el texto escrito (o la invitación a escribirlo) o el aviso de un campo que ya no existe.
		 *
		 * @returns {Array<string>}
		 */
		renglones() {
			if (this.es_texto_libre) {
				let texto = String(this.campo.texto || '').replace(/\s+$/, '')
				if (!texto) {
					return ['Escribí el texto…']
				}
				let partes = texto.split('\n')
				if (partes.length > RENGLONES_DEL_TEXTO_LIBRE) {
					partes = partes.slice(0, RENGLONES_DEL_TEXTO_LIBRE)
					partes[RENGLONES_DEL_TEXTO_LIBRE - 1] += ' …'
				}
				return partes
			}

			if (!this.definicion) {
				return ['Este campo ya no existe (' + this.campo.key + '): no se imprime']
			}

			let ejemplo = this.definicion.ejemplo

			if (Array.isArray(ejemplo)) {
				let renglones = []
				ejemplo.forEach(function (valor, indice) {
					if (indice < RENGLONES_DE_UNA_LISTA) {
						renglones.push(String(valor))
					}
				})
				return renglones.length ? renglones : ['']
			}

			return [ejemplo === null || typeof ejemplo == 'undefined' ? '' : String(ejemplo)]
		},
		/**
		 * Clases del valor: el texto libre sin escribir y el campo que ya no existe van apagados.
		 *
		 * @returns {Object}
		 */
		clase_del_valor() {
			return {
				'dpdf-campo__valor--pendiente': this.es_texto_libre && !String(this.campo.texto || '').trim(),
				'dpdf-campo__valor--perdido': !this.es_texto_libre && !this.definicion,
			}
		},
		/**
		 * Letra, alto de línea y estilos de la vista previa, escalados a la hoja (escala = px por
		 * mm de la hoja dibujada, la mide HojaDelDisenador).
		 *
		 * Alineación izquierda: el rótulo en negrita y el valor normal, salvo que el campo vaya en
		 * negrita (plan §4.4); centro y derecha: el renglón entero con el estilo del campo. Eso lo
		 * resuelven las clases dpdf-campo__vista--* del <style>.
		 *
		 * @returns {Object}
		 */
		estilo_de_la_vista() {
			let escala = this.disenador.escala
			let tamano = this.estilo.tamano || 9
			let letra = Math.max(LETRA_MINIMA_PX, tamano * MM_POR_PUNTO * escala)
			let linea = Math.max(letra * 1.1, tamano * ALTO_DE_LINEA_MM_POR_PUNTO * escala)

			return {
				fontSize: letra.toFixed(1) + 'px',
				lineHeight: linea.toFixed(1) + 'px',
				fontWeight: this.estilo.negrita ? 700 : 400,
				fontStyle: this.estilo.cursiva ? 'italic' : 'normal',
			}
		},
		/**
		 * Si este campo es el seleccionado.
		 *
		 * @returns {boolean}
		 */
		seleccionado() {
			let seleccion = this.disenador.seleccion_actual
			return !!(seleccion && seleccion.item === this.campo)
		},
		/**
		 * El title del renglón: el nombre y cuándo aparece en el PDF.
		 *
		 * @returns {string}
		 */
		titulo() {
			let aparece = this.definicion && this.definicion.aparece_cuando
			return this.nombre + (aparece ? '. ' + aparece : '')
		},
		/**
		 * Lo que lee un lector de pantalla al llegar al renglón.
		 *
		 * @returns {string}
		 */
		etiqueta_accesible() {
			let aviso = this.texto_largo ? '. ' + this.aviso_de_texto_largo : ''
			return 'Campo ' + this.nombre + (this.seleccionado ? ', seleccionado' : '') + aviso + '. Enter para editarlo'
		},
		/**
		 * Clases de estado del renglón.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'dpdf-campo--seleccionado': this.seleccionado,
				'dpdf-campo--destacado': this.disenador.destacado === this.campo.ui_id,
				'dpdf-campo--negrita': this.estilo.negrita,
			}
		},
	},
	methods: {
		/**
		 * Selecciona el campo (el panel de propiedades pasa a mostrarlo).
		 *
		 * @returns {void}
		 */
		seleccionar() {
			this.disenador.seleccionar('campo', this.campo)
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped` a propósito: mientras se arrastra, Sortable dibuja un clon del renglón colgado de
// <body> (fallbackOnBody), fuera del modal, y el clon tiene que verse igual. Todo cuelga de las
// clases dpdf-campo*. Colores solo por token.
.dpdf-campo
	position: relative
	display: flex
	align-items: flex-start
	gap: 4px
	min-width: 0
	margin: 0 -4px
	padding: 1px 2px 1px 0
	border-radius: 4px
	cursor: grab
	user-select: none
	transition: background .15s ease, box-shadow .15s ease

	&:hover
		background: var(--bg-hover)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 2px var(--color-primary)

	// El agarre y la ✕ ocupan su lugar siempre (el renglón no salta), pero se ven al pasar el mouse,
	// al enfocar el renglón o con el campo seleccionado
	.dpdf-campo__agarre
		flex: 0 0 auto
		margin-top: 2px
		color: var(--color-text-secondary)
		font-size: 0.72rem
		opacity: 0
		transition: opacity .15s ease

	.dpdf-campo__quitar
		display: inline-flex
		align-items: center
		justify-content: center
		flex: 0 0 20px
		width: 20px
		height: 20px
		padding: 0
		border: 0
		border-radius: 50%
		background: transparent
		color: var(--color-text-secondary)
		font-size: 0.66rem
		line-height: 1
		cursor: pointer
		opacity: 0
		transition: opacity .15s ease, background .15s ease, color .15s ease

		&:hover
			background: var(--btn-peligro-fondo)
			color: var(--btn-peligro-texto)

		&:focus
			outline: none

		&:focus-visible
			opacity: 1
			box-shadow: 0 0 0 2px var(--color-primary)

	&:hover,
	&:focus-within,
	&.dpdf-campo--seleccionado
		.dpdf-campo__agarre,
		.dpdf-campo__quitar
			opacity: 1

	// La vista previa: la letra del PDF (Arial) y el color del texto de la hoja
	.dpdf-campo__vista
		flex: 1 1 auto
		min-width: 0
		color: var(--color-text-primary)
		font-family: Arial, Helvetica, sans-serif
		overflow-wrap: anywhere

	.dpdf-campo__renglon
		display: block

	// Alineación izquierda: rótulo en negrita, valor normal (salvo que el campo vaya en negrita)
	.dpdf-campo__vista--izquierda
		text-align: left

		.dpdf-campo__rotulo
			font-weight: 700

		.dpdf-campo__valor
			font-weight: 400

	&.dpdf-campo--negrita .dpdf-campo__vista--izquierda .dpdf-campo__valor
		font-weight: 700

	// Centro y derecha: el renglón entero con el estilo del campo (lo pone el style del div)
	.dpdf-campo__vista--centro
		text-align: center

	.dpdf-campo__vista--derecha
		text-align: right

	.dpdf-campo__valor--pendiente,
	.dpdf-campo__valor--perdido
		color: var(--color-text-secondary)
		font-style: italic

	.dpdf-campo__valor--perdido
		color: var(--color-text-danger-strong, var(--danger))

	// El aviso del texto libre largo: chico, en el color de advertencia y con la letra de la
	// interfaz (no es parte de lo que se imprime)
	.dpdf-campo__aviso
		display: flex
		align-items: center
		gap: 4px
		margin-top: 2px
		color: var(--color-text-warning-strong, var(--orange))
		font-family: var(--font-family-sans-serif)
		font-size: 0.7rem
		font-weight: 600
		font-style: normal
		line-height: 1.3
		text-align: left

	// Seleccionado: el anillo primario y un fondo suave
	&.dpdf-campo--seleccionado
		background: var(--bg-nav-hover)
		box-shadow: 0 0 0 2px var(--color-primary)

	// Recién agregado: un destello para encontrarlo
	&.dpdf-campo--destacado
		animation: dpdf-destello 1.4s ease

// Pantallas táctiles (sin mouse que "pase por encima"): el agarre y la ✕ siempre a la vista
@media (hover: none)
	.dpdf-campo
		.dpdf-campo__agarre,
		.dpdf-campo__quitar
			opacity: 1
</style>
