<template>
	<b-popover
	v-if="articulo_activo"
	:key="articulo_activo.clave"
	:target="articulo_activo.el"
	:show="visible"
	triggers=""
	placement="top"
	boundary="viewport"
	container="body"
	custom-class="asistente-ia-ficha-popover">
		<!-- `placement="top"`: los mensajes nuevos están abajo, que es donde más se hoverea,
		y ahí el lugar libre está arriba. Cuando no entra, popper la da vuelta solo.

		⚠️ `boundary="viewport"` y NO "window", que es lo que usa el popover de descripciones
		de control. Medido el 16/9/2026 en una ventana de 760px de alto: con "window" la
		tarjeta terminaba en 762 --dos píxeles afuera-- y con "viewport" quedó en 710. La
		diferencia es contra qué mide popper: "window" toma el documento (que crece con lo
		que se desborde) y "viewport" toma lo que se ve. Para algo que flota sobre una
		conversación que scrollea sola, el que sirve es el segundo.

		`container="body"`: ver el porqué largo en el <style>. -->

		<!-- @mouseenter cancela el cierre: sin esto, cruzar del texto a la tarjeta la
		haría desaparecer justo cuando se la va a leer. Mismo par que usa el popover de
		descripciones de control. -->
		<div
		class="asistente-ia-ficha"
		@mouseenter="cancelar_ocultar()"
		@mouseleave="pedir_ocultar()">

			<!-- La cabecera se pinta ENSEGUIDA con lo que ya está en pantalla: el nombre
			sale del texto de la mención, no del pedido. Así la tarjeta aparece completa de
			entrada y lo único que llega después son los números, en vez de mostrar una
			caja vacía que se llena de golpe y salta de tamaño. -->
			<div class="asistente-ia-ficha__cabecera">
				<span class="asistente-ia-ficha__foto">
					<img
					v-if="ficha && ficha.imagen_url"
					:src="ficha.imagen_url"
					alt=""
					loading="lazy">
					<span
					v-else
					class="asistente-ia-ficha__inicial"
					aria-hidden="true">
						{{ inicial }}
					</span>
				</span>
				<span class="asistente-ia-ficha__identidad">
					<span class="asistente-ia-ficha__nombre">{{ nombre }}</span>
					<span
					v-if="ficha && ficha.codigo"
					class="asistente-ia-ficha__codigo">
						{{ ficha.codigo }}
					</span>
				</span>
			</div>

			<p
			v-if="cargando"
			class="asistente-ia-ficha__aviso">
				<i class="bi bi-arrow-repeat asistente-ia-ficha__girando"></i>
				Buscando la ficha...
			</p>

			<p
			v-else-if="fallo"
			class="asistente-ia-ficha__aviso asistente-ia-ficha__aviso--error">
				<i class="bi bi-exclamation-circle"></i>
				No pudimos traer la ficha de este artículo.
			</p>

			<template v-else-if="ficha">
				<!-- La línea de la plata y la del stock, juntas: es lo que se viene a ver. -->
				<div class="asistente-ia-ficha__destacado">
					<span class="asistente-ia-ficha__precio">{{ price(ficha.precio) }}</span>
					<span
					class="asistente-ia-ficha__stock"
					:class="ficha.stock_total > 0 ? 'asistente-ia-ficha__stock--ok' : 'asistente-ia-ficha__stock--alerta'">
						{{ numero_es(ficha.stock_total) }} en stock
					</span>
				</div>

				<div
				v-if="listas.length"
				class="asistente-ia-ficha__seccion">
					<div class="asistente-ia-ficha__subtitulo">Listas de precios</div>
					<div
					v-for="(lista, indice) in listas"
					:key="'lista-' + indice"
					class="asistente-ia-ficha__renglon">
						<span class="asistente-ia-ficha__etiqueta">{{ lista.nombre }}</span>
						<span class="asistente-ia-ficha__valor">{{ price(lista.precio) }}</span>
					</div>
				</div>

				<!-- 🔴 `tiene_depositos` lo decide el API contando las sucursales del
				comercio (§2 del contrato): con una sola, esta sección no existe --mostrar
				"Casa central: 32" debajo de "32 en stock" sería el mismo número dos veces--.
				El recorte por el permiso `article.stock_only_sucursal` también lo hace el
				API: acá se dibuja lo que llegó y nada más. -->
				<div
				v-if="ficha.tiene_depositos && depositos.length"
				class="asistente-ia-ficha__seccion">
					<div class="asistente-ia-ficha__subtitulo">Stock por depósito</div>
					<div
					v-for="(deposito, indice) in depositos"
					:key="'deposito-' + indice"
					class="asistente-ia-ficha__renglon">
						<span class="asistente-ia-ficha__etiqueta">{{ deposito.nombre }}</span>
						<span class="asistente-ia-ficha__valor">{{ numero_es(deposito.stock) }}</span>
					</div>
				</div>

				<div
				v-if="ficha.proveedor"
				class="asistente-ia-ficha__pie">
					<i class="bi bi-truck"></i>
					{{ ficha.proveedor }}
				</div>
			</template>
		</div>
	</b-popover>
</template>

<script>
/*
	Cuánto hay que dejar el mouse quieto encima del nombre de un artículo para que salga su
	ficha (misión agente-ia-mano-derecha, 16/9/2026).

	🔴 No son los 2000 ms del popover de descripciones de control, y la diferencia tiene
	motivo. Allá el hover es sobre CUALQUIER control del sistema, que uno cruza sin querer
	mirarlo, y esperar dos segundos es lo que evita que salte solo; acá el hover es sobre una
	palabra que el asistente marcó a propósito, que lleva su propio subrayado y su cursor de
	ayuda: quien se para encima es porque la quiere ver, y dos segundos se sienten como que
	no funciona.

	350 ms es lo que tarda el mouse en cruzar una palabra mientras uno lee el renglón, así que
	alcanza para no dispararla de paso, y no se percibe como espera cuando uno se detiene. Si
	hay que moverlo, el que importa es este número: el cierre ya está resuelto abajo.
*/
const DEMORA_PARA_MOSTRAR = 350

/*
	Margen de gracia antes de cerrar. Mismo valor y mismo motivo que el popover de
	descripciones de control: cruzar el espacio entre la palabra y la tarjeta dispara un
	mouseout, y sin este margen la tarjeta se cerraría en el camino.
*/
const DEMORA_PARA_OCULTAR = 250

/** Cuenta de activaciones, para que cada tarjeta abierta tenga su propia `key`. */
let secuencia = 0

export default {
	name: 'FichaArticuloPopover',
	data() {
		return {
			/*
				El artículo cuya ficha está abierta (o a punto de abrirse):
				{ el: HTMLElement, id: Number, nombre: String, clave: String }.
				null cuando no hay ninguno.
			*/
			articulo_activo: null,
			visible: false,
			cargando: false,
			fallo: false,
		}
	},
	computed: {
		/**
		 * La ficha del artículo abierto, leída de la memoria del store. Es un computed y no
		 * un dato local para que la tarjeta se redibuje sola cuando el pedido termina.
		 *
		 * @returns {Object|null}
		 */
		ficha() {
			if (!this.articulo_activo) {
				return null
			}
			return this.$store.state.ai_chat.fichas_de_articulos[this.articulo_activo.id] || null
		},
		/**
		 * El nombre del artículo. Sale de la ficha si ya llegó, y mientras tanto del texto
		 * de la mención: es el mismo nombre, y permite dibujar la cabecera sin esperar nada.
		 *
		 * @returns {String}
		 */
		nombre() {
			if (this.ficha && this.ficha.nombre) {
				return this.ficha.nombre
			}
			return this.articulo_activo ? this.articulo_activo.nombre : ''
		},
		inicial() {
			let nombre = this.nombre ? String(this.nombre).trim() : ''
			return nombre ? nombre.charAt(0).toUpperCase() : '·'
		},
		listas() {
			if (!this.ficha || !Array.isArray(this.ficha.listas_de_precios)) {
				return []
			}
			return this.ficha.listas_de_precios
		},
		depositos() {
			if (!this.ficha || !Array.isArray(this.ficha.depositos)) {
				return []
			}
			return this.ficha.depositos
		},
	},
	mounted() {
		/*
			🔴 Un solo juego de listeners delegados en document, no uno por mención. Es lo
			mismo que hace el popover de descripciones de control, y por el mismo motivo: las
			menciones nacen y mueren con cada mensaje que llega, y cablear listeners por
			elemento obligaría a MessageBubble a conocer esta tarjeta.

			mouseover/mouseout (no mouseenter/mouseleave) porque son los que burbujean, que es
			justamente lo que hace posible la delegación.
		*/
		document.addEventListener('mouseover', this.al_entrar)
		document.addEventListener('mouseout', this.al_salir)
		/*
			Si la persona actúa o mueve la pantalla, se cierra sin esperar el margen. El
			scroll va en captura porque el que importa es el de la conversación, que es un
			contenedor interno y no burbujea hasta document.
		*/
		document.addEventListener('click', this.ocultar_ya, true)
		document.addEventListener('scroll', this.ocultar_ya, true)
		document.addEventListener('keydown', this.ocultar_ya)
	},
	beforeDestroy() {
		document.removeEventListener('mouseover', this.al_entrar)
		document.removeEventListener('mouseout', this.al_salir)
		document.removeEventListener('click', this.ocultar_ya, true)
		document.removeEventListener('scroll', this.ocultar_ya, true)
		document.removeEventListener('keydown', this.ocultar_ya)
		this.cancelar_mostrar()
		this.cancelar_ocultar()
	},
	methods: {
		/**
		 * Busca, desde el elemento donde entró el mouse, la mención de artículo más cercana.
		 * Los `data-*` los escribe MessageBubble.vue; este componente no conoce a aquél.
		 *
		 * @param {EventTarget} target Elemento donde ocurrió el evento.
		 * @returns {Object|null} { el, id, nombre } o null.
		 */
		mencion_de_articulo(target) {
			if (!target || typeof target.closest != 'function') {
				return null
			}
			let el = target.closest('[data-mencion-tipo="articulo"]')
			if (!el) {
				return null
			}
			let id = parseInt(el.getAttribute('data-mencion-id'), 10)
			if (!id) {
				return null
			}
			return { el: el, id: id, nombre: el.textContent || '' }
		},
		al_entrar(event) {
			let mencion = this.mencion_de_articulo(event.target)
			if (!mencion) {
				return
			}
			this.cancelar_ocultar()
			/* Ya está abierta sobre esta misma mención: no se reinicia la cuenta. */
			if (this.articulo_activo && this.articulo_activo.el === mencion.el) {
				return
			}
			this.cancelar_mostrar()
			let self = this
			this._timer_mostrar = setTimeout(function () {
				/*
					Antes de mostrar se verifica que la mención siga en el documento. Entre
					que arrancó la cuenta y que se cumple la demora, el mensaje pudo haberse
					re-renderizado --pasa cada vez que llega una respuesta o se refresca una
					tarjeta-- y el elemento quedaría huérfano, con la tarjeta flotando en una
					posición sin sentido.
				*/
				if (!document.body.contains(mencion.el)) {
					return
				}
				secuencia++
				self.articulo_activo = {
					el: mencion.el,
					id: mencion.id,
					nombre: mencion.nombre,
					clave: mencion.id + '-' + secuencia,
				}
				self.visible = true
				self.pedir_ficha(mencion.id)
			}, DEMORA_PARA_MOSTRAR)
		},
		al_salir(event) {
			let mencion = this.mencion_de_articulo(event.target)
			if (!mencion) {
				return
			}
			this.cancelar_mostrar()
			this.pedir_ocultar()
		},
		/**
		 * Pide la ficha (o la saca de la memoria de la sesión, que es lo que pasa a partir
		 * de la segunda pasada por el mismo artículo).
		 *
		 * @param {Number} id
		 * @returns {void}
		 */
		pedir_ficha(id) {
			this.fallo = false
			if (this.$store.state.ai_chat.fichas_de_articulos[id]) {
				this.cargando = false
				return
			}
			this.cargando = true
			let self = this
			this.$store.dispatch('ai_chat/fetchFichaArticulo', id)
				.then(function () {
					// Si mientras viajaba el pedido el mouse se fue a otro artículo, este
					// resultado ya no es el que está en pantalla: la ficha igual quedó
					// guardada, solo que no manda el estado de ESTA tarjeta.
					if (self.articulo_activo && self.articulo_activo.id == id) {
						self.cargando = false
					}
				})
				.catch(function () {
					if (self.articulo_activo && self.articulo_activo.id == id) {
						self.cargando = false
						self.fallo = true
					}
				})
		},
		pedir_ocultar() {
			this.cancelar_ocultar()
			let self = this
			this._timer_ocultar = setTimeout(function () {
				self.cerrar()
			}, DEMORA_PARA_OCULTAR)
		},
		ocultar_ya() {
			this.cancelar_mostrar()
			this.cancelar_ocultar()
			if (this.visible || this.articulo_activo) {
				this.cerrar()
			}
		},
		cerrar() {
			this.visible = false
			this.articulo_activo = null
			this.cargando = false
			this.fallo = false
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
// ══════════════════════════════════════════════════════════════════════════════════════════
// TARJETA DE FICHA DE ARTÍCULO (misión agente-ia-mano-derecha, 16/9/2026)
//
// 🔴 POR QUÉ CUELGA DE <body> Y NO DEL PANEL. Dos motivos medidos, y los dos solos alcanzan:
//
//   1. `overflow: hidden`. Lo tienen `.asistente-ia-panel` (Panel.vue:367) y las dos cajas
//      del informe del mostrador (InformeAbierto.vue:256 y :308). Una tarjeta que fuera hija
//      del panel quedaría RECORTADA contra su borde, y justo en el caso que más importa: la
//      mención cerca del borde derecho o del pie de la conversación.
//   2. Los tokens de tema. Viven en `:root` / `html.dark-mode` y no en `#app`
//      (_dark_theme.sass:7-10) precisamente para que los modales de bootstrap-vue, que
//      cuelgan de body, los tengan. Colgando de body el modo oscuro sale gratis.
//
// Colgar de body es el DEFAULT de b-popover (bv-tooltip.js: `closest('.modal-content,
// .b-sidebar', target) || body`, y el panel del chat no es ninguno de los dos), pero acá va
// declarado con `container="body"`: si mañana el chat se montara adentro de un b-modal, el
// default lo metería adentro de ese modal y volvería el recorte.
//
// 🔴 EL Z-INDEX ES 1063 Y NO EL DE FÁBRICA. Bootstrap le da 1060 a `.popover`
// ($zindex-popover), y el escalón real del sistema --el de InformeAbierto.vue:253-290, más lo
// que agregó esta misión-- es:
//
//      botón del chat 1054 < panel del chat 1055 < video de la demo 1060
//      < overlay del informe 1062 < ESTA TARJETA 1063 < recordatorio de cobro 1064
//      < cuenta corriente abierta desde el chat 1065 < toasts 1066
//
// Con 1060 la tarjeta queda DETRÁS del overlay del informe (1062), que es exactamente uno de
// los dos lugares desde donde se la usa: el sidebar de conversación del mostrador. 1063 es el
// primer escalón que le gana a ese overlay.
//
// Y no sube más, a propósito. Arriba quedan cosas que SÍ tienen que taparla: los dos modales
// (el recordatorio y la cuenta corriente que abre el clic en un cliente) y los toasts. Con un
// modal abierto no se puede hoverear el texto de atrás --lo tapa el telón-- así que el caso
// no se da; pero si se diera, quien manda es el modal.
//
// El selector suma `.popover` --que bootstrap-vue ya pone en el mismo elemento-- para llegar
// a (0,2,0) y ganarle a `.popover` de bootstrap (0,1,0) sin depender del orden de carga de
// las hojas. Mismo truco que documenta BtnCurrentAcounts.vue.
//
// 🔴 EL FONDO SE RESUELVE APARTE, y no con --bg-card. El escalón de relleno del chat es
// `panel #fff -> viñeta #f1f3f5 -> tarjeta de acción #fff` en claro y
// `#2e333a -> #3a4048 -> #2e333a` en oscuro: --bg-card y --bg-hover ya están tomados por la
// viñeta (MessageBubble.vue:101-118) y por la tarjeta de acción (AccionCard.vue:459-469).
// Esta tarjeta FLOTA por encima de todo eso, así que necesita leerse elevada en los dos
// temas, y para eso el relleno tiene que ir SIEMPRE hacia arriba: blanco en claro, y un gris
// un escalón MÁS CLARO que --bg-hover en oscuro (#3f4650 sobre #3a4048). Con --bg-card en
// oscuro la tarjeta quedaba más oscura que la viñeta de la que sale, o sea hundida, que es
// lo contrario de lo que una tarjeta flotante tiene que decir. La sombra termina de
// despegarla.
// ══════════════════════════════════════════════════════════════════════════════════════════
.popover.asistente-ia-ficha-popover
	// Ver el bloque de arriba: 1062 (overlay del informe) < ESTO < 1064 (recordatorio).
	z-index: 1063

	--ficha-fondo: #fff
	--ficha-superficie: #f8f9fa
	--ficha-borde: #dee2e6
	// Verde y naranja del módulo de IA (Informe.vue:163-164 y :222-223). Se repiten acá
	// porque allá están declarados sobre `.informe`, que es un ancestro que esta tarjeta no
	// tiene: cuelga de body.
	--ficha-ok: #1B9E5A
	--ficha-alerta: #D96A00

	// 🔴 ANCHO FIJO, no solo un max-width, y no es cosmético: popper calcula la posición UNA
	// vez, cuando crea la tarjeta, y después solo la recalcula si hay scroll o resize --nunca
	// porque le haya cambiado el contenido--. Con ancho libre, la tarjeta nace angosta (el
	// estado "Buscando la ficha...") y se ensancha cuando llegan los datos: popper ya la había
	// centrado sobre la palabra con el ancho viejo, así que la tarjeta crecía HACIA AFUERA de
	// la pantalla. Medido el 16/9/2026 en 375px: quedaba de 50 a 393 con el viewport en 375, o
	// sea 18px afuera y con barra de scroll horizontal en toda la aplicación.
	//
	// Con el ancho fijo desde el primer frame, la primera medición de popper ya es la buena.
	// El `max-width` queda para el teléfono angosto: 100vw-32 recién le gana a los 320px por
	// debajo de 352px de pantalla, y ahí deja 16px de aire a cada lado.
	width: 320px
	max-width: calc(100vw - 32px)
	background: var(--ficha-fondo)
	border: 1px solid var(--ficha-borde)
	border-radius: 14px
	box-shadow: 0 12px 40px rgba(0, 0, 0, .18), 0 2px 10px rgba(0, 0, 0, .08)
	padding: 0

	.popover-body
		padding: 0
		color: var(--color-text-primary, #212529)

	// La flecha la dibuja bootstrap con el blanco y el borde de fábrica: en modo oscuro
	// quedaba una punta blanca colgando de una tarjeta gris. Se la ata a los mismos tokens
	// que el cuerpo. Los cuatro `bs-popover-*` son los que puede elegir popper al acomodar.
	&.bs-popover-top > .arrow::after
		border-top-color: var(--ficha-fondo)
	&.bs-popover-bottom > .arrow::after
		border-bottom-color: var(--ficha-fondo)
	&.bs-popover-left > .arrow::after
		border-left-color: var(--ficha-fondo)
	&.bs-popover-right > .arrow::after
		border-right-color: var(--ficha-fondo)
	&.bs-popover-top > .arrow::before
		border-top-color: var(--ficha-borde)
	&.bs-popover-bottom > .arrow::before
		border-bottom-color: var(--ficha-borde)
	&.bs-popover-left > .arrow::before
		border-left-color: var(--ficha-borde)
	&.bs-popover-right > .arrow::before
		border-right-color: var(--ficha-borde)

	// 🔴 Y otra vez, pero anidado bajo html.dark-mode, porque si no NO GANA. develop sumó
	// el 16/9 (53eaad42) una regla global `html.dark-mode .popover.bs-popover-* > .arrow::after`
	// que pesa (0,4,2); el bloque de arriba, scopeado a esta tarjeta, pesa (0,4,1) y pierde.
	// Medido: cuerpo rgb(63,70,80) y flecha rgb(46,51,58), o sea una punta de otro color
	// colgando de la tarjeta. Anidarlo suma la clase de la tarjeta y llega a (0,5,2).
	// Es el mismo escalón de especificidad que ya hubo que hacer con el `background`.
	html.dark-mode &
		&.bs-popover-top > .arrow::after
			border-top-color: var(--ficha-fondo)
		&.bs-popover-bottom > .arrow::after
			border-bottom-color: var(--ficha-fondo)
		&.bs-popover-left > .arrow::after
			border-left-color: var(--ficha-fondo)
		&.bs-popover-right > .arrow::after
			border-right-color: var(--ficha-fondo)

	// Entrada corta: la tarjeta aparece después de una demora que ya se esperó, así que la
	// animación tiene que acompañar, no sumarse.
	&.fade
		transition: opacity .14s ease-out, transform .14s ease-out
		opacity: 0
		transform: scale(.97) translateY(-3px)

		&.show
			opacity: 1
			transform: scale(1) translateY(0)

html.dark-mode .popover.asistente-ia-ficha-popover
	// Un escalón POR ENCIMA de --bg-hover (#3a4048), que es el relleno de la viñeta de la
	// que sale la tarjeta. Ver el porqué en el encabezado.
	--ficha-fondo: #3f4650
	--ficha-superficie: #343a42
	--ficha-borde: rgba(255, 255, 255, .16)
	--ficha-ok: #57b48d
	--ficha-alerta: #ffa14d
	box-shadow: 0 12px 40px rgba(0, 0, 0, .55), 0 2px 10px rgba(0, 0, 0, .35)

	// 🔴 El fondo y el borde se REPITEN acá, y no sobra: _dark_theme.sass:293-295 declara
	// `html.dark-mode .popover { background-color: var(--bg-card) }`, que con el `html`
	// adelante pesa (0,2,1) y le gana al `.popover.asistente-ia-ficha-popover` de arriba,
	// que pesa (0,2,0). Medido el 16/9/2026: el token --ficha-fondo quedaba bien puesto en
	// #3f4650 y el fondo pintado igual salía #2e333a, o sea la tarjeta EXACTAMENTE del
	// color del panel, que es el caso hundido que este archivo viene a evitar. Con el
	// selector completo bajo html.dark-mode queda en (0,3,1) y gana.
	background: var(--ficha-fondo)
	border-color: var(--ficha-borde)

.asistente-ia-ficha
	padding: 12px 14px
	text-align: left
	font-size: .85rem
	line-height: 1.4

	&__cabecera
		display: flex
		align-items: center
		gap: 10px
		min-width: 0

	// Foto 48x48 con `object-fit: cover` y caída a la inicial: la misma que ya usa el
	// bloque de artículos de los informes del mostrador (ia/bloques/Articulos.vue:96-112).
	&__foto
		flex-shrink: 0
		width: 48px
		height: 48px
		border-radius: 10px
		overflow: hidden
		background: var(--ficha-superficie)
		border: 1px solid var(--ficha-borde)
		display: flex
		align-items: center
		justify-content: center

		img
			width: 100%
			height: 100%
			object-fit: cover
			display: block

	&__inicial
		font-size: 1.2rem
		font-weight: 700
		color: var(--color-text-secondary, #6c757d)

	&__identidad
		display: flex
		flex-direction: column
		gap: 2px
		min-width: 0

	// Hasta tres renglones y después puntos suspensivos: los nombres de artículo del
	// sistema son largos de verdad ("LAMPARA DICROICA LEDS 7W GU10 LUZ DIA
	// NO/DIMERIZABLE CANDELA") y cortarlos en uno solo deja la tarjeta sin decir de qué
	// artículo habla.
	&__nombre
		font-weight: 600
		font-size: .9rem
		line-height: 1.3
		color: var(--color-text-primary, #212529)
		display: -webkit-box
		-webkit-line-clamp: 3
		-webkit-box-orient: vertical
		overflow: hidden

	&__codigo
		font-size: .78rem
		color: var(--color-text-secondary, #6c757d)
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	&__destacado
		display: flex
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 8px
		margin-top: 12px
		padding-top: 10px
		border-top: 1px solid var(--ficha-borde)

	&__precio
		font-size: 1.15rem
		font-weight: 700
		color: var(--color-text-primary, #212529)

	&__stock
		flex-shrink: 0
		border-radius: 999px
		padding: 3px 10px
		font-size: .78rem
		font-weight: 600
		white-space: nowrap

		&--ok
			color: var(--ficha-ok)
			background: var(--ficha-superficie)

		&--alerta
			color: var(--ficha-alerta)
			background: var(--ficha-superficie)

	&__seccion
		margin-top: 10px
		padding-top: 8px
		border-top: 1px solid var(--ficha-borde)

	&__subtitulo
		font-size: .7rem
		font-weight: 700
		text-transform: uppercase
		letter-spacing: .04em
		color: var(--color-text-secondary, #6c757d)
		margin-bottom: 4px

	&__renglon
		display: flex
		align-items: baseline
		justify-content: space-between
		gap: 12px
		padding: 2px 0

	&__etiqueta
		min-width: 0
		color: var(--color-text-secondary, #6c757d)
		font-size: .82rem
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	&__valor
		flex-shrink: 0
		font-weight: 600
		font-size: .84rem

	&__pie
		display: flex
		align-items: center
		gap: 6px
		margin-top: 10px
		padding-top: 8px
		border-top: 1px solid var(--ficha-borde)
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)

	&__aviso
		display: flex
		align-items: center
		gap: 8px
		margin: 12px 0 0 0
		padding-top: 10px
		border-top: 1px solid var(--ficha-borde)
		font-size: .82rem
		color: var(--color-text-secondary, #6c757d)

		&--error
			color: var(--btn-peligro-texto, #9c3a36)

	&__girando
		animation: asistente-ia-ficha-girando 1s linear infinite

@keyframes asistente-ia-ficha-girando
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)

@media (prefers-reduced-motion: reduce)
	.popover.asistente-ia-ficha-popover.fade
		transition: none

	.asistente-ia-ficha__girando
		animation: none
</style>
