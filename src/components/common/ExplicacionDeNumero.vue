<template>
	<!--
		Envuelve un número (una tarjeta de totales, una fila de un reporte) y le suma un popover que
		explica de dónde sale, si lleva IVA y, cuando hay datos, la cuenta con los números reales.

		La raíz del componente ES el elemento que se envuelve: las clases que se le pasan desde afuera
		(`class="totales-chip d-none d-lg-flex"`) caen sobre este mismo <div>, así que el layout del
		padre no se entera de que hay un componente de por medio. Un <div> extra entre `.ventas-totales`
		y sus chips rompería el flex.

		`tabindex="0"`: es lo que permite abrirlo con el teclado (Tab) y lo que hace que en el celular
		un toque llegue a tener sentido como "abrir la explicación".
	-->
	<div
	ref="raiz"
	class="explicacion-de-numero"
	tabindex="0"
	@mouseenter="al_entrar_el_mouse"
	@mouseleave="al_salir_el_mouse"
	@focus="al_enfocar"
	@blur="al_perder_el_foco"
	@click="al_hacer_clic"
	@keydown.esc="ocultar_ya">

		<slot></slot>

		<!--
			🔴 `triggers="manual"` y `:show`: los disparadores propios de BootstrapVue ("hover focus")
			NO sirven acá. Con `focus` activo, hacer clic en la fila enfoca el elemento y el popover
			queda abierto AUNQUE el mouse se vaya —bootstrap-vue solo cierra cuando ningún disparador
			sigue activo, y el foco sigue—, y además en Vue 2 no hay cómo distinguir un toque de un
			clic. Manejar el estado a mano es lo que permite las tres reglas que se necesitan:
			· escritorio: aparece a los ~0,45 s de dejar el mouse quieto y se va al salir;
			· teclado: aparece al llegar con Tab (foco visible), no al hacer clic;
			· tablet y teléfono: un toque lo abre, otro toque afuera lo cierra.

			`boundary-padding`: el default de BootstrapVue para el popover es 50 px de aire contra el borde
			de la ventana. Con eso, en un teléfono de 360 px sobraban 260 para el texto y en una ventana baja
			el popover no entraba abajo por 40 px que no hacían falta.
		-->
		<b-popover
		v-if="explicacion"
		:target="obtener_raiz"
		:show="visible"
		triggers="manual"
		placement="bottom"
		boundary="viewport"
		:boundary-padding="8"
		container="body"
		custom-class="explicacion-de-numero-popover"
		@shown="permitir_scroll_si_hace_falta"
		@hidden="visible = false">

			<div
			class="explicacion-popover__inner"
			@mouseenter="cancelar_ocultar"
			@mouseleave="pedir_ocultar">

				<div class="explicacion-popover__cabecera">
					<span class="explicacion-popover__titulo">{{ explicacion.titulo }}</span>
					<span
					v-if="explicacion.iva"
					class="explicacion-popover__iva"
					:class="'explicacion-popover__iva--' + (explicacion.iva.tono || 'neutro')">
						{{ explicacion.iva.etiqueta }}
					</span>
				</div>

				<!--
					La acción solo se ofrece donde NO hay hover. En escritorio la fila ya se abre con un
					clic, y ahí este botón estaría de más; en el celular ese toque lo consume la
					explicación, así que el acceso al detalle tiene que estar adentro de ella. Va ARRIBA, pegado a la
					cabecera: el cuerpo se scrollea en el teléfono y un botón al final quedaba escondido.
				-->
				<button
				v-if="accion && sin_hover"
				type="button"
				class="explicacion-popover__accion"
				@click.stop="ejecutar_accion">
					{{ accion.texto }}
				</button>

				<p
				v-if="explicacion.resumen"
				class="explicacion-popover__resumen">
					{{ explicacion.resumen }}
				</p>

				<p
				v-if="explicacion.iva && explicacion.iva.detalle"
				class="explicacion-popover__iva-detalle">
					{{ explicacion.iva.detalle }}
				</p>

				<div
				v-for="(seccion, i) in (explicacion.secciones || [])"
				:key="'seccion-' + i"
				class="explicacion-popover__seccion">
					<div class="explicacion-popover__subtitulo">{{ seccion.titulo }}</div>
					<p
					v-for="(parrafo, j) in (seccion.parrafos || [])"
					:key="'parrafo-' + j">
						{{ parrafo }}
					</p>
					<ul v-if="seccion.items && seccion.items.length">
						<li
						v-for="(item, k) in seccion.items"
						:key="'item-' + k">
							{{ item }}
						</li>
					</ul>
				</div>

				<div
				v-if="explicacion.cuenta && explicacion.cuenta.filas.length"
				class="explicacion-popover__cuenta">
					<div class="explicacion-popover__subtitulo">{{ explicacion.cuenta.titulo }}</div>
					<div
					v-for="(fila, i) in explicacion.cuenta.filas"
					:key="'fila-' + i"
					class="explicacion-popover__fila"
					:class="fila.tipo ? 'explicacion-popover__fila--' + fila.tipo : ''">
						<span class="explicacion-popover__fila-etiqueta">{{ fila.etiqueta }}</span>
						<span class="explicacion-popover__fila-valor">{{ fila.valor }}</span>
					</div>
				</div>

				<div
				v-for="(aviso, i) in (explicacion.avisos || [])"
				:key="'aviso-' + i"
				class="explicacion-popover__aviso">
					{{ aviso }}
				</div>

			</div>
		</b-popover>
	</div>
</template>
<script>
import hay_hover from '@/utils/hay_hover'

/*
	Cuánto hay que dejar el mouse quieto encima de un número para que aparezca la explicación.
	Es una decisión de Lucas del 24/9/2026 y NO es la de DescripcionDeControl (2 s): esa regla existe
	porque un botón se cruza sin querer camino a otro, y molesta si salta. Acá el hover sobre un
	número es la intención de leerlo, y con 2 s el usuario ya creyó que no hacía nada.
*/
const DEMORA_PARA_MOSTRAR = 450

export default {
	name: 'ExplicacionDeNumero',
	props: {
		/*
			Lo que se muestra: { titulo, resumen, iva: { tono, etiqueta, detalle }, secciones: [{ titulo,
			parrafos, items }], cuenta: { titulo, filas: [{ etiqueta, valor, tipo }] }, avisos: [texto] }.
			Todo salvo `titulo` es opcional. Si no viene explicación, el componente no dibuja el popover
			y se comporta como un <div> común.
		*/
		explicacion: {
			type: Object,
			default: null,
		},
		/* { texto, ejecutar }: solo se ofrece en tablet y teléfono, ver el comentario del botón. */
		accion: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			visible: false,
			/*
				Se decide una sola vez al crearse: el tipo de puntero de un dispositivo no cambia
				mientras la pantalla está abierta.
			*/
			sin_hover: !hay_hover(),
		}
	},
	beforeDestroy() {
		this.cancelar_mostrar()
		this.cancelar_ocultar()
		this.quitar_escuchas_de_afuera()
	},
	methods: {
		/**
		 * Función que BootstrapVue usa para encontrar el elemento al que se ancla el popover. Va como
		 * función y no como `$refs.raiz` directo porque en el primer render la referencia todavía no
		 * existe.
		 *
		 * @returns {HTMLElement}
		 */
		obtener_raiz() {
			return this.$refs.raiz
		},
		al_entrar_el_mouse() {
			if (this.sin_hover || !this.explicacion) {
				return
			}
			this.cancelar_ocultar()
			this.cancelar_mostrar()
			this._timer_mostrar = setTimeout(() => {
				this.mostrar_ya()
			}, DEMORA_PARA_MOSTRAR)
		},
		al_salir_el_mouse() {
			if (this.sin_hover) {
				return
			}
			this.pedir_ocultar()
		},
		/**
		 * Cierra con un margen de gracia de 120 ms. Casi siempre el popover no recibe el mouse y el
		 * margen no se nota; pero cuando el contenido no entra en la pantalla se le habilita el puntero
		 * para poder scrollearlo (ver `permitir_scroll_si_hace_falta`), y cruzar del número al popover
		 * dispara un `mouseleave` que sin este margen lo cerraría justo cuando se va a leer.
		 */
		pedir_ocultar() {
			this.cancelar_mostrar()
			this.cancelar_ocultar()
			this._timer_ocultar = setTimeout(() => {
				this.ocultar_ya()
			}, 120)
		},
		cancelar_ocultar() {
			if (this._timer_ocultar) {
				clearTimeout(this._timer_ocultar)
				this._timer_ocultar = null
			}
		},
		/**
		 * Si lo que se explica no entra en el lugar que hay (una ventana baja, una fila del medio de la
		 * pantalla), el cuerpo del popover queda recortado y hay que poder scrollearlo. En escritorio el
		 * popover NO recibe el puntero por defecto —ver el <style>—, así que solo en este caso se lo
		 * devuelve: mejor que estorbe a la fila de al lado que dejar texto imposible de leer.
		 */
		permitir_scroll_si_hace_falta() {
			let id_del_popover = this.$refs.raiz.getAttribute('aria-describedby')
			let popover = id_del_popover ? document.getElementById(id_del_popover) : null
			let cuerpo = popover ? popover.querySelector('.popover-body') : null
			if (cuerpo && cuerpo.scrollHeight > cuerpo.clientHeight + 1) {
				popover.style.pointerEvents = 'auto'
			}
		},
		/**
		 * Foco por teclado: se abre solo si el navegador lo considera "foco visible" (llegó con Tab).
		 * Un clic también enfoca el elemento, y en ese caso no se abre nada: el clic tiene su propio
		 * manejo (`al_hacer_clic`) y abrirlo acá dejaría la explicación tapando el modal de detalle.
		 */
		al_enfocar() {
			if (!this.explicacion) {
				return
			}
			let foco_de_teclado = false
			try {
				foco_de_teclado = this.$refs.raiz.matches(':focus-visible')
			} catch (e) {
				/* Navegador viejo sin :focus-visible: se cae al comportamiento por hover/toque. */
				foco_de_teclado = false
			}
			if (foco_de_teclado) {
				this.mostrar_ya()
			}
		},
		/**
		 * Al perder el foco se cierra, salvo en tablet y teléfono: ahí el toque sobre el botón de
		 * detalle del propio popover (que vive en <body>, fuera de este elemento) le saca el foco a
		 * la raíz ANTES de que el clic llegue, y cerrarlo acá se comería el clic. Sin hover, el
		 * cierre lo resuelve la escucha de "toque afuera".
		 */
		al_perder_el_foco() {
			if (this.sin_hover) {
				return
			}
			this.ocultar_ya()
		},
		/**
		 * Con hover, un clic significa "actuar" (la fila abre su detalle): la explicación se cierra
		 * para no quedar flotando arriba del modal. Sin hover, un toque significa "explicame": abre
		 * o cierra el popover.
		 */
		al_hacer_clic() {
			if (!this.explicacion) {
				return
			}
			if (!this.sin_hover) {
				this.ocultar_ya()
				return
			}
			if (this.visible) {
				this.ocultar_ya()
			} else {
				this.mostrar_ya()
			}
		},
		mostrar_ya() {
			this.cancelar_mostrar()
			this.fijar_alto_disponible()
			this.visible = true
			this.poner_escuchas_de_afuera()
		},
		ocultar_ya() {
			this.cancelar_mostrar()
			this.cancelar_ocultar()
			this.visible = false
			this.quitar_escuchas_de_afuera()
		},
		cancelar_mostrar() {
			if (this._timer_mostrar) {
				clearTimeout(this._timer_mostrar)
				this._timer_mostrar = null
			}
		},
		/**
		 * En el celular tocar "afuera" no siempre le saca el foco al elemento (Safari de iOS no lo
		 * hace), así que no se puede confiar en el `blur` para cerrar. Mientras el popover está
		 * abierto se escucha el próximo toque en cualquier lado: si cae fuera del número y fuera del
		 * popover, se cierra.
		 */
		poner_escuchas_de_afuera() {
			if (this._escucha_de_afuera) {
				return
			}
			this._escucha_de_afuera = (event) => {
				let objetivo = event.target
				if (this.$refs.raiz && this.$refs.raiz.contains(objetivo)) {
					return
				}
				if (objetivo && typeof objetivo.closest == 'function' && objetivo.closest('.explicacion-de-numero-popover')) {
					return
				}
				this.ocultar_ya()
			}
			document.addEventListener('pointerdown', this._escucha_de_afuera, true)
			/* Al scrollear en escritorio el popover seguiría al elemento; se cierra para no dejar uno colgado. */
			if (!this.sin_hover) {
				document.addEventListener('wheel', this._escucha_de_afuera, true)
			}
		},
		quitar_escuchas_de_afuera() {
			if (!this._escucha_de_afuera) {
				return
			}
			document.removeEventListener('pointerdown', this._escucha_de_afuera, true)
			document.removeEventListener('wheel', this._escucha_de_afuera, true)
			this._escucha_de_afuera = null
		},
		/**
		 * Le dice a la hoja de estilos cuánto alto puede tener el cuerpo del popover, ANTES de que se
		 * abra: el lado más libre del elemento (arriba o abajo), menos la flecha y un margen.
		 *
		 * 🔴 Tiene que ser antes y por CSS. La primera versión corregía el alto después de abierto y
		 * pedía que popper recalculara: no lo recalculaba, y en una ventana baja (1366×768) las dos
		 * explicaciones más largas quedaban clavadas a 50 px del borde TAPANDO el número que explican.
		 * Con el alto ya acotado, popper decide de entrada de qué lado entra —o, si no entra en
		 * ninguno, se corta y se scrollea adentro— y nunca lo empuja encima del elemento.
		 *
		 * La variable es una sola para todo el documento: hay un único popover abierto por vez, y cada
		 * apertura la pisa con su propia medida.
		 */
		fijar_alto_disponible() {
			let ancla = this.$refs.raiz.getBoundingClientRect()
			let margen = 8
			/*
				Lo que ocupa el popover fuera de su cuerpo: la flecha y el margen que bootstrap le pone del
				lado del elemento (~8 px), el borde (2 px) y el relleno de 5 px que popper le exige al borde de
				la ventana. Con 12 el popover medía justo el lugar disponible y popper, por un par de
				píxeles, lo daba por "no entra" y lo empujaba arriba del elemento.
			*/
			let separacion = 26
			let lugar_arriba = ancla.top - margen - separacion
			let lugar_abajo = window.innerHeight - ancla.bottom - margen - separacion
			let alto = Math.max(120, Math.floor(Math.max(lugar_arriba, lugar_abajo)))
			document.documentElement.style.setProperty('--explicacion-alto-disponible', alto + 'px')
		},
		ejecutar_accion() {
			this.ocultar_ya()
			if (this.accion && typeof this.accion.ejecutar == 'function') {
				this.accion.ejecutar()
			}
		},
	},
}
</script>
<style lang="sass">
// El elemento envuelto. No se le pone ningún estilo propio salvo el aro de foco: el aspecto es el
// del chip o la fila que lo contiene.
//
// El aro solo aparece con :focus-visible (teclado). Con :focus a secas, cada clic sobre una fila del
// reporte dejaría un recuadro azul pegado.
.explicacion-de-numero
	outline: none

	&:focus-visible
		outline: 2px solid var(--color-primary)
		outline-offset: 2px
		border-radius: 8px

// ============================= El popover =============================
// Vive en <body> (container="body"), así que estas reglas NO están scopeadas ni cuelgan del
// componente. Todos los colores salen de los tokens del tema: en oscuro el fondo del `.popover`
// ya lo tematiza _dark_theme.sass, y lo que se declara acá tiene que seguirlo.
.explicacion-de-numero-popover
	// 🔴 `!important` a propósito: bootstrap declara `.popover { max-width: 276px }` con la misma
	// especificidad que esta clase y, según el orden en que cargue cada hoja, gana él. Sin esto el
	// popover sale angosto y la explicación se alarga hasta no entrar en la pantalla.
	max-width: 420px !important
	border: 1px solid var(--color-border)
	border-radius: 12px
	box-shadow: 0 12px 40px var(--shadow-color)

	// 🔴 En escritorio el popover NO recibe el mouse. Las filas del reporte están apiladas y la
	// explicación cae justo sobre la siguiente: si el popover capturara el puntero, para llegar a la
	// fila de abajo habría que rodearlo. Con `pointer-events: none` el mouse lo atraviesa, entra a la
	// fila de abajo y aparece la explicación de esa. En tablet y teléfono sí tiene que recibirlo
	// (botón de detalle, scroll interno), y esos dispositivos no tienen hover.
	@media (hover: hover)
		pointer-events: none

	// En un teléfono de 360 px el tope de 380 no entra: se ajusta al ancho de la pantalla con un
	// margen de 12 px por lado, para no generar scroll horizontal.
	@media (max-width: 460px)
		max-width: calc(100vw - 24px) !important

	.popover-body
		padding: 0
		color: var(--color-text-primary)
		// Lo fija `fijar_alto_disponible()` en cada apertura; el `calc` es solo el respaldo.
		max-height: var(--explicacion-alto-disponible, calc(100vh - 24px))
		overflow-y: auto

.explicacion-popover__inner
	padding: 12px 14px
	font-size: 0.82rem
	line-height: 1.45
	color: var(--color-text-primary)

	p
		margin-bottom: 6px

		&:last-child
			margin-bottom: 0

.explicacion-popover__cabecera
	display: flex
	align-items: center
	justify-content: space-between
	flex-wrap: wrap
	gap: 6px 10px
	margin-bottom: 8px

.explicacion-popover__titulo
	font-size: 0.95rem
	font-weight: 700

// El sí / no / depende del IVA es lo primero que se busca, por eso va en la cabecera y como una
// etiqueta con color. El texto va en el tono primario y el color se lo llevan el borde y el fondo:
// un ámbar o un verde de texto sobre el fondo tintado no llega a contraste legible con letra chica.
.explicacion-popover__iva
	font-size: 0.72rem
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.03em
	padding: 2px 8px
	border-radius: 999px
	border: 1px solid var(--color-border)
	background: var(--bg-hover)
	white-space: nowrap

	&--si
		border-color: var(--totales-acento-principal)
		background: var(--totales-acento-principal-bg)

	&--no
		border-color: var(--totales-acento-positivo)
		background: var(--totales-acento-positivo-bg)

	&--parcial
		border-color: var(--totales-acento-usd)
		background: var(--totales-acento-usd-bg)

.explicacion-popover__resumen
	font-weight: 500

.explicacion-popover__iva-detalle
	color: var(--color-text-secondary)

.explicacion-popover__seccion
	margin-top: 8px

	ul
		margin: 0
		padding-left: 18px

	li
		margin-bottom: 3px

		&:last-child
			margin-bottom: 0

.explicacion-popover__subtitulo
	font-size: 0.68rem
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.04em
	color: var(--color-text-secondary)
	margin-bottom: 4px

// La cuenta con los números del período: una mini tabla de dos columnas, con los importes
// alineados a la derecha y en cifras de ancho fijo para que se puedan comparar de un vistazo.
.explicacion-popover__cuenta
	margin-top: 10px
	padding: 8px 10px
	border-radius: 8px
	background: var(--bg-section)
	border: 1px solid var(--color-border)

.explicacion-popover__fila
	display: flex
	justify-content: space-between
	align-items: baseline
	gap: 12px
	padding: 2px 0

	&--resta
		color: var(--color-text-secondary)

	&--total
		margin-top: 4px
		padding-top: 5px
		border-top: 1px solid var(--color-border)
		font-weight: 700

.explicacion-popover__fila-valor
	white-space: nowrap
	font-variant-numeric: tabular-nums

// Los avisos son lo que "puede que el número no sea exacto": van destacados para que no se lean
// como una frase más de la explicación.
.explicacion-popover__aviso
	margin-top: 10px
	padding: 8px 10px
	border-radius: 8px
	border: 1px solid var(--totales-acento-principal)
	background: var(--totales-acento-principal-bg)
	font-size: 0.82rem

.explicacion-popover__accion
	display: block
	width: 100%
	margin-bottom: 8px
	padding: 8px 12px
	border-radius: 8px
	border: 1px solid var(--color-primary)
	background: transparent
	color: var(--color-primary)
	font-weight: 600
	font-size: 0.86rem

	&:active
		background: var(--bg-hover)
</style>
