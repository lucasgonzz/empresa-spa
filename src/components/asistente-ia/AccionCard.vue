<template>
	<div
	class="asistente-ia-accion"
	:class="clases_de_la_tarjeta">
		<div class="asistente-ia-accion__titulo">
			{{ presentacion.titulo }}
		</div>

		<!-- Miniatura (misión asistente-masivas-imagenes-y-remito, 19/9/2026, contrato §3):
		la imagen candidata para una categoría, que el job de imágenes encontró pero no se
		animó a asignar solo. Es la foto de la que hablan los renglones, por eso va arriba de
		ellos. `alt` es el título de la tarjeta ("Imagen para la categoría Bazar"): es lo que
		un lector de pantalla necesita saber de la foto. Si la URL no carga (el archivo
		candidato ya se limpió, o el storage no responde), la miniatura se esconde y queda
		una línea atenuada en su lugar: la tarjeta sigue entera, con sus botones. Sin
		`imagen_url` no se pinta nada, igual que hasta hoy. -->
		<div
		v-if="imagen_url && !imagen_rota"
		class="asistente-ia-accion__imagen">
			<img
			:src="imagen_url"
			:alt="presentacion.titulo"
			referrerpolicy="origin"
			loading="lazy"
			data-testid="asistente-accion-imagen"
			@error="imagen_rota = true">
		</div>
		<p
		v-else-if="imagen_url"
		class="asistente-ia-accion__imagen-rota"
		data-testid="asistente-accion-imagen-rota">
			<i
			class="bi bi-image"
			aria-hidden="true"></i>
			<span>No se pudo mostrar la imagen</span>
		</p>

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

		<!-- Los íconos de la tarjeta son decorativos: el texto de al lado ya dice todo, así
		que van con aria-hidden para que el lector de pantalla no los nombre. -->
		<p
		v-if="presentacion.aviso"
		class="asistente-ia-accion__aviso">
			<i
			class="bi bi-info-circle"
			aria-hidden="true"></i>
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
			role="alert"
			class="asistente-ia-accion__error">
				<i
				class="bi bi-exclamation-circle"
				aria-hidden="true"></i>
				<span>{{ error_visible }}</span>
			</p>
			<!-- "Registrando…" / "Cancelando…" para lectores de pantalla, en una región propia
			y siempre montada mientras la tarjeta es propuesta: adentro del botón no se
			anunciaría (los hijos de un botón son presentacionales), y una región que aparece
			ya con texto tampoco se anuncia de forma confiable. -->
			<span
			role="status"
			class="sr-only">{{ texto_en_curso }}</span>
			<!-- Después de un 404 no hay nada que reintentar: la tarjeta queda con su texto y
			sin botones. -->
			<template v-if="!no_disponible">
				<!-- Mientras el asistente responde, esa respuesta puede traer la corrección de
				esta misma tarjeta: confirmarla ahora dejaría las dos confirmables y la carga
				duplicada. Cancelar no corre ese riesgo y sigue habilitado. -->
				<p
				v-if="esperando_al_asistente"
				class="asistente-ia-accion__espera">
					Esperá a que responda el asistente
				</p>
				<div class="asistente-ia-accion__botones">
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
					:disabled="en_curso || esperando_al_asistente"
					data-testid="asistente-accion-confirmar"
					@click="confirmar">
						{{ texto_confirmar }}
					</b-button>
				</div>
			</template>
		</div>

		<!-- Confirmada: el tilde y lo que registró el API; si hay una pantalla donde verlo,
		el botón que lleva ahí. -->
		<div
		v-else-if="es_confirmada"
		class="asistente-ia-accion__pie">
			<p
			role="status"
			class="asistente-ia-accion__resultado">
				<i
				class="bi bi-check-circle-fill"
				aria-hidden="true"></i>
				<span>{{ texto_resultado }}</span>
			</p>
			<b-button
			v-if="ruta"
			size="sm"
			variant="outline-primary"
			class="asistente-ia-accion__ver"
			data-testid="asistente-accion-ver"
			@click="ir_a_la_ruta">
				<i
				class="bi bi-box-arrow-up-right"
				aria-hidden="true"></i>
				{{ ruta.texto }}
			</b-button>
		</div>

		<!-- Cancelada, reemplazada o vencida: el porqué, sin botones. -->
		<div
		v-else-if="cierre"
		class="asistente-ia-accion__pie">
			<p
			role="status"
			class="asistente-ia-accion__cierre">
				<i
				:class="cierre.icono"
				aria-hidden="true"></i>
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
 * La excepción es un 409 SIN `model` (la fila desapareció entre la validación y la relectura):
 * ese sí llega acá, y la tarjeta pide recargar la conversación.
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
	// Un 409 SIN tarjeta: la fila de la acción desapareció entre la validación y la relectura
	// del API, así que no hay estado nuevo que pintar. Igual se sabe lo que pasó --ya estaba
	// resuelta--, y el genérico "no se pudo registrar" diría otra cosa.
	if (status == 409) {
		return 'Esta tarjeta ya estaba resuelta. Recargá la conversación para verla como quedó.'
	}
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
 * Desde la misión asistente-masivas-imagenes-y-remito (19/9/2026) la presentación admite
 * cuatro claves OPCIONALES y aditivas (contrato §3): `imagen_url` (miniatura arriba de los
 * renglones), `texto_confirmar` / `texto_cancelar` (etiquetas de los botones) y
 * `texto_cancelada` (texto del cierre 'cancelada'). Sin ellas, la tarjeta se ve exactamente
 * como antes; hoy las manda solo la tarjeta `imagen_categoria`, la que escribe el job de
 * imágenes de categorías cuando encontró una foto pero no está seguro de que corresponda.
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
			// true cuando el <img> de `presentacion.imagen_url` disparó @error: la miniatura
			// se esconde y en su lugar va la línea "No se pudo mostrar la imagen". Vive acá
			// porque es un hecho del navegador, no de la tarjeta: el API no sabe si la URL
			// carga.
			imagen_rota: false,
		}
	},
	watch: {
		/**
		 * Si la tarjeta se redibuja con otra imagen (una versión corregida que llega por
		 * patchAccion), la marca de rota es de la URL anterior y se limpia: hay que darle
		 * la chance a la nueva.
		 */
		imagen_url() {
			this.imagen_rota = false
		},
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
		/**
		 * URL de la miniatura (contrato §3 de asistente-masivas-imagenes-y-remito), o null si
		 * la presentación no trae una: hoy la manda solo la tarjeta `imagen_categoria`. Se
		 * exige un string con algo adentro para que un "" o un null del API no pinten un
		 * <img> vacío con su ícono de roto.
		 */
		imagen_url() {
			let url = this.presentacion.imagen_url
			if (typeof url != 'string' || url.trim() == '') {
				return null
			}
			return url
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
		/**
		 * Texto e ícono del cierre. Para 'cancelada' el API puede mandar su propio texto en
		 * `presentacion.texto_cancelada` (contrato §3: "No usaste esta imagen." para una
		 * imagen de categoría, donde "Cancelaste esta carga." no describe nada que se haya
		 * cargado); sin él, el de siempre. Los otros cierres no cambian.
		 */
		cierre() {
			let cierre = CIERRE_POR_ESTADO[this.accion.estado] || null
			if (!cierre || this.accion.estado != 'cancelada') {
				return cierre
			}
			return {
				texto: this.texto_de_presentacion('texto_cancelada', cierre.texto),
				icono: cierre.icono,
			}
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
		 * true mientras el asistente está generando una respuesta en esta conversación (la de
		 * pantalla: la tarjeta se pinta desde ai_chat.messages). Las tarjetas visibles son
		 * siempre de mensajes anteriores a esa respuesta, que puede traer la corrección de
		 * alguna: hasta que llegue, Confirmar espera (arreglo tras el chequeo independiente).
		 */
		esperando_al_asistente() {
			return this.$store.getters['ai_chat/hay_respuesta_en_curso']
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
		 *
		 * En reposo, la etiqueta la puede mandar el API en `presentacion.texto_confirmar` /
		 * `texto_cancelar` (contrato §3 de asistente-masivas-imagenes-y-remito: "Usar esta
		 * imagen" / "No usarla" para una imagen de categoría). Sin ellas, "Confirmar" /
		 * "Cancelar", como siempre. Los textos en curso no se personalizan: son el estado
		 * del POST, no de la propuesta.
		 */
		texto_confirmar() {
			if (this.verbo_en_curso == 'confirmar') {
				return 'Registrando…'
			}
			return this.texto_de_presentacion('texto_confirmar', 'Confirmar')
		},
		texto_cancelar() {
			if (this.verbo_en_curso == 'cancelar') {
				return 'Cancelando…'
			}
			return this.texto_de_presentacion('texto_cancelar', 'Cancelar')
		},
		/**
		 * Lo que anuncia la región role="status" mientras viaja el POST. En reposo queda vacía:
		 * una región viva se anuncia cuando su texto CAMBIA, así que el texto aparece recién
		 * con el clic.
		 */
		texto_en_curso() {
			if (this.verbo_en_curso == 'confirmar') {
				return 'Registrando…'
			}
			if (this.verbo_en_curso == 'cancelar') {
				return 'Cancelando…'
			}
			return ''
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
		/**
		 * Un texto opcional de `presentacion` (texto_confirmar, texto_cancelar,
		 * texto_cancelada), o el de siempre si el API no lo mandó o lo mandó vacío. Se pide
		 * un string con algo adentro: un "" o un null del API no pueden dejar un botón sin
		 * etiqueta.
		 *
		 * @param {String} clave nombre de la clave en `presentacion`
		 * @param {String} por_defecto texto que va si la clave no está
		 * @returns {String}
		 */
		texto_de_presentacion(clave, por_defecto) {
			let texto = this.presentacion[clave]
			if (typeof texto != 'string' || texto.trim() == '') {
				return por_defecto
			}
			return texto
		},
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
			// Confirmar espera a que responda el asistente (ver esperando_al_asistente); Cancelar no.
			if (verbo == 'confirmar' && this.esperando_al_asistente) {
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
// 🔴 El fondo es --bg-hover + borde. Con la viñeta del asistente de vuelta en --bg-section
// (MessageBubble.vue, misión burbujas-y-negrita-asistente-ia, 21/9/2026), la tarjeta siempre
// cae DENTRO de esa viñeta y el escalón es siempre el mismo, sin importar si el panel que la
// aloja es el flotante o el sidebar del informe del mostrador:
//
//   claro:  tarjeta #f1f3f5 sobre viñeta #f8f9fa · oscuro: tarjeta #3a4048 sobre viñeta #272b31
//
// Los dos grises quedan cerca en claro; ahí el borde --color-border es el que la define. Sin
// sombra: repetida en cada tarjeta, ensuciaría la conversación.
//
// 🔴 Todo se acomoda por el ancho del CONTENEDOR y no del viewport: la misma tarjeta vive en
// el panel flotante (984px por defecto, casi pantalla completa en teléfono) y en el sidebar
// de 380px del informe del mostrador, que es angosto aunque el monitor sea ancho. Una media
// query de pantalla ahí se equivoca. Por eso los renglones son flex-wrap: la etiqueta tiene
// un ancho fijo chico y el valor baja a la línea de abajo cuando no le quedan 140px al lado.
//
// Los 140px no son a ojo. Con los paddings de hoy, al valor le quedan ~150px en el sidebar
// de 380, ~123px en el panel de un teléfono de 360 y ~320px en el panel de escritorio. El
// sidebar da ~150 fijos porque Conversation.vue reserva siempre el lugar de la barra de
// scroll (scrollbar-gutter: stable): sin esa reserva pasaba de ~169px a ~150px en el momento
// en que la conversación empezaba a scrollear, y un umbral entre esos dos números hacía
// saltar los renglones de una a dos líneas. Si cambian los paddings de la viñeta o del
// sidebar, o se saca el gutter, hay que volver a medir.
.asistente-ia-accion
	max-width: 460px
	margin-top: 10px
	padding: 12px 14px
	background: var(--bg-hover, #f1f3f5)
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

	// Miniatura de la imagen candidata (misión asistente-masivas-imagenes-y-remito, 19/9/2026).
	// Se acomoda por el ancho del CONTENEDOR, como todo lo demás de la tarjeta: en el panel de
	// escritorio la tarjeta mide sus 460px de tope, en el sidebar de 380 del mostrador y en un
	// teléfono de 360 queda bastante más angosta, y la foto entra siempre porque su ancho
	// máximo es el 100% de la tarjeta y su alto máximo 160px; la proporción la conserva el
	// navegador (width/height auto) y `object-fit: contain` es la red por si algún día se le
	// fijan las dos medidas. Centrada porque casi siempre es más angosta que la tarjeta.
	//
	// 🔴 El fondo es #fff FIJO, también en modo oscuro, a propósito: es una foto de producto
	// estilo e-commerce, con fondo blanco, y justamente lo que la persona tiene que juzgar es
	// si ese fondo es blanco del todo. Un fondo oscuro atrás disfrazaría un recorte malo. El
	// borde sí sale del token, para que en oscuro la foto no quede flotando sin límite.
	&__imagen
		margin: 8px 0 6px 0
		text-align: center
		line-height: 0
		transition: opacity .15s ease

		img
			display: inline-block
			max-width: 100%
			max-height: 160px
			width: auto
			height: auto
			object-fit: contain
			padding: 4px
			box-sizing: border-box
			background: #fff
			border: 1px solid var(--color-border-secondary, #e9ecef)
			border-radius: 8px

	// La URL no cargó: una línea atenuada donde iba la foto, con el mismo molde ícono + texto
	// del aviso, para que la tarjeta no cambie de forma.
	&__imagen-rota
		display: flex
		align-items: baseline
		gap: 7px
		margin: 8px 0 6px 0
		font-size: .8rem
		line-height: 1.4
		color: var(--color-text-secondary, #6c757d)

		i
			flex-shrink: 0

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

	// Nota "Esperá a que responda el asistente": alineada a la derecha, pegada a los botones,
	// porque habla de Confirmar y no de la tarjeta.
	&__espera
		margin: 0 0 8px 0
		font-size: .8rem
		line-height: 1.4
		text-align: right
		color: var(--color-text-secondary, #6c757d)

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
	// tarjeta queda atenuado --la miniatura también: es parte de lo que se propuso--, y el
	// porqué, abajo, a color pleno para que se lea.
	&--cerrada
		.asistente-ia-accion__renglones, .asistente-ia-accion__aviso, .asistente-ia-accion__imagen
			opacity: .6

@media (prefers-reduced-motion: reduce)
	.asistente-ia-accion__renglones, .asistente-ia-accion__aviso, .asistente-ia-accion__imagen
		transition: none
</style>
