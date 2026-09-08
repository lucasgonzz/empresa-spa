<template>
	<b-popover
	v-if="control_activo"
	:key="control_activo.testid"
	:target="control_activo.el"
	:show="visible"
	triggers=""
	placement="bottom"
	boundary="window"
	custom-class="descripcion-de-control-popover">
		<div
		class="descripcion-de-control-popover__inner"
		@mouseenter="cancelar_ocultar()"
		@mouseleave="pedir_ocultar()">

			<div class="descripcion-de-control-popover__header">
				{{ control_activo.descripcion.titulo }}
			</div>

			<div class="descripcion-de-control-popover__body">

				<p v-if="control_activo.descripcion.que_hace">
					{{ control_activo.descripcion.que_hace }}
				</p>

				<div
				v-if="repercute.length"
				class="descripcion-de-control-popover__seccion">
					<div class="descripcion-de-control-popover__subtitulo">
						En qué repercute
					</div>
					<ul>
						<li
						v-for="(efecto, i) in repercute"
						:key="i">
							{{ efecto }}
						</li>
					</ul>
				</div>

				<div
				v-if="control_activo.descripcion.requiere"
				class="descripcion-de-control-popover__nota">
					{{ control_activo.descripcion.requiere }}
				</div>

			</div>
		</div>
	</b-popover>
</template>
<script>
import { descripcion_de } from '@/descripciones'

/*
	Cuánto hay que dejar el mouse quieto encima de un control para que aparezca la
	descripción. Dos segundos es una decisión de Lucas del 1/9/2026: con menos, el
	popover salta mientras uno recorre la pantalla y molesta. Las propiedades del
	modelo usan 1 segundo, pero ahí el hover es sobre el label de un formulario que
	uno está leyendo; acá es sobre cualquier control del sistema, y se cruzan muchos
	sin querer mirarlos.
*/
const DEMORA_PARA_MOSTRAR = 2000

/*
	Margen de gracia antes de cerrar. Igual que en ModelForm: cruzar el espacio entre
	el control y el popover dispara un mouseleave, y sin este margen el popover se
	cerraría justo cuando el usuario va a leerlo.
*/
const DEMORA_PARA_OCULTAR = 250

export default {
	name: 'DescripcionDeControl',
	data() {
		return {
			/*
				El control que tiene la descripción abierta (o a punto de abrirse):
				{ el: HTMLElement, testid: String, descripcion: Object }.
				Es null cuando no hay ninguno.
			*/
			control_activo: null,
			visible: false,
		}
	},
	computed: {
		repercute() {
			if (!this.control_activo || !this.control_activo.descripcion.repercute) {
				return []
			}
			return this.control_activo.descripcion.repercute
		},
	},
	mounted() {
		/*
			🔴 Un solo juego de listeners delegados en document, no uno por control.
			Es lo que permite documentar un botón SIN tocar el componente que lo
			contiene: alcanza con agregar la entrada al diccionario. Con mil componentes
			en src/, la alternativa --cablear cada uno-- no se termina nunca.

			mouseover/mouseout (no mouseenter/mouseleave) porque son los que burbujean,
			que es justamente lo que hace posible la delegación.
		*/
		document.addEventListener('mouseover', this.al_entrar)
		document.addEventListener('mouseout', this.al_salir)
		/* Si el usuario actúa o mueve la pantalla, se cierra sin esperar el margen. */
		document.addEventListener('click', this.ocultar_ya, true)
		document.addEventListener('scroll', this.ocultar_ya, true)
		document.addEventListener('keydown', this.al_teclear)
	},
	beforeDestroy() {
		document.removeEventListener('mouseover', this.al_entrar)
		document.removeEventListener('mouseout', this.al_salir)
		document.removeEventListener('click', this.ocultar_ya, true)
		document.removeEventListener('scroll', this.ocultar_ya, true)
		document.removeEventListener('keydown', this.al_teclear)
		this.cancelar_mostrar()
		this.cancelar_ocultar()
	},
	methods: {
		/**
		 * Busca, desde el elemento donde entró el mouse, el ancestro más cercano que
		 * tenga data-testid. Devuelve null si no hay ninguno o si el testid no está
		 * documentado todavía --que es el caso de la enorme mayoría de los controles--.
		 *
		 * @param {EventTarget} target Elemento donde ocurrió el evento.
		 * @returns {Object|null} { el, testid, descripcion } o null.
		 */
		control_documentado(target) {
			if (!target || typeof target.closest != 'function') {
				return null
			}
			let el = target.closest('[data-testid]')
			if (!el) {
				return null
			}
			let testid = el.getAttribute('data-testid')
			let descripcion = descripcion_de(testid)
			if (!descripcion) {
				return null
			}
			return { el: el, testid: testid, descripcion: descripcion }
		},
		al_entrar(event) {
			let control = this.control_documentado(event.target)
			if (!control) {
				return
			}
			this.cancelar_ocultar()
			/* Ya está abierto sobre este mismo control: no se reinicia la cuenta. */
			if (this.control_activo && this.control_activo.el === control.el) {
				return
			}
			this.cancelar_mostrar()
			this._timer_mostrar = setTimeout(() => {
				/*
					Antes de mostrar se verifica que el control siga en el documento. Entre
					que arrancó la cuenta y que se cumplen los 2 segundos, la fila pudo
					haberse re-renderizado --pasa seguido en los listados-- y el elemento
					quedaría huérfano, con el popover flotando en una posición sin sentido.
				*/
				if (!document.body.contains(control.el)) {
					return
				}
				this.control_activo = control
				this.visible = true
			}, DEMORA_PARA_MOSTRAR)
		},
		al_salir(event) {
			let control = this.control_documentado(event.target)
			if (!control) {
				return
			}
			this.cancelar_mostrar()
			this.pedir_ocultar()
		},
		al_teclear() {
			/*
				Cualquier tecla cierra, no sólo Escape: si está tipeando no está leyendo,
				y un popover abierto sobre el campo en el que escribe estorba.
			*/
			this.ocultar_ya()
		},
		pedir_ocultar() {
			this.cancelar_ocultar()
			this._timer_ocultar = setTimeout(() => {
				this.visible = false
				this.control_activo = null
			}, DEMORA_PARA_OCULTAR)
		},
		ocultar_ya() {
			this.cancelar_mostrar()
			this.cancelar_ocultar()
			if (this.visible || this.control_activo) {
				this.visible = false
				this.control_activo = null
			}
		},
		cancelar_mostrar() {
			if (this._timer_mostrar) {
				clearTimeout(this._timer_mostrar)
				this._timer_mostrar = null
			}
		},
		cancelar_ocultar() {
			if (this._timer_ocultar) {
				clearTimeout(this._timer_ocultar)
				this._timer_ocultar = null
			}
		},
	},
}
</script>
<style lang="sass">
// Mismo lenguaje visual que el popover de instrucciones de ModelForm: si las dos
// ayudas del sistema se vieran distintas, parecerían dos cosas distintas.
.descripcion-de-control-popover
	max-width: 420px !important
	border: none
	border-radius: 14px
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14), 0 2px 10px rgba(0, 0, 0, 0.06)
	padding: 0

	.popover-body
		max-height: 55vh !important
		overflow-y: auto
		padding: 0
		color: initial

	&.fade
		transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)
		opacity: 0
		transform: scale(0.96) translateY(-4px)

		&.show
			opacity: 1
			transform: scale(1) translateY(0)

.descripcion-de-control-popover__inner
	padding: 16px 18px

.descripcion-de-control-popover__header
	font-size: 0.8rem
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.04em
	color: #6b7280
	margin-bottom: 10px

.descripcion-de-control-popover__body
	p
		font-size: 0.925rem
		line-height: 1.55
		color: #1f2937
		margin-bottom: 10px

		&:last-child
			margin-bottom: 0

.descripcion-de-control-popover__seccion
	margin-top: 12px

	ul
		margin: 0
		padding-left: 18px

	li
		font-size: 0.9rem
		line-height: 1.5
		color: #1f2937
		margin-bottom: 6px

		&:last-child
			margin-bottom: 0

.descripcion-de-control-popover__subtitulo
	font-size: 0.72rem
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.04em
	color: #6b7280
	margin-bottom: 6px

// La precondicion se destaca: es lo que evita que alguien apriete algo que no va a
// hacer nada. Es el hallazgo mas repetido de la exploracion, catorce veces.
.descripcion-de-control-popover__nota
	margin-top: 12px
	padding: 10px 12px
	border-radius: 10px
	background: #fff8e6
	border: 1px solid #f5e0a3
	font-size: 0.875rem
	line-height: 1.5
	color: #7a5b00
</style>
