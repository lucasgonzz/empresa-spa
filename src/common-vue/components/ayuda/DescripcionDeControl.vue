<template>
	<b-popover
	v-if="control_activo"
	:key="control_activo.testid"
	:target="control_activo.el"
	:show="visible"
	triggers=""
	:placement="placement"
	:boundary="limite"
	:boundary-padding="margen_del_limite"
	:custom-class="clases_popover">
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

/*
	Lado donde se abre el popover si el control no pide otro: abajo, como siempre.
*/
const LADO_POR_DEFECTO = 'bottom'

/*
	Lados que un control puede pedir con `data-ayuda-placement` (los que acepta b-popover).

	Para que sirve (misión imagenes-catalogo-completo, 27/9/2026). Adentro de un b-modal,
	bootstrap-vue cuelga el popover del `.modal-content` del modal, y en los modales
	`scrollable` ese contenedor tiene `overflow: hidden` (lo pone bootstrap): todo lo que el
	popover saca afuera de la caja del modal se RECORTA, y `boundary="window"` no lo evita porque
	mide contra la ventana, no contra el modal. Un botón pegado al borde derecho —"Aprobar" al
	final de una fila— abría su ayuda abajo y centrada, y media ayuda quedaba comida por el borde.
	Ese botón pide `data-ayuda-placement="left"` y la ayuda se abre a su izquierda, entera adentro
	del modal. Es opt-in: un control sin el atributo se abre abajo, como siempre.

	Desde la misión ayuda-eliminar-recortada-en-modal (5/10/2026) la ayuda de un control que vive en
	un modal que recorta ya no depende solo de esto: el límite pasa a ser la caja del modal (ver
	caja_que_recorta) y la ayuda se mantiene adentro aunque el control no pida lado. El lado sigue
	sirviendo para elegir hacia dónde se abre.
*/
const LADOS_VALIDOS = [
	'top', 'topleft', 'topright',
	'right', 'righttop', 'rightbottom',
	'bottom', 'bottomleft', 'bottomright',
	'left', 'lefttop', 'leftbottom',
	'auto',
]

/**
 * Lado que pide el control con `data-ayuda-placement`, o el de siempre si no pide ninguno (o si
 * pide uno que b-popover no conoce).
 *
 * @param {HTMLElement} el Control que tiene el data-testid.
 * @returns {String}
 */
function lado_pedido(el) {
	let pedido = el && typeof el.getAttribute == 'function' ? el.getAttribute('data-ayuda-placement') : null
	return LADOS_VALIDOS.indexOf(pedido) !== -1 ? pedido : LADO_POR_DEFECTO
}

/*
	Si la ayuda del control es interactiva (se puede pasar el mouse a ella para leerla o
	scrollearla) o no. Por defecto lo es; un control la pide NO interactiva con el atributo
	`data-ayuda-no-interactiva` (sin valor).

	Para qué sirve (misión ayuda-eliminar-individual-y-masivo, 5/10/2026). Adentro de un menú
	desplegable el popover puede no entrar a ningún costado (en una tablet BootstrapVue deja 50 px de
	margen contra el borde de la ventana y el menú ocupa casi todo el ancho; en un teléfono el margen es
	el de MARGEN_EN_PANTALLA_ANGOSTA, pero el menú tampoco deja lugar a un costado),
	se da vuelta y queda ENCIMA de las otras opciones del menú. Interactivo, si el mouse pasa del
	ítem al popover este no se cierra y se come el clic de la opción de abajo: la misma clase de
	defecto que el globo de DropdownOptionItem (misión tooltip-eliminar-tapa-facturar). No
	interactivo, el popover lleva `pointer-events: none`: se superpone igual, pero no intercepta
	nada, el mouse nunca "entra" a él y se cierra solo al salir del control. Es opt-in: un
	control sin el atributo sigue igual que antes.
*/
const ATRIBUTO_NO_INTERACTIVA = 'data-ayuda-no-interactiva'

/**
 * Si el control deja que su ayuda reciba el mouse: false cuando trae `data-ayuda-no-interactiva`.
 *
 * @param {HTMLElement} el Control que tiene el data-testid.
 * @returns {Boolean}
 */
function ayuda_interactiva(el) {
	return !(el && typeof el.hasAttribute == 'function' && el.hasAttribute(ATRIBUTO_NO_INTERACTIVA))
}

/*
	Caja de la que bootstrap-vue cuelga la ayuda de un control que vive adentro de un modal (es el
	MODAL_SELECTOR de su bv-tooltip.js). En realidad elige la más cercana entre esta y `.b-sidebar`;
	en la SPA ningún sidebar está adentro de un modal, así que acá alcanza con mirar la del modal.
*/
const CAJA_DE_MODAL = '.modal-content'

/*
	Aire que b-popover deja entre la ayuda y el borde de la ventana si nadie le pide otro: su default,
	50 px. Se pasa siempre explícito porque adentro de un modal que recorta es otro (MARGEN_EN_MODAL)
	y en una pantalla angosta también (MARGEN_EN_PANTALLA_ANGOSTA).
*/
const MARGEN_POR_DEFECTO = 50

/*
	Aire entre la ayuda y el borde de la caja del modal que la recorta. El ancho máximo de la ayuda
	descuenta este valor de los dos lados: ver `--en-modal` en los estilos, que lo repite (16 = 2 x 8).
*/
const MARGEN_EN_MODAL = 8

/*
	Ancho máximo de la ayuda, en px: es el max-width de los estilos (.descripcion-de-control-popover);
	se repite acá porque de él depende cuánta pantalla hace falta para que la ayuda entre con el aire
	de siempre de los dos lados (ver pantalla_angosta).
*/
const ANCHO_MAXIMO_DE_LA_AYUDA = 420

/*
	Aire entre la ayuda y el borde de la ventana cuando la pantalla es angosta (un teléfono). El ancho
	máximo de la ayuda descuenta este valor de los dos lados: ver `--pantalla-angosta` en los estilos,
	que lo repite (16 = 2 x 8).
*/
const MARGEN_EN_PANTALLA_ANGOSTA = 8

/**
 * Caja de modal que RECORTARÍA la ayuda del control, o null si no hay ninguna: el control no está en
 * un modal, o está en uno que no recorta.
 *
 * Para qué sirve (misión ayuda-eliminar-recortada-en-modal, 5/10/2026). La ayuda del "Eliminar" del
 * pie del formulario de un registro salía comida por el modal: a 1366 px le faltaban unos 20 px a la
 * izquierda y en un teléfono quedaba cortada de un costado. Es el mismo recorte que explica
 * LADOS_VALIDOS (el `.modal-content` de un modal `scrollable` lleva `overflow: hidden`), pero acá el
 * botón está pegado al borde izquierdo y ningún lado entra a 375 px: b-popover le deja 50 px de aire
 * contra la ventana, y la ayuda mide 357 de los 375, así que no tiene dónde ubicarse. Con la caja del
 * modal como límite y 8 px de aire, y sin pasar nunca del ancho de la caja, entra entera en los tres
 * anchos sin que el control tenga que pedir nada.
 *
 * Solo cuenta si la caja recorta de verdad: la mayoría de los modales de la SPA no son `scrollable`, y
 * en esos la ayuda que sobresale de la caja no queda recortada por el modal. Ahí no se toca nada.
 *
 * @param {HTMLElement} el Control que tiene el data-testid.
 * @returns {HTMLElement|null}
 */
function caja_que_recorta(el) {
	let caja = el && typeof el.closest == 'function' ? el.closest(CAJA_DE_MODAL) : null
	if (!caja) {
		return null
	}
	let estilo = window.getComputedStyle(caja)
	return estilo.overflowX !== 'visible' || estilo.overflowY !== 'visible' ? caja : null
}

/**
 * Si la pantalla no puede alojar la ayuda más ancha con el aire de siempre de los dos lados: menos de
 * ANCHO_MAXIMO_DE_LA_AYUDA + 2 x MARGEN_POR_DEFECTO (420 + 2 x 50 = 520 px), o sea un teléfono. En una
 * pantalla así, la ayuda de un control sin caja que recorta usa MARGEN_EN_PANTALLA_ANGOSTA de aire y la
 * clase `--pantalla-angosta` (ver margen_del_limite y clases_popover).
 *
 * Para qué sirve (misión ayuda-entera-en-telefono, 5/10/2026). En un teléfono de 375 px la ayuda de un
 * control que NO está en un modal que recorta salía cortada por un borde de la pantalla. La ayuda cuelga
 * de <body> (o del .modal-content, si el control está en un modal que no recorta) y su ancho se ajusta
 * al contenido hasta el de ese contenedor, así que a 375 px llega a medir 375. b-popover le exige 50 px
 * de aire contra la ventana de cada lado (MARGEN_POR_DEFECTO) y una ayuda de 375 px no tiene dónde
 * ubicarse con 50 px de cada lado en una pantalla de 375. Popper acomoda primero el borde izquierdo y
 * después el derecho, pero el segundo paso mira el borde derecho calculado ANTES de mover el izquierdo:
 * si el control está hacia el centro o la derecha, la ayuda queda en x = -50 hasta 325 (cortada por la
 * izquierda); si está pegado a la izquierda, queda en x = 50 hasta 425 (cortada por la derecha). En una
 * tablet o en un escritorio entra entera y no hay nada que cambiar.
 *
 * Por eso solo cuenta en una pantalla que no puede alojar la ayuda más ancha con el aire de siempre de
 * los dos lados: ahí la ayuda pasa a MARGEN_EN_PANTALLA_ANGOSTA de aire y a un ancho máximo que descuenta
 * ese aire de cada lado. En el resto no se toca nada.
 *
 * Mide `clientWidth` del documento y no `innerWidth`: no cuenta la barra de scroll, que es lo que ve el
 * usuario.
 *
 * Límite conocido: el límite `window` de popper (boundary) es el ancho del DOCUMENTO, que puede ser mayor
 * que el de la ventana si la página desborda en horizontal (a 320 px el listado de artículos desborda
 * 5 px y la ayuda queda con 3 px de aire contra el borde derecho en vez de 8). Con la página sin desborde,
 * que es lo medido de 360 a 390 px, los dos coinciden. No lo introduce este cambio.
 *
 * @returns {Boolean} true si la pantalla es angosta; false si la ayuda entra con el aire de siempre.
 */
function pantalla_angosta() {
	return document.documentElement.clientWidth < ANCHO_MAXIMO_DE_LA_AYUDA + 2 * MARGEN_POR_DEFECTO
}

export default {
	name: 'DescripcionDeControl',
	data() {
		return {
			/*
				El control que tiene la descripción abierta (o a punto de abrirse):
				{ el: HTMLElement, testid: String, descripcion: Object, placement: String,
				interactiva: Boolean, caja: HTMLElement|null, angosta: Boolean }. Es null cuando
				no hay ninguno.
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
		/**
		 * Lado donde se abre el popover del control activo (ver LADOS_VALIDOS).
		 *
		 * @returns {String}
		 */
		placement() {
			return this.control_activo && this.control_activo.placement ? this.control_activo.placement : LADO_POR_DEFECTO
		},
		/**
		 * Contra qué se mantiene entera la ayuda del control activo: la caja del modal que la
		 * recortaría, o la ventana si no hay ninguna (ver caja_que_recorta).
		 *
		 * @returns {HTMLElement|String}
		 */
		limite() {
			return this.control_activo && this.control_activo.caja ? this.control_activo.caja : 'window'
		},
		/**
		 * Aire entre la ayuda y ese límite (ver MARGEN_EN_MODAL, MARGEN_EN_PANTALLA_ANGOSTA y
		 * MARGEN_POR_DEFECTO). El orden importa: manda la caja del modal que recorta; si no hay caja y
		 * la pantalla es angosta (ver pantalla_angosta), el de la pantalla angosta; si no, el de siempre.
		 *
		 * @returns {Number}
		 */
		margen_del_limite() {
			if (this.control_activo && this.control_activo.caja) {
				return MARGEN_EN_MODAL
			}
			if (this.control_activo && this.control_activo.angosta) {
				return MARGEN_EN_PANTALLA_ANGOSTA
			}
			return MARGEN_POR_DEFECTO
		},
		/**
		 * Clases del popover del control activo: la de siempre, más la que le saca el mouse
		 * cuando el control pidió la ayuda no interactiva (ver ATRIBUTO_NO_INTERACTIVA), más la que
		 * le limita el ancho cuando la ayuda va contenida en la caja de un modal (ver
		 * caja_que_recorta) o, si no hay caja que recorte pero la pantalla es angosta (ver
		 * pantalla_angosta), la que le limita el ancho al de su contenedor menos el aire de cada lado.
		 * La caja manda: esas dos últimas clases nunca van juntas.
		 *
		 * Va como texto y no como arreglo: el prop `custom-class` de b-popover (BootstrapVue 2.23)
		 * es de tipo String, y con un Array Vue tira "Invalid prop: type check failed" en desarrollo.
		 *
		 * @returns {String}
		 */
		clases_popover() {
			let clases = 'descripcion-de-control-popover'
			if (this.control_activo && this.control_activo.interactiva === false) {
				clases += ' descripcion-de-control-popover--no-interactiva'
			}
			if (this.control_activo && this.control_activo.caja) {
				clases += ' descripcion-de-control-popover--en-modal'
			} else if (this.control_activo && this.control_activo.angosta) {
				clases += ' descripcion-de-control-popover--pantalla-angosta'
			}
			return clases
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
		 * @returns {Object|null} { el, testid, descripcion, placement, interactiva, caja,
		 * angosta: Boolean } o null.
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
			return {
				el: el,
				testid: testid,
				descripcion: descripcion,
				placement: lado_pedido(el),
				interactiva: ayuda_interactiva(el),
				caja: caja_que_recorta(el),
				angosta: pantalla_angosta(),
			}
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
// El 420px de abajo es el ancho maximo de la ayuda y esta repetido a mano en otros tres lugares: en el
// script (ANCHO_MAXIMO_DE_LA_AYUDA, de donde sale el umbral de pantalla_angosta) y en las reglas
// --en-modal y --pantalla-angosta de mas abajo. Si se cambia, cambiar los cuatro lugares (si no, entre el
// umbral y el ancho nuevo la ayuda vuelve a salir cortada, sin ningun error).
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

// Ayuda de un control que vive adentro de un modal que recorta (ver caja_que_recorta): nunca es mas
// ancha que la caja del modal menos el aire de cada lado (MARGEN_EN_MODAL x 2). El 100% es el ancho
// interior de la caja (sin su borde) porque b-popover cuelga el popover del .modal-content, que es
// position: relative. En un telefono, donde el modal ocupa casi todo el ancho, es lo que la deja
// entrar entera. Va despues del max-width de arriba (los dos con !important): si el navegador no
// entiende min(), esta linea se ignora y queda el tope de 420px de siempre.
.descripcion-de-control-popover--en-modal
	max-width: min(420px, calc(100% - 16px)) !important

// Ayuda de un control SIN caja que recorta (fuera de un modal, o adentro de uno que no recorta) en una
// pantalla angosta (ver pantalla_angosta): nunca es mas ancha que su contenedor menos el aire de cada
// lado (MARGEN_EN_PANTALLA_ANGOSTA x 2). El 100% es el ancho del bloque contenedor: la ventana cuando
// cuelga de <body> (adentro de un modal que no recorta cuelga del .modal-content, y es el de esa caja).
// Va despues del max-width base de 420px (los dos con !important): si el navegador no entiende min(),
// esta linea se ignora y queda el tope de 420px de siempre.
.descripcion-de-control-popover--pantalla-angosta
	max-width: min(420px, calc(100% - 16px)) !important

// Ayuda pedida NO interactiva con data-ayuda-no-interactiva (ver ATRIBUTO_NO_INTERACTIVA):
// el popover entero deja pasar el mouse, asi que no puede tapar ni interceptar el clic de lo que
// queda debajo cuando se superpone a un menu. !important para que alcance tambien a los hijos
// (.popover-body, el inner) aunque algun estilo de popover les devuelva el puntero.
.descripcion-de-control-popover--no-interactiva
	pointer-events: none !important

	*
		pointer-events: none !important

.descripcion-de-control-popover__inner
	padding: 16px 18px

.descripcion-de-control-popover__header
	font-size: 0.8rem
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.04em
	color: var(--color-text-secondary, #6b7280)
	margin-bottom: 10px

.descripcion-de-control-popover__body
	p
		font-size: 0.925rem
		line-height: 1.55
		color: var(--color-text-primary, #1f2937)
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
		color: var(--color-text-primary, #1f2937)
		margin-bottom: 6px

		&:last-child
			margin-bottom: 0

.descripcion-de-control-popover__subtitulo
	font-size: 0.72rem
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.04em
	color: var(--color-text-secondary, #6b7280)
	margin-bottom: 6px

// La precondicion se destaca: es lo que evita que alguien apriete algo que no va a
// hacer nada. Es el hallazgo mas repetido de la exploracion, catorce veces.
.descripcion-de-control-popover__nota
	margin-top: 12px
	padding: 10px 12px
	border-radius: 10px
	// --bg-card-secondary es el mismo token que ya usan los paneles de atencion de
	// ImpresoraConfigModal/InstalarAgenteModal (_dark_theme.sass): en claro no existe y cada
	// componente se queda con su literal exacto, en oscuro cae en --bg-section para no quedar
	// como un amarillo encendido en medio de un popover oscuro.
	background: var(--bg-card-secondary, #fff8e6)
	border: 1px solid #f5e0a3
	font-size: 0.875rem
	line-height: 1.5
	color: var(--color-text-warning-strong, #7a5b00)
</style>
