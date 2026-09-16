<template>
	<div
	class="whatsapp-dashboard"
	data-tour="whatsapp.tablero">
		<div
		v-for="tarjeta in tarjetas"
		:key="tarjeta.key"
		class="whatsapp-dashboard__tarjeta"
		:class="tarjeta.clase"
		:data-tour="tarjeta.tour">
			<i
			class="whatsapp-dashboard__icono bi"
			:class="tarjeta.icono"></i>
			<div class="whatsapp-dashboard__contenido">
				<span class="whatsapp-dashboard__valor">{{ tarjeta.valor }}</span>
				<span class="whatsapp-dashboard__etiqueta">{{ tarjeta.etiqueta }}</span>
			</div>
		</div>
	</div>
</template>
<script>
/**
 * Tablero fijo del módulo de WhatsApp (misión whatsapp-tablero-clientes, 14/9/2026): tres
 * tarjetas con el estado de la bandeja completa, a la derecha de la lista de chats.
 *
 * Los tres números salen de getters sobre `state.whatsapp_chat.chats` (el mismo array que ya
 * pinta la bandeja) y no de un endpoint propio: `estado_pendiente` ya viaja por chat desde el
 * índice y se mantiene al día en vivo por el broadcast `WhatsappChatUpdated`
 * (`WhatsappChatHelper::attach_estados_pendientes()` / `WhatsappChat::estado_pendiente()` en
 * empresa-api), así que el tablero queda sincronizado solo, sin pedir nada aparte.
 *
 * Desde la misión embeddings-estado-whatsapp-dashboard (15/9/2026) se suman hasta tres tarjetas
 * más con el estado de los embeddings del catálogo (sin generar / desactualizados / generándose),
 * SOLO si el comercio tiene la extensión `whatsapp_ia` (la que habilita que se generen embeddings
 * en primer lugar: sin ella los tres números serían siempre 0/0/0, ruido y no información). A
 * diferencia de las tres primeras, estas SÍ salen de un endpoint propio
 * (GET api/article-embeddings/estado, store `article_embeddings_estado`), porque no hay ningún
 * store de artículos con estos contadores ya cargado en memoria.
 */
export default {
	data() {
		return {
			// Guarda de idempotencia de escuchar_embeddings_terminados(): ver el docblock de ese
			// metodo.
			escuchando_embeddings_terminados: false,
		}
	},
	computed: {
		tarjetas() {
			let tarjetas = [
				{
					key: 'sin_responder',
					icono: 'bi-exclamation-circle-fill',
					etiqueta: 'Sin responder',
					valor: this.$store.getters['whatsapp_chat/chats_sin_responder_count'],
					clase: 'whatsapp-dashboard__tarjeta--sin-responder',
					tour: 'whatsapp.tablero_sin_responder',
				},
				{
					key: 'esperando_aprobacion',
					icono: 'bi-hourglass-split',
					etiqueta: 'Esperando aprobación',
					valor: this.$store.getters['whatsapp_chat/chats_esperando_aprobacion_count'],
					clase: 'whatsapp-dashboard__tarjeta--pendiente',
					tour: 'whatsapp.tablero_esperando_aprobacion',
				},
				{
					key: 'hoy',
					icono: 'bi-chat-dots-fill',
					etiqueta: 'Conversaciones de hoy',
					valor: this.$store.getters['whatsapp_chat/chats_hoy_count'],
					clase: 'whatsapp-dashboard__tarjeta--hoy',
					tour: 'whatsapp.tablero_conversaciones_hoy',
				},
			]

			if (this.hasExtencion('whatsapp_ia') && this.embeddings_estado_cargado) {
				tarjetas = tarjetas.concat([
					{
						key: 'embeddings_sin_generar',
						icono: 'bi-dash-circle',
						etiqueta: 'Artículos sin generar embedding',
						valor: this.$store.state.article_embeddings_estado.sin_generar,
						clase: '',
						tour: 'whatsapp.tablero_embeddings_sin_generar',
					},
					{
						key: 'embeddings_pendiente',
						icono: 'bi-arrow-repeat',
						etiqueta: 'Con embedding desactualizado',
						valor: this.$store.state.article_embeddings_estado.pendiente,
						clase: 'whatsapp-dashboard__tarjeta--pendiente',
						tour: 'whatsapp.tablero_embeddings_pendiente',
					},
					{
						key: 'embeddings_generandose',
						icono: 'bi-cpu-fill',
						etiqueta: 'Generándose ahora',
						valor: this.$store.state.article_embeddings_estado.generandose,
						clase: 'whatsapp-dashboard__tarjeta--hoy',
						tour: 'whatsapp.tablero_embeddings_generandose',
					},
				])
			}

			return tarjetas
		},
		/**
		 * true recién después del primer GET exitoso a article-embeddings/estado. Evita que las
		 * tres tarjetas de embeddings destellen en "0" un instante antes de tener la respuesta
		 * real (las tres primeras no tienen este problema: ya vienen resueltas del store de chats).
		 */
		embeddings_estado_cargado() {
			return this.$store.state.article_embeddings_estado.cargado
		},
	},
	created() {
		if (this.hasExtencion('whatsapp_ia')) {
			this.pedir_estado_embeddings()
		}
	},
	methods: {
		/**
		 * Pide los tres contadores de embeddings y, si hay una tanda generándose, se queda
		 * escuchando el mismo canal que ya usa el toast global de "se generaron N artículos"
		 * (mixins/broadcast.js) para refrescar apenas esa tanda cierre. Es un listener ADICIONAL
		 * sobre el mismo canal/evento, no un reemplazo: Echo permite varios `.listen()` sobre el
		 * mismo canal sin pisarse, así que el toast global sigue saliendo igual.
		 *
		 * A propósito no se hace `Echo.leaveChannel()` si este componente se destruye antes de
		 * que la tanda cierre: ese canal es del mixin global (permanente, dura toda la sesión), y
		 * abandonarlo desde acá se lo cortaría también a él. El costo de no limpiar es una
		 * recarga redundante si el usuario entra y sale de esta pantalla varias veces mientras
		 * una tanda sigue viva -- mismo trade-off que ya acepta el mixin de inventory_performance.
		 *
		 * @returns {Promise}
		 */
		pedir_estado_embeddings() {
			return this.$store.dispatch('article_embeddings_estado/get_estado')
			.then(() => {
				if (this.$store.state.article_embeddings_estado.generandose > 0) {
					this.escuchar_embeddings_terminados()
				}
			})
		},
		/**
		 * Se suscribe una sola vez por montaje del componente, aunque este método se llame de
		 * nuevo (pedir_estado_embeddings() lo vuelve a invocar cada vez que hay una tanda viva,
		 * inclusive desde DENTRO del propio callback de este listener si ya hay una tanda nueva
		 * apenas cierra la anterior): sin la guarda, tandas consecutivas apilarían un `.listen()`
		 * extra por cada una sobre el mismo canal, y una tanda futura dispararía tantos refrescos
		 * como suscripciones acumuladas. Mismo criterio que ya usa mixins/broadcast.js
		 * (`this.embeddings_echo_channel`) para su propio listener permanente sobre este canal.
		 *
		 * @returns {void}
		 */
		escuchar_embeddings_terminados() {
			if (this.escuchando_embeddings_terminados) {
				return
			}
			this.escuchando_embeddings_terminados = true

			// this.owner_id, no this.owner.id: mismo computed que ya usa mixins/broadcast.js
			// para armar este mismo nombre de canal. owner() SI tiene el guard `if (!this.user)`,
			// pero para un empleado devuelve this.user.owner -la relacion-, que puede llegar
			// undefined aunque this.user exista; owner_id() no depende de esa relacion.
			this.Echo.channel('article_embeddings.' + this.owner_id)
			.listen('.ArticleEmbeddingsBatchGenerated', () => {
				this.escuchando_embeddings_terminados = false
				this.pedir_estado_embeddings()
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-dashboard
	height: 100%
	background: var(--wa-panel)
	padding: 24px
	display: grid
	grid-template-columns: repeat(3, 1fr)
	gap: 16px
	align-content: start
	&__tarjeta
		display: flex
		align-items: center
		gap: 14px
		padding: 18px
		border-radius: 12px
		background: var(--bg-hover)
		border: 1px solid var(--wa-borde)
		// Franja de color a la izquierda: mismo lenguaje que el resaltado de fila de ChatRow.vue,
		// para que la tarjeta y las filas que cuenta se lean como una sola cosa.
		border-left: 4px solid transparent
	&__icono
		font-size: 1.6rem
		flex-shrink: 0
	&__contenido
		display: flex
		flex-direction: column
		min-width: 0
	&__valor
		font-size: 1.7rem
		font-weight: 700
		line-height: 1.1
		color: var(--wa-texto)
	&__etiqueta
		font-size: .8rem
		color: var(--color-text-secondary)
		white-space: normal
	// --- Sin responder: rojo ---------------------------------------------------------------
	// Mismo par bg/borde que el resaltado de fila de ChatRow.vue: la tarjeta y las filas que
	// cuenta se leen como una sola cosa, no como dos vocabularios de color distintos.
	&__tarjeta--sin-responder
		background: var(--wa-sin-responder-bg)
		border-left-color: var(--wa-sin-responder-borde)
		.whatsapp-dashboard__icono
			color: var(--wa-sin-responder-borde)
		.whatsapp-dashboard__valor
			color: var(--wa-sin-responder-texto)
	// --- Esperando aprobación: amarillo -----------------------------------------------------
	&__tarjeta--pendiente
		background: var(--wa-pendiente-bg)
		border-left-color: var(--wa-pendiente-borde)
		.whatsapp-dashboard__icono
			color: var(--wa-pendiente-borde)
		.whatsapp-dashboard__valor
			color: var(--wa-pendiente-texto)
	// --- Conversaciones de hoy: verde de la marca -------------------------------------------
	// Sin token de fondo propio (no hace falta uno más): mismo velo translúcido que ya usa
	// ChatRow.vue para la fila activa, sobre --wa-verde.
	&__tarjeta--hoy
		background: rgba(37, 211, 102, .12)
		background: color-mix(in srgb, var(--wa-verde) 12%, transparent)
		border-left-color: var(--wa-verde)
		.whatsapp-dashboard__icono
			color: var(--wa-verde)
		.whatsapp-dashboard__valor
			color: var(--wa-texto)

// Tablet (768-1024px, ver CLAUDE.md — regla de los tres anchos): todavía entran las tres en
// fila, solo se acota el padding para que no se aprieten contra la lista de chats.
@media screen and (max-width: 1024px)
	.whatsapp-dashboard
		padding: 16px
		gap: 10px
		&__tarjeta
			padding: 14px
			gap: 10px
		&__valor
			font-size: 1.4rem

// Teléfono (<768px): la vista se apila (ver views/Whatsapp.vue) y el tablero pasa a ocupar el
// ancho completo arriba de la lista. Tres tarjetas chicas en fila siguen entrando: son número +
// etiqueta corta, no hace falta apilarlas también a ellas.
@media screen and (max-width: 767px)
	.whatsapp-dashboard
		height: auto
		grid-template-columns: repeat(3, 1fr)
		padding: 12px
		gap: 8px
		&__tarjeta
			flex-direction: column
			text-align: center
			padding: 10px 6px
			gap: 4px
		&__icono
			font-size: 1.25rem
		&__valor
			font-size: 1.15rem
		&__etiqueta
			font-size: .68rem
</style>
