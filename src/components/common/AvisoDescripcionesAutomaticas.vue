<template>
	<div>
		<batch-descriptions-summary-modal
		:visible.sync="batch_summary_visible"
		:batch_result="batch_result"
		@confirmed="on_batch_summary_confirmed"
		@review="on_review_requested"></batch-descriptions-summary-modal>

		<ai-descriptions-review-modal
		:visible.sync="review_modal_visible"
		:initial_items="review_initial_items"></ai-descriptions-review-modal>
	</div>
</template>
<script>
import actualizar_lista_de_articulos from '@/mixins/listado/actualizar_lista_de_articulos'

/**
 * Anfitrión del aviso de "Descripciones inteligentes": se monta en `App.vue` y vive en TODA la
 * aplicación. Es el gemelo de `AvisoImagenesAutomaticas.vue` y existe por el mismo motivo.
 *
 * 🔴 Por qué existe este archivo, que es lo primero que alguien va a querer "simplificar" de
 * vuelta metiendo todo de nuevo adentro del disparador:
 *
 * El disparador es `SearchDescriptionAutomatica.vue`, que vive adentro del dropdown de opciones
 * del listado (`OptionsDropdown.vue`, `v-if="show"` sobre la cantidad de seleccionados). Apenas
 * el lote arranca, el flujo normal del usuario es deseleccionar o cambiar de vista, y ahí el
 * dropdown entero se DESMONTA. El callback de Echo seguía vivo —lo guarda `Vue.prototype.Echo`,
 * que no se destruye con el componente— pero corría sobre una instancia ya destruida: el modal
 * no aparecía nunca, sin error, sin log y sin nada en la consola. Ese era el defecto.
 *
 * Este componente es entonces el DUEÑO ÚNICO de: la suscripción al canal del lote, la marca de
 * "hay un lote en vuelo en esta pestaña", el modal de resumen y la bandeja de revisión. El
 * disparador quedó reducido a pedir el POST y avisar por el bus de `$root`.
 *
 * 🔴 La suscripción es BAJO DEMANDA, no permanente, y la diferencia no es de estilo:
 * `article_batch_descriptions.{id}` es un canal del OWNER, no del usuario. Si este anfitrión se
 * suscribiera siempre —que es lo que hace, por ejemplo, `escuchar_embeddings_generados()` en
 * `mixins/broadcast.js`—, un lote que largó el dueño le abriría un modal en la cara a la cajera
 * que está en Vender. Hoy eso no pasa y no puede empezar a pasar.
 */

/** Evento del bus de `$root` con el que el disparador avisa que encoló un lote. */
const EVENTO_LOTE_INICIADO = 'descripciones-automaticas:lote-iniciado'

/** Canal público del comercio, igual que `article_batch_images.{id}` e `import_status.{id}`. */
const PREFIJO_DEL_CANAL = 'article_batch_descriptions.'

/**
 * Clave de la marca de "esta pestaña está esperando un lote".
 *
 * 🔴 `sessionStorage` y NO `localStorage`, a propósito: es por pestaña y sobrevive al reload,
 * que es exactamente la vida útil de "yo estoy esperando este lote". Con `localStorage`, el lote
 * que largué en una pestaña le abriría el modal a todas las otras pestañas abiertas del mismo
 * comercio. El precedente en el repo es `common-vue/mixins/update_app.js`.
 */
const MARCA_LOTE_EN_VUELO = 'descripciones_automaticas_lote_en_vuelo'

/**
 * Techo de vida de la marca. Pasado esto se descarta sin mirar nada más.
 *
 * Es la red contra un job que murió del lado del servidor: sin techo, esa marca queda para
 * siempre en la pestaña y CADA reload vuelve a abrir una suscripción a un evento que no va a
 * llegar nunca. Dos horas es holgado de sobra para el lote más grande que se puede encolar
 * desde el listado, incluso con el timeout de 10 minutos del job repetido varias veces.
 */
const VENCIMIENTO_DE_LA_MARCA_MS = 2 * 60 * 60 * 1000

export default {
	mixins: [actualizar_lista_de_articulos],
	components: {
		BatchDescriptionsSummaryModal: () => import('@/components/listado/components/selected-filtered-options/BatchDescriptionsSummaryModal'),
		AiDescriptionsReviewModal: () => import('@/components/listado/components/selected-filtered-options/AiDescriptionsReviewModal'),
	},
	data() {
		return {
			/** true mientras esta pestaña espera el aviso de fin de un lote que ella misma largó. */
			esperando: false,
			/**
			 * owner del lote que se está esperando. Se guarda aparte de `owner_id` porque el
			 * rescate del reload lo lee de la marca, y ahí hay que poder comparar contra el owner
			 * de la sesión actual para descartarla si entró otra persona.
			 */
			owner_id_del_lote: null,
			/**
			 * batch_uuid de la corrida que ESTA pestaña largó, tal como lo devolvió el POST.
			 *
			 * 🔴 Es lo único que distingue mi corrida de la de otro. El canal
			 * `article_batch_descriptions.{owner_id}` es PÚBLICO y se nombra por el id del owner:
			 * dos instalaciones con el mismo owner sobre la misma app de Pusher comparten canal
			 * literalmente. Sin este filtro, la pestaña acepta el primer evento que pasa, se da de
			 * baja del canal y se queda esperando para siempre el suyo: las descripciones se
			 * generan bien y el modal no aparece nunca.
			 *
			 * `null` significa "no sé cuál es el mío": pasa contra una API que todavía no
			 * devuelve el campo. Ahí se acepta el primer evento, que es el comportamiento viejo.
			 */
			uuid_esperado: null,
			/** Nombre del canal al que estamos suscritos ahora (null = ninguno). */
			descripciones_echo_channel: null,
			/* Controla visibilidad del modal resumen al recibir el evento Pusher. */
			batch_summary_visible: false,
			/* Payload recibido desde Pusher con el resumen del procesamiento. */
			batch_result: null,
			/* Controla visibilidad de la bandeja de revisión de baja confianza. */
			review_modal_visible: false,
			/**
			 * Items pre-cargados para la bandeja de revisión.
			 *
			 * Hoy queda siempre vacío, y está bien: el payload de Pusher dejó de mandar
			 * `needs_review_items` porque el detalle por artículo no entra en el límite de 10240
			 * bytes de Pusher con lotes grandes (ver `broadcastWith()` de
			 * ArticleBatchDescriptionsProcessed). No se pierde nada: `AiDescriptionsReviewModal`
			 * nunca leyó esta prop — al abrirse pide la bandeja completa a
			 * `GET article-description-ai/pending-review`, que es la única fuente que tiene el
			 * título, el contenido y las fuentes editables. El cableado se deja armado para el
			 * día que el resumen se sirva por HTTP, como ya se hace en imágenes.
			 */
			review_initial_items: [],
		}
	},
	created() {
		this.$root.$on(EVENTO_LOTE_INICIADO, this.on_lote_iniciado)
		this.restaurar_lote_en_vuelo()
	},
	beforeDestroy() {
		// El bus de `$root` es global: sin el `$off`, un remontaje de este anfitrión dejaría dos
		// escuchas vivas y un solo lote abriría dos veces el modal (mismo motivo que el `$off` de
		// `components/client/modals/puntos/Index.vue`). Y el canal de Echo tampoco se suelta solo:
		// lo guarda `Vue.prototype.Echo`, que sobrevive a cualquier componente.
		this.$root.$off(EVENTO_LOTE_INICIADO, this.on_lote_iniciado)
		if (this.descripciones_echo_channel && this.Echo) {
			this.Echo.leaveChannel(this.descripciones_echo_channel)
			this.descripciones_echo_channel = null
		}
	},
	watch: {
		/**
		 * 🔴 Sin este watch el rescate del reload no funcionaría NUNCA, y el modo de falla sería
		 * silencioso: este componente se crea con `App.vue`, mucho antes de que resuelva
		 * `auth/me`, así que en el `created()` que lee la marca `owner_id` todavía vale `null` y
		 * no hay canal que armar. Recién cuando el usuario resuelve se puede suscribir.
		 *
		 * Es el mismo motivo por el que `whatsapp/SidebarHost.vue` y
		 * `asistente-ia/FloatingButton.vue` miran `user.id`.
		 */
		owner_id() {
			this.sincronizar_suscripcion()
		},
	},
	methods: {
		/**
		* El disparador (`SearchDescriptionAutomatica.vue`) encoló un lote: a partir de acá esta
		* pestaña espera el aviso de fin.
		*
		* @param {String} batch_uuid UUID de la corrida que devolvió el POST (puede venir null).
		* @return {void}
		*/
		on_lote_iniciado(batch_uuid) {
			this.esperando = true
			this.owner_id_del_lote = this.owner_id
			this.uuid_esperado = batch_uuid || null
			this.recordar_lote_en_vuelo()
			this.sincronizar_suscripcion()
		},
		/**
		* Deja la suscripción a Echo igual a lo que corresponde ahora mismo: el canal del owner
		* si hay un lote en vuelo, y ningún canal si no.
		*
		* Las tres reglas de acá abajo son las mismas que ya están escritas en
		* `mixins/broadcast.js`, `whatsapp/SidebarHost.vue` y `asistente-ia/FloatingButton.vue`.
		*
		* 🔴 `leaveChannel(nombre)` y NO `leave(nombre)`: el canal es PÚBLICO, y `leave()`
		* intentaría abandonar además `private-<nombre>` y `presence-<nombre>`, que no existen.
		*
		* @return {void}
		*/
		sincronizar_suscripcion() {
			if (!this.Echo) {
				return
			}

			// Si en esta pestaña se cerró sesión y entró alguien de OTRO comercio, el lote que
			// dejó la marca no es de este owner: se descarta antes de armar nada. Se exige
			// `this.owner_id` para no descartar mientras `auth/me` todavía no resolvió, que es
			// justo el momento en el que corre el rescate del reload.
			if (this.esperando && this.owner_id && this.owner_id_del_lote && this.owner_id_del_lote != this.owner_id) {
				this.olvidar_lote_en_vuelo()
			}

			let canal = (this.esperando && this.owner_id)
				? PREFIJO_DEL_CANAL + this.owner_id
				: null

			// Guarda de doble suscripción: acá se entra desde el bus, desde el rescate y desde el
			// watch de `owner_id`, y más de una de esas puede pedir el mismo canal.
			if (this.descripciones_echo_channel === canal) {
				return
			}
			// 🔴 El leaveChannel va ANTES del corte por "no hay canal nuevo", no después: si no,
			// dejar de esperar (o cambiar de comercio) dejaría viva la suscripción anterior.
			if (this.descripciones_echo_channel) {
				this.Echo.leaveChannel(this.descripciones_echo_channel)
			}
			this.descripciones_echo_channel = canal
			if (!canal) {
				return
			}

			/*
				Va con `.listen('.ArticleBatchDescriptionsProcessed')`, CON el punto inicial: lo
				que viaja es un ShouldBroadcastNow con broadcastAs, no una notificación de Laravel.
				Un `.notification()` acá no recibiría NADA NUNCA y sin ningún error a la vista
				(la trampa está documentada en `src/mixins/broadcast.js`).
			*/
			this.Echo.channel(canal)
			.listen('.ArticleBatchDescriptionsProcessed', (payload) => {
				this.on_lote_terminado(payload)
			})
		},
		/**
		* Llegó el aviso de fin del lote: se deja de esperar, se suelta el canal y se abre el
		* resumen.
		*
		* @param {Object} payload Payload recibido por Pusher.
		* @return {void}
		*/
		on_lote_terminado(payload) {
			/*
				🔴 Si el evento es de OTRA corrida, se ignora y se sigue escuchando.

				No alcanza con no abrir el modal: lo importante es NO soltar el canal, porque el
				aviso propio todavía no llegó. Ese era exactamente el bug — la pestaña se daba de
				baja con el primer evento que pasaba, viniera de donde viniera.

				Con `uuid_esperado` en null (API sin desplegar) se acepta el primero, que es el
				comportamiento de siempre: preferimos el modal de otro antes que ningún modal.
			*/
			if (this.uuid_esperado && payload && payload.batch_uuid
				&& payload.batch_uuid !== this.uuid_esperado) {
				return
			}

			this.olvidar_lote_en_vuelo()
			this.sincronizar_suscripcion()
			this.open_summary(payload)
		},
		/**
		* Escribe la marca de "esta pestaña está esperando un lote", para que un F5 en el medio
		* no se coma el aviso.
		*
		* @return {void}
		*/
		recordar_lote_en_vuelo() {
			try {
				sessionStorage.setItem(MARCA_LOTE_EN_VUELO, JSON.stringify({
					iniciado_en: Date.now(),
					owner_id: this.owner_id,
					// El uuid viaja en la marca porque sin él, después de un F5, la pestaña
					// volvería a aceptar el primer evento que pase: justo el bug que esto arregla.
					uuid_esperado: this.uuid_esperado,
				}))
			} catch (e) {
				// sessionStorage puede estar deshabilitado (modo privado de algunos navegadores).
				// Lo único que se pierde es el rescate ante un reload, no el aviso de esta carga.
			}
		},
		/**
		* Borra la marca y apaga la espera. Es lo que corre tanto al recibir el aviso como al
		* descartar una marca vencida o de otro comercio.
		*
		* @return {void}
		*/
		olvidar_lote_en_vuelo() {
			this.esperando = false
			this.owner_id_del_lote = null
			this.uuid_esperado = null
			try {
				sessionStorage.removeItem(MARCA_LOTE_EN_VUELO)
			} catch (e) {
				// Ver el comentario de recordar_lote_en_vuelo().
			}
		},
		/**
		* Rescate del reload: si esta pestaña había largado un lote antes de recargarse, vuelve
		* a ponerse a esperar. La suscripción en sí la termina de armar el watch de `owner_id`,
		* porque acá el usuario todavía no resolvió.
		*
		* @return {void}
		*/
		restaurar_lote_en_vuelo() {
			let crudo = null
			try {
				crudo = sessionStorage.getItem(MARCA_LOTE_EN_VUELO)
			} catch (e) {
				return
			}
			if (!crudo) {
				return
			}

			let marca = null
			try {
				marca = JSON.parse(crudo)
			} catch (e) {
				marca = null
			}

			if (!marca || !marca.iniciado_en || (Date.now() - marca.iniciado_en) > VENCIMIENTO_DE_LA_MARCA_MS) {
				this.olvidar_lote_en_vuelo()
				return
			}

			this.esperando = true
			this.owner_id_del_lote = marca.owner_id || null
			this.uuid_esperado = marca.uuid_esperado || null
			this.sincronizar_suscripcion()
		},
		/**
		* Setea el resultado del batch y recién entonces muestra el modal, para que se monte ya
		* con los datos definitivos.
		*
		* @param {Object} batch_result Resumen recibido por Pusher.
		* @return {void}
		*/
		open_summary(batch_result) {
			this.batch_result = batch_result
			this.batch_summary_visible = true
		},
		/**
		* Al confirmar el modal resumen, actualiza el listado si la ruta activa es article.
		*
		* @return {void}
		*/
		on_batch_summary_confirmed() {
			if (!this.is_on_article_list_view()) {
				return
			}
			this.get_ultimos_articulos_actualizados()
		},
		/**
		* Abre la bandeja de revisión. Los items que llegan acá son solo una pista: la bandeja
		* siempre se recarga sola desde el backend al mostrarse (ver `review_initial_items`).
		*
		* @param {Array} needs_review_items Items pendientes de revisión, si el payload los trajo.
		* @return {void}
		*/
		on_review_requested(needs_review_items) {
			this.review_initial_items = needs_review_items || []
			this.review_modal_visible = true
		},
		/**
		* Indica si la ruta activa es el listado de artículos.
		*
		* @return {Boolean}
		*/
		is_on_article_list_view() {
			return this.$route && this.$route.name === 'article'
		},
	},
}
</script>
