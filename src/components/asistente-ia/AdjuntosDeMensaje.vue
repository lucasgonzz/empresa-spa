<template>
	<div
	v-if="imagenes.length"
	class="asistente-ia-adjuntos">
		<!-- Una <figure> por imagen: la foto (o la línea de "no cargó") y su epígrafe. Todo es
		texto interpolado o un <img :src>: nunca v-html con algo que venga del API o de la IA
		(D43, misma regla que la burbuja). -->
		<figure
		v-for="adjunto in imagenes"
		:key="adjunto.clave"
		class="asistente-ia-adjuntos__item">
			<!-- La miniatura es un botón (role + tabindex) y no un <button>: `_inputs.sass` le
			pone sombra y chasis a todo <button> del sistema, y una foto con sombra de botón se
			veía como un control y no como una imagen. Enter y espacio la activan igual que el
			clic, que es lo que role="button" promete al teclado.

			🔴 EL <img> NO TIENE @load Y NO LE FALTA. Con `loading="lazy"`, `height: auto` y sin
			`aspect-ratio`, esta miniatura mide ~10px hasta que la foto decodifica y después
			pega un salto de ~210px: el hilo crece sin que nadie haya scrolleado. De eso se
			entera `Conversation.vue` con un ResizeObserver sobre el div de los mensajes, que
			además cubre el resize del panel y las tarjetas que cambian de alto — un @load acá
			taparía solo este caso y habría que acordarse de agregarlo en cada componente
			nuevo. Si algún día se le pone `aspect-ratio` para reservar el lugar, el observador
			sigue haciendo falta por los otros dos. -->
			<div
			v-if="!adjunto.rota"
			class="asistente-ia-adjuntos__miniatura"
			role="button"
			tabindex="0"
			title="Ver la imagen completa"
			data-testid="asistente-adjunto-imagen"
			@click="abrir(adjunto)"
			@keydown.enter.prevent="abrir(adjunto)"
			@keydown.space.prevent="abrir(adjunto)">
				<img
				:src="adjunto.url"
				:alt="adjunto.alt"
				loading="lazy"
				@error="marcar_rota(adjunto)">
			</div>
			<!-- La URL no cargó (el storage no responde, la foto se borró después de la
			respuesta): una línea atenuada donde iba la foto, con el mismo molde ícono + texto
			de AccionCard.vue. El epígrafe se queda: es el nombre del artículo y sigue diciendo
			de qué foto se hablaba. -->
			<p
			v-else
			class="asistente-ia-adjuntos__rota"
			data-testid="asistente-adjunto-imagen-rota">
				<i
				class="bi bi-image"
				aria-hidden="true"></i>
				<span>No se pudo cargar la imagen</span>
			</p>
			<figcaption
			v-if="adjunto.texto"
			class="asistente-ia-adjuntos__epigrafe">{{ adjunto.texto }}</figcaption>
		</figure>

		<!-- El visor de la imagen completa. Es un b-modal y no el ImageLightbox de WhatsApp:
		ver el porqué en el docblock del componente. `hide-header` + `hide-footer`: el modal
		entero es el marco oscuro, y adentro van la foto, su epígrafe y la cruz. Sin `centered`
		a propósito: el diálogo se estira a la pantalla entera (ver el <style>) y el centrado lo
		hace el marco, así el clic en cualquier lugar que no sea la foto la cierra. -->
		<b-modal
		v-model="visor_abierto"
		id="asistente-ia-adjunto-visor"
		modal-class="asistente-ia-visor"
		dialog-class="asistente-ia-visor__dialogo"
		content-class="asistente-ia-visor__contenido"
		body-class="asistente-ia-visor__cuerpo"
		hide-header
		hide-footer
		:aria-label="visor ? 'Imagen ampliada: ' + visor.alt : 'Imagen ampliada'"
		@hidden="al_cerrarse_el_visor">
			<div
			class="asistente-ia-visor__marco"
			@click.self="cerrar_visor">
				<button
				type="button"
				class="asistente-ia-visor__cerrar"
				aria-label="Cerrar"
				title="Cerrar"
				@click="cerrar_visor">
					<i
					class="bi bi-x-lg"
					aria-hidden="true"></i>
				</button>
				<img
				v-if="visor"
				:src="visor.url"
				:alt="visor.alt"
				class="asistente-ia-visor__imagen"
				:class="{ 'asistente-ia-visor__imagen--con-epigrafe': visor.texto }">
				<p
				v-if="visor && visor.texto"
				class="asistente-ia-visor__epigrafe">{{ visor.texto }}</p>
			</div>
		</b-modal>
	</div>
</template>

<script>
/**
 * Las fotos de un mensaje del chat, pinte quien pinte. Son DOS cosas distintas del API que en
 * pantalla son la misma, y por eso comparten este componente:
 *
 *   - Lo que ADJUNTA EL ASISTENTE (misión asistente-omnisciente, 21/9/2026, §1 del contrato):
 *     hoy, la foto de un artículo cuando la persona la pide ("mostrame la foto"). Viaja en
 *     `message.adjuntos`, siempre lista, como `{ tipo, url, texto, articulo_id }`, y va DEBAJO
 *     del texto: la foto es parte de lo que el asistente dice.
 *   - Lo que MANDA EL DUEÑO por WhatsApp (misión asistente-capacidades-y-hilos, 22/9/2026,
 *     contrato 1): viaja en `message.imagenes` como `{ id, orden, url }` y va ARRIBA del texto,
 *     como en cualquier chat. `MessageBubble.vue` lo traduce a la forma de los adjuntos antes
 *     de pasarlo, así este componente conoce UN solo formato.
 *
 * Se pintan SOLO los de `tipo === 'imagen'` con `url`, y cualquier tipo que esta SPA no conozca
 * se saltea sin error, que es lo que el contrato pide para poder sumar tipos después.
 * `articulo_id` no se usa: la ficha del artículo ya sale por la mención en el texto.
 *
 * 🔴 LA URL PUEDE SER DE UN ENDPOINT AUTENTICADO Y ESO NO PIDE NADA ESPECIAL ACÁ. Las fotos del
 * dueño viven en el disco privado de `empresa-api` y se sirven por una ruta con sesión (son
 * fotos del negocio, no van a una URL pública). Un `<img :src>` sin el atributo `crossorigin`
 * pide en modo no-cors CON credenciales, y la cookie de Sanctum es del dominio padre
 * (`SESSION_DOMAIN`, que cubre `<cliente>.comerciocity.com` y `api-<cliente>.comerciocity.com`),
 * así que viaja sola. Es exactamente lo que ya hace el módulo de WhatsApp con `media_src` ("la
 * ruta autenticada propia si el archivo es nuestro", whatsapp/conversation/MessageBubble.vue).
 * 🔴 NO agregarle `crossorigin` a estos <img>: `anonymous` justamente SACA las credenciales y
 * las fotos del dueño dejarían de verse. Si el endpoint contesta 401 o 403, salta el @error y
 * queda la línea de "No se pudo cargar la imagen", que es la degradación correcta.
 *
 * Cada foto se ve como miniatura contenida (hasta 220px de alto, fondo blanco también en modo
 * oscuro: es una foto de producto, y sobre gris oscuro un recorte con fondo blanco se ve como
 * un cartel), con el epígrafe debajo, y el clic (o Enter) la abre a tamaño natural limitada a
 * la ventana. Si la URL no carga, una línea lo dice y el mensaje sigue entero.
 *
 * 🔴 POR QUÉ EL VISOR ES UN b-modal PROPIO Y NO UNO DE LOS DOS QUE YA EXISTEN. Los dos se
 * miraron antes de escribir este:
 *
 *   - `whatsapp/conversation/ImageLightbox.vue` tiene la API justa (show, image_url, close),
 *     pero es un `position: fixed` que su propio docblock manda montar ARRIBA de todo el
 *     árbol, nunca adentro de la burbuja, y acá eso significaría tocar FloatingButton.vue y el
 *     store, fuera de este componente. Y no es solo prolijidad: bajo 900px el sidebar del
 *     informe del mostrador —el otro lugar donde se dibuja esta conversación— queda con
 *     `transform: translateX(0)` al abrirse (InformeAbierto.vue), y un `transform` convierte
 *     al ancestro en el containing block de cualquier `fixed`: el visor quedaría confinado al
 *     cajón de 380px y recortado por su `overflow: hidden`, justo en tablet.
 *   - `common-vue/components/support-chat/ImageLightbox.vue` sí es un b-modal, pero fija su
 *     z-index sobre `.modal`, que vive ADENTRO del div externo que BootstrapVue le pone a cada
 *     modal con un z-index inline propio (1040 medido desde el chat, ver
 *     CuentaCorrienteDeMencion.vue): ese 1110 no sale de ahí y el visor se abre detrás del
 *     panel (1055). Sin un `id` en ese componente no hay forma de fijarle el escalón.
 *
 * BootstrapVue cuelga el modal de <body> (BVTransporter), así que ni el `overflow: hidden` del
 * panel ni el `transform` del cajón lo alcanzan, y el escalón se fija por id igual que el modal
 * de cuenta corriente: ver el <style>.
 *
 * 🔴 UN <b-modal> POR MENSAJE CON FOTOS, TODOS CON EL MISMO id, Y NO ES UN ERROR. Mientras está
 * oculto, un b-modal (no `static`) no renderiza NADA —ni un div—, así que en el documento nunca
 * hay dos con ese id: solo existe el que está abierto. Lo que sí rompería es abrirlo por
 * `$bvModal.show(id)`, que es un evento de raíz y se lo llevarían todas las instancias juntas
 * (el mismo problema que documenta CuentaCorrienteDeMencion.vue): por eso se maneja por
 * `v-model`, que es de esta instancia y de ninguna otra.
 *
 * 🔴 ESCAPE SE ATRAPA EN `document`, EN FASE DE CAPTURA, mientras el visor está abierto. Panel.vue
 * escucha `keydown` en `document` y cierra el panel entero con Escape; el b-modal también se
 * cierra con Escape, pero no frena el evento, así que un Escape con la foto abierta cerraba la
 * foto Y el chat. Es la misma solución, por el mismo motivo, que el visor de WhatsApp: en
 * captura este listener corre antes que cualquier otro, cierra el visor y corta la propagación.
 */
export default {
	name: 'AdjuntosDeMensaje',
	props: {
		// Las fotos a pintar, en la forma de `message.adjuntos` del asistente. Quién las manda
		// ya lo resolvió MessageBubble.vue: o son los adjuntos tal cual llegan del API, o son
		// las fotos del dueño (`message.imagenes`) traducidas a esta forma. Puede traer tipos
		// que esta SPA no conoce.
		adjuntos: {
			type: Array,
			default: function () {
				return []
			},
		},
		/**
		 * Qué dice un lector de pantalla de una foto SIN epígrafe.
		 *
		 * Los adjuntos del asistente casi siempre traen epígrafe (el nombre del artículo) y
		 * ése es el mejor `alt` posible, así que este default casi no se usa ahí. Las fotos del
		 * dueño no traen ninguno --no hay nada que poner debajo de la foto-- y ahí "Imagen" a
		 * secas no dice nada: el llamador pasa algo que sí ("Foto que mandaste").
		 *
		 * No se pasa como `texto` porque `texto` se DIBUJA como epígrafe: un renglón repetido
		 * abajo de cada foto sería ruido en pantalla para ganar una palabra en el lector.
		 */
		alt_por_defecto: {
			type: String,
			default: 'Imagen',
		},
	},
	data() {
		return {
			// URLs cuyo <img> disparó @error, como { url: true }. Vive acá porque es un hecho
			// del navegador, no del mensaje: el API no sabe si la URL carga. Se indexa por
			// URL y no por posición, y NO se limpia cuando cambia la prop: el mensaje se
			// reemplaza entero cada vez que se parchea una tarjeta (patchAccion hace splice),
			// y limpiar ahí volvería a intentar la misma URL rota en cada Confirmar, con un
			// parpadeo del ícono de imagen rota cada vez.
			rotas: {},
			// true mientras el visor está abierto (v-model del b-modal).
			visor_abierto: false,
			// La imagen abierta en el visor: { url, alt, texto }, o null. Se vacía recién en
			// @hidden, para que la foto no desaparezca antes de que termine el fundido.
			visor: null,
		}
	},
	computed: {
		/**
		 * Los adjuntos que se pintan: solo imágenes con URL, ya con todo lo que la plantilla
		 * necesita resuelto. `alt` es el epígrafe o `alt_por_defecto`: es lo que un lector de
		 * pantalla dice de la foto, y el epígrafe (el nombre del artículo) es exactamente eso.
		 *
		 * La clave del v-for lleva la posición además de la URL: el API puede mandar la misma
		 * foto dos veces (dos artículos que comparten imagen) y una clave repetida rompería el
		 * render.
		 *
		 * @returns {Array<Object>} [{ clave, url, texto, alt, rota }]
		 */
		imagenes() {
			if (!Array.isArray(this.adjuntos)) {
				return []
			}
			let self = this
			let lista = []
			this.adjuntos.forEach(function (adjunto, indice) {
				if (!adjunto || adjunto.tipo != 'imagen') {
					return
				}
				let url = typeof adjunto.url == 'string' ? adjunto.url.trim() : ''
				if (!url) {
					return
				}
				let texto = typeof adjunto.texto == 'string' ? adjunto.texto.trim() : ''
				lista.push({
					clave: indice + '-' + url,
					url: url,
					texto: texto,
					alt: texto || self.alt_por_defecto,
					rota: Boolean(self.rotas[url]),
				})
			})
			return lista
		},
	},
	watch: {
		/**
		 * Con el visor abierto se atrapa Escape en captura (ver el docblock); al cerrarse se
		 * suelta. Mismo par que el visor de WhatsApp.
		 */
		visor_abierto(abierto) {
			if (abierto) {
				document.addEventListener('keydown', this.al_teclear_con_el_visor_abierto, true)
				return
			}
			document.removeEventListener('keydown', this.al_teclear_con_el_visor_abierto, true)
		},
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.al_teclear_con_el_visor_abierto, true)
	},
	methods: {
		/**
		 * El <img> de una miniatura no cargó: se anota la URL y la plantilla pasa a la línea
		 * de "No se pudo cargar la imagen". Con $set, porque la clave es nueva en el objeto.
		 *
		 * @param {Object} adjunto Un elemento de `imagenes`.
		 * @returns {void}
		 */
		marcar_rota(adjunto) {
			this.$set(this.rotas, adjunto.url, true)
		},
		/**
		 * Abre la imagen completa en el visor.
		 *
		 * @param {Object} adjunto Un elemento de `imagenes`.
		 * @returns {void}
		 */
		abrir(adjunto) {
			this.visor = {
				url: adjunto.url,
				alt: adjunto.alt,
				texto: adjunto.texto,
			}
			this.visor_abierto = true
		},
		cerrar_visor() {
			this.visor_abierto = false
		},
		/**
		 * @hidden del b-modal: terminó el fundido de salida, recién ahí se suelta la imagen.
		 * BootstrapVue ya devolvió el foco a la miniatura que lo abrió.
		 */
		al_cerrarse_el_visor() {
			this.visor = null
		},
		/**
		 * Escape con el visor abierto: cierra el visor y NADA MÁS (ver el docblock: sin el
		 * stopPropagation, Panel.vue cerraba también el chat).
		 *
		 * @param {KeyboardEvent} event
		 * @returns {void}
		 */
		al_teclear_con_el_visor_abierto(event) {
			if (event.key !== 'Escape') {
				return
			}
			event.stopPropagation()
			this.cerrar_visor()
		},
	},
}
</script>

<style lang="sass">
// ─── Miniaturas adentro de la viñeta ────────────────────────────────────────────────────────
//
// Se acomodan por el ancho del CONTENEDOR y no del viewport, igual que las tarjetas de carga
// (AccionCard.vue): la misma viñeta vive en el panel flotante (984px por defecto) y en el
// sidebar de 380px del informe del mostrador. Cada foto pide 220px de ancho; las que entran
// en el renglón se ponen en fila y las demás bajan (flex-wrap). Cuando la viñeta es más
// angosta que eso —a 375px la viñeta del asistente mide ~78% de ~300px, o sea ~210px de
// contenido— la foto se encoge al ancho que hay (flex-shrink) y queda una por renglón.
.asistente-ia-adjuntos
	display: flex
	flex-wrap: wrap
	gap: 8px
	margin-top: 8px
	text-align: left

	&__item
		flex: 1 1 220px
		max-width: 220px
		min-width: 0
		// Bootstrap le pone margin-bottom: 1rem a toda <figure>.
		margin: 0
		display: flex
		flex-direction: column
		gap: 4px

	// El marco de la foto: borde y radio como las tarjetas del chat (AccionCard.vue). Ocupa el
	// ancho del ítem y centra la foto adentro, así una foto vertical y una horizontal, lado a
	// lado, tienen marcos del mismo ancho y la fila se lee pareja.
	//
	// 🔴 El fondo es #fff FIJO, también en modo oscuro, a propósito y por el mismo motivo que
	// la miniatura de AccionCard.vue: es una foto de producto estilo e-commerce, con fondo
	// blanco, y sobre el gris de la viñeta oscura el recorte de la foto se leería como un
	// cartel blanco pegado. El borde sí sale del token, para que en oscuro el marco no quede
	// flotando sin límite.
	&__miniatura
		// flex: 1 1 auto: en una fila de varias fotos los ítems se estiran al alto de la fila y el
		// marco acompaña, así dos fotos de distinto alto lado a lado tienen marcos parejos y cada
		// foto queda centrada en el suyo (medido el 21/9/2026: sin esto, 202px al lado de 130px).
		flex: 1 1 auto
		display: flex
		align-items: center
		justify-content: center
		padding: 4px
		box-sizing: border-box
		background: #fff
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 12px
		cursor: zoom-in
		transition: border-color .12s ease

		&:hover
			border-color: var(--color-primary, #007bff)

		&:focus-visible
			outline: 2px solid var(--color-primary, #007bff)
			outline-offset: 2px

		img
			display: block
			max-width: 100%
			max-height: 220px
			width: auto
			height: auto
			object-fit: contain
			border-radius: 8px

	// La URL no cargó: el mismo molde ícono + texto de AccionCard.vue, atenuado.
	&__rota
		display: flex
		align-items: baseline
		gap: 7px
		margin: 0
		padding: 4px 0
		font-size: .8rem
		line-height: 1.4
		color: var(--color-text-secondary, #6c757d)

		i
			flex-shrink: 0

	// El epígrafe: el nombre del artículo, chico y atenuado, debajo de la foto. Corta de
	// línea donde haga falta (los nombres de artículo son largos de verdad).
	&__epigrafe
		margin: 0
		font-size: .8rem
		line-height: 1.35
		color: var(--color-text-secondary, #6c757d)
		word-break: break-word

// ─── El visor de la imagen completa ─────────────────────────────────────────────────────────
//
// 🔴 SIN ESTO EL VISOR SE ABRE DETRÁS DEL CHAT. Es el mismo escalón, fijado de la misma forma
// y por el mismo motivo, que el modal de cuenta corriente (CuentaCorrienteDeMencion.vue, que
// tiene la explicación larga): BootstrapVue le pone al div externo de cada modal un z-index
// inline que mide una sola vez y que desde el chat da 1040, por debajo del panel (1055) y del
// overlay del informe del mostrador (1062).
//
//      botón del chat 1054 < panel del chat 1055 < video de la demo 1060
//      < overlay del informe 1062 < ficha del hover 1063 < recordatorio de cobro 1064
//      < ESTE VISOR y el modal de cuenta corriente 1065 < toasts 1066
//
// Comparte el 1065 con el modal de cuenta corriente y no pide un escalón propio: son la misma
// clase de cosa —un modal que se abre desde adentro de la conversación— y no pueden estar
// abiertos a la vez, porque el telón de cualquiera de los dos tapa la conversación desde la que
// se abriría el otro. Los toasts siguen arriba, que es lo que importa.
//
// El `!important` le gana al inline. El id es el que arma BootstrapVue a partir del `id` del
// <b-modal>: si cambia uno, cambia el otro.
#asistente-ia-adjunto-visor___BV_modal_outer_
	z-index: 1065 !important

// El telón, más oscuro que el .5 de Bootstrap: es un visor de fotos, no un formulario, y sobre
// .5 la conversación de atrás compite con la imagen.
//
// Va sobre el id pelado y no sobre `.show`, y está medido (21/9/2026): BootstrapVue anima el telón
// con su propia transición (`fade` de activa, `show` de llegada) y al terminar le SACA las dos
// clases, así que en reposo el telón es solo `.modal-backdrop`, con el `opacity: .5` que trae el
// CSS de bootstrap-vue; una regla sobre `.show` aplicaba solo durante el fundido y después caía a
// .5. El id fija el valor de reposo, y la regla anidada conserva el cuadro inicial del fundido
// (`fade` sin `show`), que si no quedaría pisado por el id y el telón aparecería de golpe.
#asistente-ia-adjunto-visor___BV_modal_backdrop_
	opacity: .88

	&.fade:not(.show)
		opacity: 0

// 🔴 Toda regla de acá abajo le gana a la de Bootstrap por ESPECIFICIDAD y no por orden, y no
// es por gusto: cada .sass del repo importa `_custom.scss`, que arrastra bootstrap entero, así
// que la última copia de bootstrap puede quedar DESPUÉS de este archivo en la hoja final
// (está medido en common-vue/sass/_modals.sass). Por eso cada selector suma la clase de
// Bootstrap del mismo elemento: `.modal-dialog.asistente-ia-visor__dialogo` pesa (0,4,0) con el
// `.modal.asistente-ia-visor` adelante, y le gana a `.modal.fade .modal-dialog` (0,3,0) y a
// `html.dark-mode .modal-content` (0,2,1), que en oscuro le pintaría fondo al marco.
.modal.asistente-ia-visor
	// El diálogo ES la pantalla: sin margen, sin tope de ancho y sin el deslizamiento de 50px
	// de entrada (un marco que ocupa todo no tiene de dónde deslizarse; queda el fundido).
	.modal-dialog.asistente-ia-visor__dialogo
		max-width: none
		width: 100%
		height: 100%
		margin: 0
		display: flex
		transform: none

	// Transparente: lo que se ve es el telón. Fondo, borde y sombra del modal común no van.
	.modal-content.asistente-ia-visor__contenido
		width: 100%
		height: 100%
		background: transparent
		border: 0
		border-radius: 0
		box-shadow: none

	.modal-body.asistente-ia-visor__cuerpo
		display: flex
		padding: 0
		min-height: 0

.asistente-ia-visor__marco
	position: relative
	flex: 1 1 auto
	min-height: 0
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	gap: 10px
	padding: 16px
	// El clic en el marco (fuera de la foto) cierra: el cursor lo anticipa.
	cursor: zoom-out

// A tamaño natural, limitada a la ventana: los topes descuentan el padding del marco y, con
// epígrafe, el renglón de abajo. `width/height: auto` es lo que conserva la proporción; el
// `object-fit` es la red por si algún día se le fijan las dos medidas.
.asistente-ia-visor__imagen
	display: block
	max-width: 100%
	max-height: calc(100vh - 32px)
	width: auto
	height: auto
	object-fit: contain
	border-radius: 4px
	box-shadow: 0 8px 32px rgba(0, 0, 0, .45)
	cursor: default

	&--con-epigrafe
		max-height: calc(100vh - 32px - 2.6rem)

// Blanco fijo sobre el telón oscuro: el visor es oscuro en los dos temas, como el de WhatsApp.
.asistente-ia-visor__epigrafe
	margin: 0
	max-width: 100%
	font-size: .9rem
	line-height: 1.4
	text-align: center
	color: rgba(255, 255, 255, .88)
	word-break: break-word
	cursor: default

// La cruz, igual a la del visor de WhatsApp. `.modal button` de _inputs.sass ya le saca la
// sombra que llevan los botones del sistema.
.asistente-ia-visor__cerrar
	position: absolute
	top: 16px
	right: 16px
	z-index: 2
	width: 44px
	height: 44px
	padding: 0
	border: none
	border-radius: 50%
	background: rgba(255, 255, 255, .15)
	color: #fff
	font-size: 20px
	line-height: 1
	cursor: pointer
	transition: background .12s ease

	&:hover
		background: rgba(255, 255, 255, .28)

	&:focus-visible
		outline: 2px solid #fff
		outline-offset: 2px

// En teléfono el padding de 16px se come ancho útil de la foto.
@media screen and (max-width: 767px)
	.asistente-ia-visor__marco
		padding: 8px

	.asistente-ia-visor__cerrar
		top: 8px
		right: 8px

@media (prefers-reduced-motion: reduce)
	.asistente-ia-adjuntos__miniatura, .asistente-ia-visor__cerrar
		transition: none
</style>
