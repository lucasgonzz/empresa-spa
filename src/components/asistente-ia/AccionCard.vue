<template>
	<div
	class="asistente-ia-accion"
	:class="clases_de_la_tarjeta">
		<div class="asistente-ia-accion__titulo">
			{{ presentacion.titulo }}
		</div>

		<!-- Renglones etiqueta / valor tal cual los arma el API (§2.3 del plan): la SPA no
		conoce la semántica de cada tipo. Interpolación normal de Vue, que escapa: nunca
		v-html con texto que viene del API o de la IA. -->
		<div
		v-if="renglones.length"
		class="asistente-ia-accion__renglones">
			<div
			v-for="(renglon, index) in renglones"
			:key="index"
			class="asistente-ia-accion__renglon">
				<span class="asistente-ia-accion__etiqueta">{{ renglon.etiqueta }}</span>
				<span class="asistente-ia-accion__valor">{{ renglon.valor }}</span>
			</div>
		</div>

		<p
		v-if="presentacion.aviso"
		class="asistente-ia-accion__aviso">
			<i class="bi bi-info-circle"></i>
			<span>{{ presentacion.aviso }}</span>
		</p>

		<!-- Propuesta: lo único que registra algo es Confirmar. Mientras un POST viaja,
		los dos botones quedan deshabilitados; la defensa real contra el doble clic es el
		candado del API, que al segundo pedido responde 409. -->
		<div
		v-if="es_propuesta"
		class="asistente-ia-accion__pie">
			<p
			v-if="error_visible"
			class="asistente-ia-accion__error">
				<i class="bi bi-exclamation-circle"></i>
				<span>{{ error_visible }}</span>
			</p>
			<!-- Después de un 404 no hay nada que reintentar: la tarjeta queda con su texto y
			sin botones. -->
			<div
			v-if="!no_disponible"
			class="asistente-ia-accion__botones">
				<b-button
				size="sm"
				variant="outline-secondary"
				:disabled="en_curso"
				data-testid="asistente-accion-cancelar"
				@click="cancelar">
					{{ texto_cancelar }}
				</b-button>
				<b-button
				size="sm"
				variant="primary"
				:disabled="en_curso"
				data-testid="asistente-accion-confirmar"
				@click="confirmar">
					{{ texto_confirmar }}
				</b-button>
			</div>
		</div>

		<!-- Confirmada: el tilde y lo que registró el API; si hay una pantalla donde verlo,
		el botón que lleva ahí. -->
		<div
		v-else-if="es_confirmada"
		class="asistente-ia-accion__pie">
			<p class="asistente-ia-accion__resultado">
				<i class="bi bi-check-circle-fill"></i>
				<span>{{ texto_resultado }}</span>
			</p>
			<b-button
			v-if="ruta"
			size="sm"
			variant="outline-primary"
			class="asistente-ia-accion__ver"
			data-testid="asistente-accion-ver"
			@click="ir_a_la_ruta">
				<i class="bi bi-box-arrow-up-right"></i>
				{{ ruta.texto }}
			</b-button>
		</div>

		<!-- Cancelada, reemplazada o vencida: el porqué, sin botones. -->
		<div
		v-else-if="cierre"
		class="asistente-ia-accion__pie">
			<p class="asistente-ia-accion__cierre">
				<i :class="cierre.icono"></i>
				<span>{{ cierre.texto }}</span>
			</p>
		</div>
	</div>
</template>

<script>
/**
 * Texto e ícono de cada estado cerrado de una tarjeta. Los textos son los del §4 del plan
 * de asistente-ia-acciones, literales. 'descartada' no está a propósito: esa tarjeta ni se
 * pinta (la filtra MessageBubble.vue).
 */
const CIERRE_POR_ESTADO = {
	cancelada: {
		texto: 'Cancelaste esta carga.',
		icono: 'bi bi-x-circle',
	},
	reemplazada: {
		texto: 'Reemplazada por una versión corregida.',
		icono: 'bi bi-arrow-repeat',
	},
	vencida: {
		texto: 'Esta tarjeta venció. Si todavía querés cargarlo, pedíselo de nuevo al asistente.',
		icono: 'bi bi-clock-history',
	},
}

/**
 * Texto de la tarjeta cuando el POST falla SIN traer la tarjeta de vuelta. Con 409 y 422 el
 * API manda la tarjeta y ella misma cuenta lo que pasó (su estado real o su
 * `error_mensaje`), así que esos casos no llegan acá.
 *
 * 🔴 Sin respuesta (status 0) o con un 5xx que no es el JSON del API (la página HTML de un
 * proxy, un 504 del hosting, un error fatal de PHP), el pedido pudo haber llegado y haberse
 * registrado igual: la tarjeta no puede afirmar que no se registró. Solo un 500 con JSON es
 * el catch del ejecutor, que revirtió la transacción antes de responder (§3.6 del plan). El
 * reintento es seguro en los dos casos: si la carga ya estaba, el API responde 409 con la
 * tarjeta confirmada y la tarjeta lo muestra.
 *
 * @param {String} verbo 'confirmar' | 'cancelar'
 * @param {Object} falla { status, message, con_json } con el que rechazan ai_chat/confirmarAccion y cancelarAccion
 * @returns {String}
 */
function texto_de_falla(verbo, falla) {
	let status = falla ? falla.status : 0
	// Un 404 es una conversación o una tarjeta que ya no existe (por ejemplo, la
	// conversación se borró desde otra pestaña): "probá de nuevo" mandaría a reintentar
	// algo que no va a andar nunca.
	if (status == 404) {
		return 'Esta tarjeta ya no está disponible.'
	}
	// 401 y 403 los cortan los middlewares (auth:sanctum, check_extencion_empresa) antes de
	// llegar al controller, así que no traen la tarjeta. Se muestra el texto del API si lo hay,
	// salvo el "Unauthenticated." de Laravel: es el mensaje en inglés que arma el framework
	// para auth:sanctum (el Handler de empresa-api no lo traduce), no un texto para la persona.
	if (status == 401 || status == 403) {
		let message = falla && falla.message ? falla.message : null
		if (message && message != 'Unauthenticated.') {
			return message
		}
		return status == 401 ? 'Tu sesión se cerró: volvé a entrar.' : 'No tenés habilitado el asistente.'
	}
	let es_500_del_api = status == 500 && Boolean(falla && falla.con_json)
	if (status == 0 || (status >= 500 && !es_500_del_api)) {
		if (verbo == 'cancelar') {
			return 'Se cortó la conexión y no sabemos si se canceló. Tocá Cancelar de nuevo: si ya estaba, te lo muestra.'
		}
		return 'Se cortó la conexión y no sabemos si se registró. Tocá Confirmar de nuevo: si ya estaba, te lo muestra.'
	}
	if (verbo == 'cancelar') {
		return 'No se pudo cancelar. Probá de nuevo.'
	}
	return 'No se pudo registrar. Probá de nuevo.'
}

/**
 * Tarjeta de una carga que propuso el asistente de IA: un gasto, un pago de cliente o a
 * proveedor, una tarea nueva, cambios en una tarea o marcar una tarea como hecha (misión
 * asistente-ia-acciones, 15/9/2026). Nada se registra hasta que la persona toca Confirmar.
 *
 * Es un renderizador GENÉRICO: título, renglones, aviso y resultado los arma el API en
 * español, y el comportamiento sale solo de `accion.estado`. Si mañana hay un tipo de carga
 * nuevo, esta tarjeta no cambia.
 *
 * Vive adentro de la viñeta del asistente (MessageBubble.vue), así que aparece en el panel
 * flotante y también en el sidebar del informe del mostrador (SidebarConversacion.vue reusa
 * Conversation.vue). Por eso el id de la conversación llega del MENSAJE que trae la tarjeta
 * y no de lo que esté abierto en el panel.
 */
export default {
	props: {
		accion: {
			type: Object,
			required: true,
		},
		// `ai_conversation_id` del mensaje que trae la tarjeta: arma la URL del POST.
		conversation_id: {
			type: [Number, String],
			required: true,
		},
	},
	data() {
		return {
			// 'confirmar' | 'cancelar' mientras el POST viaja; null en reposo.
			verbo_en_curso: null,
			// Texto de una falla que no trajo la tarjeta de vuelta (500, red, 404). Vive acá
			// y no en el store porque la tarjeta no cambió: el API no llegó a decir nada
			// nuevo de ella.
			error_local: null,
			// true después de un 404: la conversación o la tarjeta ya no existen, así que se
			// sacan los botones (reintentar no va a andar nunca).
			no_disponible: false,
		}
	},
	computed: {
		/**
		 * La presentación que arma el API. El `|| {}` evita que una tarjeta sin
		 * presentación tire abajo el render de la conversación entera (el contrato la
		 * manda siempre).
		 */
		presentacion() {
			return this.accion.presentacion || {}
		},
		renglones() {
			return Array.isArray(this.presentacion.renglones) ? this.presentacion.renglones : []
		},
		es_propuesta() {
			return this.accion.estado == 'propuesta'
		},
		es_confirmada() {
			return this.accion.estado == 'confirmada'
		},
		/**
		 * Cancelada, reemplazada, vencida... y también cualquier estado que esta SPA no
		 * conozca (uno que el API sume más adelante): se pinta atenuada y sin botones, para
		 * no ofrecer Confirmar sobre algo que no se sabe leer.
		 */
		es_cerrada() {
			return !this.es_propuesta && !this.es_confirmada
		},
		cierre() {
			return CIERRE_POR_ESTADO[this.accion.estado] || null
		},
		clases_de_la_tarjeta() {
			return {
				'asistente-ia-accion--cerrada': this.es_cerrada,
			}
		},
		en_curso() {
			return this.verbo_en_curso !== null
		},
		/**
		 * La falla local manda sobre `error_mensaje` porque es la del último intento. Las dos
		 * se muestran solo mientras la tarjeta sigue 'propuesta': si ya se resolvió, un error
		 * viejo no dice nada.
		 */
		error_visible() {
			if (!this.es_propuesta) {
				return null
			}
			return this.error_local || this.accion.error_mensaje || null
		},
		/**
		 * "Registrando…" es el texto del plan para Confirmar en curso. Cancelar en curso
		 * dice "Cancelando…": ahí no se registra nada, y decir otra cosa confundiría.
		 */
		texto_confirmar() {
			return this.verbo_en_curso == 'confirmar' ? 'Registrando…' : 'Confirmar'
		},
		texto_cancelar() {
			return this.verbo_en_curso == 'cancelar' ? 'Cancelando…' : 'Cancelar'
		},
		/**
		 * `resultado` viene lleno cuando la tarjeta está 'confirmada'. Se lee con guarda:
		 * leer `.texto` de un null rompería el render de toda la conversación.
		 */
		texto_resultado() {
			return this.accion.resultado ? this.accion.resultado.texto : ''
		},
		/**
		 * Pantalla donde ver lo registrado ({ name, params, texto }), o null (los pagos no
		 * tienen).
		 */
		ruta() {
			let resultado = this.accion.resultado
			if (!resultado || !resultado.ruta || !resultado.ruta.name) {
				return null
			}
			return resultado.ruta
		},
	},
	methods: {
		confirmar() {
			this.resolver('confirmar')
		},
		cancelar() {
			this.resolver('cancelar')
		},
		/**
		 * Manda el confirmar o el cancelar. Si el API devuelve la tarjeta (200, 409, 422), el
		 * store ya la parcheó y la tarjeta se redibuja con lo que corresponda; si no la
		 * devuelve, se muestra el texto de falla y los botones vuelven a quedar disponibles
		 * para reintentar.
		 *
		 * @param {String} verbo 'confirmar' | 'cancelar'
		 */
		resolver(verbo) {
			// El segundo clic de un doble clic puede llegar antes de que Vue redibuje los
			// botones deshabilitados: por eso se corta acá y no solo con :disabled.
			if (this.en_curso || !this.es_propuesta || this.no_disponible) {
				return
			}
			let self = this
			this.verbo_en_curso = verbo
			this.error_local = null
			let accion_del_store = verbo == 'confirmar' ? 'ai_chat/confirmarAccion' : 'ai_chat/cancelarAccion'
			this.$store.dispatch(accion_del_store, {
				conversation_id: this.conversation_id,
				accion: this.accion,
				// Qué pantalla hay a la vista, para que confirmarAccion refresque la de la carga
				// solo si corresponde. Lo manda la tarjeta porque el store no puede importar el
				// router: router/index.js ya importa el store.
				ruta_actual: this.$route ? this.$route.name : null,
			})
				.then(function (resultado) {
					self.verbo_en_curso = null
					// 422: el motivo viaja en model.error_mensaje, que ya muestra error_visible. Si
					// ese campo llegara vacío, va el message del cuerpo: si no, la tarjeta quedaría
					// con los botones habilitados y sin decir por qué no se registró.
					let model = resultado ? resultado.model : null
					if (resultado && resultado.status == 422 && model && !model.error_mensaje && resultado.message) {
						self.error_local = resultado.message
					}
				})
				.catch(function (falla) {
					self.verbo_en_curso = null
					self.error_local = texto_de_falla(verbo, falla)
					if (falla && falla.status == 404) {
						self.no_disponible = true
					}
				})
		},
		/**
		 * Botón de `resultado.ruta` ("Ver en Gastos", "Ver en la Agenda"): cierra el panel y
		 * navega, igual que ir_al_origen de Conversation.vue, con el mismo guard contra
		 * NavigationDuplicated. Si ya se está parado en esa pantalla no navega: la vuelve a
		 * cargar (ai_chat/refrescarPantallaDeLaAccion), porque ni la Agenda ni Gastos recargan
		 * solas y cerrar el panel no alcanzaba para ver lo registrado. El .catch del push es por
		 * si el router igual rechaza: desde vue-router 3.1 push devuelve una promesa que rechaza,
		 * y sin atraparla queda un error suelto en la consola.
		 *
		 * Desde el sidebar del informe del mostrador no hay panel que cerrar: ahí lo que se
		 * cierra, al navegar, es el informe.
		 */
		ir_a_la_ruta() {
			let ruta = this.ruta
			if (!ruta) {
				return
			}
			// Un array PHP vacío viaja como [] y no como {}: se normaliza para no pasarle un
			// array al router ni recorrerlo como objeto.
			let params = ruta.params && !Array.isArray(ruta.params) ? ruta.params : {}
			this.$store.commit('ai_chat/setPanelAbierto', false)
			if (this.ya_esta_en(ruta.name, params)) {
				this.$store.dispatch('ai_chat/refrescarPantallaDeLaAccion', {
					accion: this.accion,
					ruta_actual: this.$route.name,
				})
				return
			}
			let navegacion = this.$router.push({ name: ruta.name, params: params })
			if (navegacion && typeof navegacion.catch == 'function') {
				navegacion.catch(function () {})
			}
		},
		/**
		 * true si la ruta actual ya es esa pantalla con esos params (los que manda el API;
		 * los que no manda no se comparan).
		 *
		 * @param {String} name
		 * @param {Object} params
		 * @returns {Boolean}
		 */
		ya_esta_en(name, params) {
			if (this.$route.name != name) {
				return false
			}
			let self = this
			return Object.keys(params).every(function (clave) {
				return '' + self.$route.params[clave] == '' + params[clave]
			})
		},
	},
}
</script>

<style lang="sass">
// Tarjeta de una carga propuesta por el asistente (misión asistente-ia-acciones, 15/9/2026).
//
// 🔴 El fondo es --bg-card y no otro, por el mismo razonamiento de MessageBubble.vue: la
// tarjeta vive ADENTRO de la viñeta del asistente, que se pinta con --bg-hover, y --bg-card
// cae del otro lado de ese relleno en los dos temas:
//
//   claro:  tarjeta #fff    sobre viñeta #f1f3f5 (la tarjeta SUBE)
//   oscuro: tarjeta #2e333a sobre viñeta #3a4048 (la tarjeta BAJA)
//
// Así se despega sin sombra, que repetida en cada tarjeta ensuciaría la conversación. El
// borde acompaña; el contraste lo pone el relleno.
//
// 🔴 Todo se acomoda por el ancho del CONTENEDOR y no del viewport: la misma tarjeta vive en
// el panel flotante (984px por defecto, casi pantalla completa en teléfono) y en el sidebar
// de 380px del informe del mostrador, que es angosto aunque el monitor sea ancho. Una media
// query de pantalla ahí se equivoca. Por eso los renglones son flex-wrap: la etiqueta tiene
// un ancho fijo chico y el valor baja a la línea de abajo cuando no le quedan 140px al lado.
//
// Los 140px no son a ojo. Con los paddings de hoy, al valor le quedan ~150px en el sidebar
// de 380 CON barra de scroll y ~169px sin ella, ~123px en el panel de un teléfono de 360 y
// ~320px en el panel de escritorio. El umbral tiene que caer lejos del par del sidebar: si
// quedara entre esos dos números, los renglones saltarían de una a dos líneas justo cuando
// la conversación empieza a scrollear. Si cambian los paddings de la viñeta o del sidebar,
// hay que volver a medir.
.asistente-ia-accion
	max-width: 460px
	margin-top: 10px
	padding: 12px 14px
	background: var(--bg-card, #fff)
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 12px
	color: var(--color-text-primary, #212529)
	text-align: left

	&__titulo
		font-size: .9rem
		font-weight: 600
		line-height: 1.35
		margin-bottom: 2px

	&__renglones
		transition: opacity .15s ease

	&__renglon
		display: flex
		flex-wrap: wrap
		align-items: baseline
		column-gap: 12px
		padding: 6px 0
		border-top: 1px solid var(--color-border-secondary, #e9ecef)
		line-height: 1.4

		&:first-child
			border-top: none

	&__etiqueta
		flex: 0 0 96px
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)

	&__valor
		flex: 1 1 140px
		min-width: 0
		font-size: .85rem
		word-break: break-word

	// Las cuatro líneas de ícono + texto comparten la forma: el ícono no se achica y el
	// texto largo se envuelve a su lado, no debajo del ícono.
	&__aviso, &__error, &__resultado, &__cierre
		display: flex
		align-items: baseline
		gap: 7px
		margin: 0
		line-height: 1.4

		i
			flex-shrink: 0

	&__aviso
		margin-top: 8px
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)
		transition: opacity .15s ease

	&__pie
		margin-top: 10px
		padding-top: 10px
		border-top: 1px solid var(--color-border-secondary, #e9ecef)

	&__error
		margin-bottom: 10px
		font-size: .8rem
		color: var(--btn-peligro-texto, #9c3a36)

	&__botones
		display: flex
		flex-wrap: wrap
		justify-content: flex-end
		gap: 8px

	// El verde de la caja abierta es el único verde del tema con contraparte oscura
	// (#2f7d5d en claro, #57b48d en oscuro): los dos pasan 4,5:1 contra --bg-card.
	&__resultado
		font-size: .85rem
		font-weight: 500

		i
			color: var(--caja-abierta-acento, #2f7d5d)

	&__ver
		margin-top: 10px

	&__cierre
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)

	// common-vue/sass/_inputs.sass le pone sombra a todo <button> del sistema, salvo en
	// modales, navbar y sidebars. La tarjeta es una confirmación chica, de la misma familia
	// que un modal, y con sombra los botones se veían pesados. El :not(:focus) deja intacto
	// el anillo de foco de bootstrap, que también es un box-shadow y es lo que ve quien
	// maneja la pantalla con teclado.
	.btn:not(:focus)
		box-shadow: none

	// Cancelada, reemplazada, vencida (o un estado que esta SPA no conoce): lo que decía la
	// tarjeta queda atenuado, y el porqué, abajo, a color pleno para que se lea.
	&--cerrada
		.asistente-ia-accion__renglones, .asistente-ia-accion__aviso
			opacity: .6

@media (prefers-reduced-motion: reduce)
	.asistente-ia-accion__renglones, .asistente-ia-accion__aviso
		transition: none
</style>
