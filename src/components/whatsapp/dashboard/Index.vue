<template>
	<div
	class="whatsapp-dashboard"
	data-tour="whatsapp.tablero">
		<header class="whatsapp-dashboard__intro">
			<h2>Resumen de WhatsApp</h2>
			<p>Elegí una conversación en la lista para abrirla acá.</p>
		</header>
		<section v-for="grupo in grupos" :key="grupo.titulo" class="whatsapp-dashboard__grupo">
			<h3>{{ grupo.titulo }}</h3>
			<div class="whatsapp-dashboard__grilla">
				<div
				v-for="tarjeta in grupo.tarjetas"
				:key="tarjeta.key"
				class="whatsapp-dashboard__tarjeta"
				:class="tarjeta.clase"
				:data-tour="tarjeta.tour">
					<i class="whatsapp-dashboard__icono bi" :class="tarjeta.icono" aria-hidden="true"></i>
					<div class="whatsapp-dashboard__contenido">
						<span class="whatsapp-dashboard__valor">{{ tarjeta.valor }}</span>
						<span class="whatsapp-dashboard__etiqueta">{{ tarjeta.etiqueta }}</span>
						<small v-if="tarjeta.detalle" class="whatsapp-dashboard__detalle">{{ tarjeta.detalle }}</small>
					</div>
				</div>
			</div>
		</section>
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
 * Desde la misión senal-pedidos-y-consultas-del-agente (16/10/2026) hay una segunda fila con dos
 * tarjetas violetas: «Pedidos para confirmar» y «Consultas pendientes», los chats donde el agente armó un
 * pedido o prometió «lo consulto y te confirmo» y ninguna persona lo atendió todavía. Salen de
 * `chat.follow_up`, igual que las primeras tres salen de `estado_pendiente`: mismo array, mismo broadcast.
 *
 * Desde la misión embeddings-estado-whatsapp-dashboard (15/9/2026) se suman hasta tres tarjetas
 * más con el estado de los embeddings del catálogo (sin generar / desactualizados / generándose),
 * SOLO si el comercio tiene la extensión `agentes_ia` (la que habilita que se generen embeddings
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
		grupos() {
			return [
				{ titulo: 'Conversaciones', tarjetas: this.tarjetas.slice(0, 3) },
				{ titulo: 'Seguimiento del agente', tarjetas: this.tarjetas.filter(t => ['pedidos_para_confirmar', 'consultas_pendientes'].includes(t.key)) },
				{ titulo: 'Análisis del catálogo', tarjetas: this.tarjetas.filter(t => t.key.startsWith('embeddings_')) },
			].filter(grupo => grupo.tarjetas.length)
		},
		tarjetas() {
			let tarjetas = [
				{
					key: 'sin_responder',
					icono: 'bi-exclamation-circle-fill',
					etiqueta: 'Sin responder',
					detalle: 'El cliente escribió y todavía espera una respuesta.',
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

			// Segunda fila (misión senal-pedidos-y-consultas-del-agente): lo que el agente dejó para que una
			// persona atienda. Mismo vocabulario que el rojo y el amarillo de arriba, en violeta, y anchas (la
			// grilla es de 6 columnas: 3 + 3 acá, 2 + 2 + 2 arriba). Solo si la API ya manda el seguimiento: contra
			// una API vieja mostrarían un «0» engañoso.
			if (this.$store.getters['whatsapp_chat/follow_up_soportado']) {
				tarjetas = tarjetas.concat([
					{
						key: 'pedidos_para_confirmar',
						icono: 'bi-bag-check-fill',
						etiqueta: 'Pedidos para confirmar',
						valor: this.$store.getters['whatsapp_chat/chats_con_pedido_count'],
						clase: 'whatsapp-dashboard__tarjeta--seguimiento',
						tour: 'whatsapp.tablero_pedidos_para_confirmar',
					},
					{
						key: 'consultas_pendientes',
						icono: 'bi-question-circle-fill',
						etiqueta: 'Consultas para retomar',
						detalle: 'El agente respondió y quedó en averiguar algo.',
						valor: this.$store.getters['whatsapp_chat/chats_con_consulta_count'],
						clase: 'whatsapp-dashboard__tarjeta--seguimiento',
						tour: 'whatsapp.tablero_consultas_pendientes',
					},
				])
			}

			if (this.hasExtencion('agentes_ia') && this.embeddings_estado_cargado) {
				tarjetas = tarjetas.concat([
					{
						key: 'embeddings_sin_generar',
						icono: 'bi-dash-circle',
						etiqueta: 'Artículos sin analizar',
						valor: this.$store.state.article_embeddings_estado.sin_generar,
						clase: '',
						tour: 'whatsapp.tablero_embeddings_sin_generar',
					},
					{
						key: 'embeddings_pendiente',
						icono: 'bi-arrow-repeat',
						etiqueta: 'Análisis por actualizar',
						valor: this.$store.state.article_embeddings_estado.pendiente,
						clase: 'whatsapp-dashboard__tarjeta--pendiente',
						tour: 'whatsapp.tablero_embeddings_pendiente',
					},
					{
						key: 'embeddings_generandose',
						icono: 'bi-cpu-fill',
						etiqueta: 'Artículos en análisis',
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
		if (this.hasExtencion('agentes_ia')) {
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
	min-height: 100%
	padding: clamp(14px, 3vw, 38px)
	background: var(--bg-section)
	color: var(--wa-texto)
	&__intro
		margin-bottom: 1.5rem
		h2
			font-size: 1.35rem
			font-weight: 700
		p
			margin: .4rem 0 0
			color: var(--color-text-secondary)
	&__grupo + &__grupo
		margin-top: 1.35rem
	&__grupo h3
		font-size: .95rem
		font-weight: 700
		margin: 0 0 .65rem
	&__grilla
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(125px, 1fr))
		gap: .65rem
	&__tarjeta
		min-width: 0
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: .5rem
		padding: clamp(.65rem, 1.6vw, 1.1rem)
		border-radius: 12px
		border: 1px solid var(--wa-borde)
		background: var(--wa-panel)
	&__icono
		display: inline-grid
		place-items: center
		width: 32px
		height: 32px
		border-radius: 9px
		font-size: .9rem
		color: var(--wa-texto)
		background: var(--wa-hover)
	&__contenido
		display: flex
		flex-direction: column
		min-width: 0
	&__valor
		font-size: 1.5rem
		font-weight: 700
		line-height: 1.2
	&__etiqueta
		font-size: .84rem
		font-weight: 600
		overflow-wrap: anywhere
	&__detalle
		margin-top: .25rem
		line-height: 1.25
		color: var(--color-text-secondary)
	&__tarjeta--sin-responder &__icono
		color: var(--wa-sin-responder-texto)
		background: var(--wa-sin-responder-bg)
	&__tarjeta--pendiente &__icono
		color: var(--wa-pendiente-texto)
		background: var(--wa-pendiente-bg)
	&__tarjeta--hoy &__icono
		color: var(--wa-sender)
		background: var(--wa-burbuja-out)
	&__tarjeta--seguimiento &__icono
		color: var(--wa-seguimiento-texto)
		background: var(--wa-seguimiento-bg)
</style>
