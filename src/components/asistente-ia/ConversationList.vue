<template>
	<!-- La barra lateral de ia-spa (sidebar/BarraLateral.vue), con lo que la ventana ya hacía:
	arriba la cara del agente (el logo del negocio); en el medio las conversaciones agrupadas por
	fecha como ChatGPT; abajo de todo "Nuevo chat", el consumo del mes (PanelFooter) y la fila de
	la persona con el engranaje de la configuración (S3, acceso 1). Misión agente-mejoras-uso-real,
	29/10/2026. -->
	<div class="asistente-ia-lista">
		<div class="asistente-ia-lista__arriba">
			<span
			class="asistente-ia-lista__logo"
			aria-hidden="true">
				<img
				v-if="logo_url"
				:src="logo_url"
				alt="">
				<i
				v-else
				class="bi bi-robot"></i>
			</span>
			<span class="asistente-ia-lista__marca">Tu asistente</span>
			<!-- En el cajón del teléfono, la cruz que lo cierra (el telón también lo cierra). -->
			<button
			v-if="es_cajon"
			type="button"
			class="asistente-ia-lista__boton"
			title="Cerrar"
			aria-label="Cerrar la lista de conversaciones"
			@click="$emit('cerrar')">
				<icono nombre="cerrar"></icono>
			</button>
		</div>

		<nav
		class="asistente-ia-lista__scroll"
		aria-label="Conversaciones">
			<p
			v-if="loading && !conversations.length"
			class="asistente-ia-lista__aviso">
				Cargando conversaciones...
			</p>
			<!-- El fallo de la carga va ANTES del "todavía no hay conversaciones": los dos
			dejan la lista vacía y sin esto se veían iguales (ver `error_conversations` en
			store/ai_chat.js). Si ya hay conversaciones en pantalla no se muestra: son las
			de la carga anterior y siguen sirviendo. -->
			<p
			v-else-if="error && !conversations.length"
			class="asistente-ia-lista__aviso asistente-ia-lista__aviso--error">
				{{ error }}
			</p>
			<p
			v-else-if="!conversations.length"
			class="asistente-ia-lista__aviso">
				Todavía no hay conversaciones. Escribile al asistente y arranca la primera.
			</p>
			<template v-else>
				<section
				v-for="grupo in grupos"
				:key="grupo.clave"
				class="asistente-ia-lista__grupo">
					<h2 class="asistente-ia-lista__titulo-grupo">{{ grupo.titulo }}</h2>
					<div
					v-for="conversation in grupo.items"
					:key="conversation.id"
					class="asistente-ia-lista__item"
					:class="{ 'asistente-ia-lista__item--activa': conversation.id == selected_conversation_id }">
						<button
						type="button"
						class="asistente-ia-lista__enlace"
						:aria-current="conversation.id == selected_conversation_id ? 'page' : null"
						@click="seleccionar(conversation)">
							<!--
								Las conversaciones que arrancaron por WhatsApp se distinguen con el ícono
								(misión asistente-por-whatsapp, 16/9/2026). Son la MISMA conversación: se
								leen y se sigue escribiendo desde acá como cualquier otra, y no hay pantalla
								nueva. El ícono existe para que el dueño entienda por qué aparece en la lista
								algo que él no escribió en esta pantalla.

								Una SPA vieja contra el API nuevo las ve como conversaciones comunes, sin
								ícono, que es la degradación correcta.
							-->
							<span
							v-if="conversation.origen == 'whatsapp'"
							class="asistente-ia-lista__canal"
							title="Esta conversación la empezaste por WhatsApp">
								<icono
								nombre="whatsapp"
								:tamano="14"></icono>
							</span>
							<!-- Título en UNA línea con ellipsis (como ChatGPT); sin título todavía,
							se muestra el provisorio (D20). -->
							<span class="asistente-ia-lista__titulo">{{ conversation.titulo || 'Nueva conversación' }}</span>
						</button>
						<!-- 🔴 Hermano del botón de la conversación y no hijo: un <button> adentro de
						otro <button> no es HTML válido, y el navegador lo saca afuera al parsear. -->
						<button
						type="button"
						class="asistente-ia-lista__borrar"
						title="Borrar conversación"
						:aria-label="'Borrar la conversación ' + (conversation.titulo || 'Nueva conversación')"
						@click.stop="confirmar_borrado(conversation)">
							<icono
							nombre="borrar"
							:tamano="17"></icono>
						</button>
					</div>
				</section>
			</template>
		</nav>

		<div class="asistente-ia-lista__abajo">
			<button
			type="button"
			class="asistente-ia-lista__nueva"
			@click="nueva_conversacion">
				<icono
				nombre="nuevo"
				:tamano="20"></icono>
				<span>Nuevo chat</span>
			</button>

			<!-- El consumo del mes y el modo de pensamiento (S2). Se dibuja solo si el API trae
			el consumo (degradación limpia). -->
			<panel-footer></panel-footer>

			<div class="asistente-ia-lista__usuario">
				<span
				class="asistente-ia-lista__avatar"
				aria-hidden="true">{{ iniciales_de_la_persona }}</span>
				<span class="asistente-ia-lista__quien">
					<span class="asistente-ia-lista__nombre">{{ nombre_de_la_persona }}</span>
					<span
					v-if="nombre_del_negocio"
					class="asistente-ia-lista__negocio">{{ nombre_del_negocio }}</span>
				</span>
				<button
				type="button"
				class="asistente-ia-lista__boton"
				title="Configurar el asistente"
				aria-label="Configurar el asistente"
				@click="abrir_configuracion">
					<icono nombre="engranaje"></icono>
				</button>
			</div>
		</div>
	</div>
</template>

<script>
import Icono from '@/components/asistente-ia/Icono'
import { logo_del_negocio, iniciales } from '@/components/asistente-ia/identidad'

/**
 * Los meses para el título de los grupos viejos («Agosto», «Mayo de 2025»), como ia-spa.
 */
const MESES = [
	'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
	'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Milisegundos de un día, para contar días entre fechas.
 */
const DIA = 86400000

/**
 * Las 00:00 del día de una fecha, en ms.
 *
 * @param {Date} fecha
 * @returns {Number}
 */
function inicio_del_dia(fecha) {
	return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()
}

/**
 * Una fecha del API pasada a Date, o null si no se entiende.
 *
 * 🔴 `last_message_at` llega CRUDO de la base, «AAAA-MM-DD HH:MM:SS» (el modelo no lo castea), y
 * `new Date()` con ese formato --fecha y hora separadas por un espacio-- no es estándar: Chrome lo
 * entiende, pero Safari viejo (iPhone con iOS < 15, el de muchos dueños) devuelve Invalid Date y
 * toda la bandeja caía en el grupo más viejo. Por eso ese formato se arma a mano con sus números,
 * en hora local (es la hora del negocio, la misma que la del navegador). Lo demás (los ISO de
 * `created_at` / `updated_at`, o el `toISOString()` que pone el store al mandar) va por `Date`,
 * que esos sí los entiende cualquier navegador.
 *
 * @param {String|null} crudo
 * @returns {Date|null}
 */
function fecha_del_api(crudo) {
	if (!crudo) {
		return null
	}
	let texto = String(crudo).trim()
	let partes = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(texto)
	let fecha = null
	if (partes) {
		fecha = new Date(
			Number(partes[1]),
			Number(partes[2]) - 1,
			Number(partes[3]),
			Number(partes[4] || 0),
			Number(partes[5] || 0),
			Number(partes[6] || 0)
		)
	} else {
		fecha = new Date(texto)
	}
	return isNaN(fecha.getTime()) ? null : fecha
}

/**
 * La fecha que ubica a una conversación en un grupo: su último mensaje, o cuándo se creó (una
 * conversación recién creada todavía no tiene `last_message_at`). Sin ninguna de las dos, el
 * 1/1/1970: cae en el grupo más viejo en vez de romper el agrupado.
 *
 * @param {Object} conversation
 * @returns {Date}
 */
function fecha_de_conversacion(conversation) {
	let crudo = (conversation && (conversation.last_message_at || conversation.updated_at || conversation.created_at)) || null
	return fecha_del_api(crudo) || new Date(0)
}

export default {
	components: {
		Icono,
		PanelFooter: () => import('@/components/asistente-ia/PanelFooter'),
	},
	props: {
		/**
		 * true cuando la lista es el cajón del teléfono (Panel.vue bajo 768px): ahí lleva la cruz
		 * para cerrarlo, como el cajón de ia-spa.
		 */
		es_cajon: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		conversations() {
			return this.$store.state.ai_chat.conversations
		},
		loading() {
			return this.$store.state.ai_chat.loading_conversations
		},
		error() {
			return this.$store.state.ai_chat.error_conversations
		},
		selected_conversation_id() {
			return this.$store.state.ai_chat.selected_conversation_id
		},
		/**
		 * Las conversaciones en grupos por fecha, como la barra lateral de ChatGPT e ia-spa
		 * (lib/fechas.js::agrupar_conversaciones): Hoy · Ayer · 7 días anteriores · 30 días
		 * anteriores · y de ahí por mes.
		 *
		 * No se reordena nada: la bandeja ya viene ordenada por `last_message_at` (el backend y
		 * `upsertConversation` del store), y cada grupo nace la primera vez que una conversación
		 * cae en él, así que los grupos salen en orden y adentro conservan el de la bandeja.
		 *
		 * @returns {Array<{clave: String, titulo: String, items: Array<Object>}>}
		 */
		grupos() {
			let ahora = new Date()
			let hoy = inicio_del_dia(ahora)
			let grupos = []
			let por_clave = {}

			function grupo(clave, titulo) {
				if (!por_clave[clave]) {
					por_clave[clave] = { clave: clave, titulo: titulo, items: [] }
					grupos.push(por_clave[clave])
				}
				return por_clave[clave]
			}

			this.conversations.forEach(function (conversation) {
				let fecha = fecha_de_conversacion(conversation)
				let dias = Math.round((hoy - inicio_del_dia(fecha)) / DIA)
				if (dias <= 0) {
					grupo('hoy', 'Hoy').items.push(conversation)
				} else if (dias === 1) {
					grupo('ayer', 'Ayer').items.push(conversation)
				} else if (dias <= 7) {
					grupo('7', '7 días anteriores').items.push(conversation)
				} else if (dias <= 30) {
					grupo('30', '30 días anteriores').items.push(conversation)
				} else {
					let mismo_anio = fecha.getFullYear() === ahora.getFullYear()
					let titulo = MESES[fecha.getMonth()] + (mismo_anio ? '' : ' de ' + fecha.getFullYear())
					grupo('m-' + fecha.getFullYear() + '-' + fecha.getMonth(), titulo).items.push(conversation)
				}
			})
			return grupos
		},
		/**
		 * La cara del agente: el logo del negocio, el mismo del botón flotante (D37).
		 *
		 * @returns {String|null}
		 */
		logo_url() {
			return logo_del_negocio(this.user)
		},
		nombre_de_la_persona() {
			return this.user && this.user.name ? this.user.name : 'Dueño'
		},
		iniciales_de_la_persona() {
			return iniciales(this.user)
		},
		/**
		 * El nombre del negocio debajo del de la persona, como la fila del usuario de ia-spa.
		 * Mismo orden de búsqueda que el texto alternativo del botón flotante.
		 *
		 * @returns {String}
		 */
		nombre_del_negocio() {
			if (this.owner && this.owner.company_name) {
				return this.owner.company_name
			}
			if (this.user && this.user.company_name) {
				return this.user.company_name
			}
			return ''
		},
	},
	methods: {
		/**
		 * Abre el modal de configuración del agente (S3, acceso 1). El modal está montado
		 * una sola vez en el botón flotante; acá solo se lo dispara por id.
		 */
		abrir_configuracion() {
			this.$bvModal.show('configuracion-agente')
		},
		/**
		 * Deja el panel parado en una conversación en blanco. La conversación real
		 * se crea recién al enviar el primer mensaje (sendMessage se encarga), así
		 * apretar el botón dos veces no deja conversaciones vacías en la bandeja.
		 */
		nueva_conversacion() {
			this.$store.commit('ai_chat/setSelectedConversationId', null)
			this.$store.commit('ai_chat/setMessages', [])
			this.$emit('select')
		},
		seleccionar(conversation) {
			if (conversation.id != this.selected_conversation_id) {
				this.$store.commit('ai_chat/setSelectedConversationId', conversation.id)
			}
			this.$emit('select')
		},
		/**
		 * Confirmación antes de borrar: una lista que solo crece es un defecto, pero
		 * un borrado sin aviso es uno peor (los mensajes se pierden en el backend).
		 *
		 * 🔴 El `id` del cuadro no decora: BootstrapVue le pone al div externo de cada modal un
		 * z-index inline (~1040) que lo deja DETRÁS del panel del chat (overlay 1055), y el cuadro
		 * quedaba abierto pero tapado. Con el id fijo, la regla del <style> lo sube al escalón de
		 * los modales que se abren desde el chat (ver CuentaCorrienteDeMencion.vue).
		 */
		confirmar_borrado(conversation) {
			let self = this
			this.$bvModal.msgBoxConfirm('¿Borrás esta conversación? Los mensajes se pierden y no se puede deshacer.', {
				id: 'asistente-ia-borrar-conversacion',
				title: 'Borrar conversación',
				okTitle: 'Borrar',
				okVariant: 'danger',
				cancelTitle: 'Cancelar',
				centered: true,
			})
				.then(confirmado => {
					if (confirmado) {
						self.$store.dispatch('ai_chat/deleteConversation', conversation.id)
							.catch(err => {
								console.log(err)
								self.$toast.error('No se pudo borrar la conversación')
							})
					}
				})
				.catch(err => {
					console.log(err)
				})
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_mixins'

.asistente-ia-lista
	flex: 1
	min-height: 0
	display: flex
	flex-direction: column

	// Arriba de la barra, a la altura del encabezado de la conversación (52px).
	&__arriba
		flex-shrink: 0
		min-height: var(--ia-alto-encabezado)
		display: flex
		align-items: center
		gap: 10px
		padding: 8px 8px 6px 12px

	// El logo del negocio en un círculo, como el avatar del agente en cada respuesta.
	&__logo
		flex-shrink: 0
		width: 30px
		height: 30px
		border-radius: 50%
		border: 1px solid var(--ia-borde)
		background: var(--ia-bg)
		color: var(--ia-primario)
		font-size: 15px
		display: inline-flex
		align-items: center
		justify-content: center
		overflow: hidden

		img
			width: 100%
			height: 100%
			object-fit: cover
			display: block

	&__marca
		flex: 1
		min-width: 0
		font-size: .95rem
		font-weight: 500
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__boton
		+asistente-ia-boton-icono

	&__scroll
		flex: 1
		min-height: 0
		overflow-y: auto
		overscroll-behavior: contain
		padding: 4px 0 12px 0

	&__aviso
		font-size: .86rem
		line-height: 1.5
		color: var(--ia-texto-3)
		padding: 0
		margin: 12px 16px

		// El aviso de fallo se lee distinto del de "todavía no hay conversaciones".
		&--error
			color: var(--ia-peligro)

	&__grupo + &__grupo
		margin-top: 14px

	// El título del grupo ("Hoy", "Ayer"…) queda pegado arriba mientras se scrollea su grupo.
	&__titulo-grupo
		position: sticky
		top: 0
		z-index: 1
		margin: 0
		padding: 6px 16px
		font-family: inherit
		font-size: .75rem
		font-weight: 600
		line-height: 1.5
		color: var(--ia-texto-3)
		background: var(--ia-bg-barra)

	// Un chat de la lista (sidebar/ItemConversacion.vue de ia-spa): el renglón entero se tiñe al
	// pasar y el activo queda un escalón más oscuro.
	&__item
		position: relative
		display: flex
		align-items: center
		margin: 0 6px
		border-radius: 10px

		&:hover
			background: var(--ia-bg-hover)

		&--activa, &--activa:hover
			background: var(--ia-bg-activo)

		// La basurita aparece recién al pasar por encima (y siempre en la activa), para que la
		// lista se lea limpia; mientras se ve, el título le deja su lugar.
		&:hover, &--activa
			.asistente-ia-lista__borrar
				opacity: 1

			.asistente-ia-lista__enlace
				padding-right: 36px

	&__enlace
		flex: 1
		min-width: 0
		display: flex
		align-items: center
		gap: 8px
		min-height: 38px
		padding: 8px 10px
		border: 0
		border-radius: 10px
		background: transparent
		color: var(--ia-texto)
		font-family: inherit
		font-size: .9rem
		text-align: left
		cursor: pointer

		&:focus
			outline: none

		&:focus-visible
			outline: 2px solid var(--ia-foco)
			outline-offset: -2px

	// El ícono del canal (hoy solo WhatsApp), en el verde de WhatsApp como en ia-spa.
	&__canal
		flex-shrink: 0
		display: inline-flex
		color: var(--ia-whatsapp)
		opacity: .9

	&__titulo
		flex: 1
		min-width: 0
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__borrar
		+asistente-ia-boton-icono(30px, 8px)
		position: absolute
		right: 4px
		top: 50%
		transform: translateY(-50%)
		opacity: 0
		transition: opacity var(--ia-transicion), background var(--ia-transicion), color var(--ia-transicion)

		&:focus-visible
			opacity: 1

		&:hover:not(:disabled)
			background: var(--ia-peligro-tinte)
			color: var(--ia-peligro)

	// Abajo de todo, separado por una raya fina, como ia-spa.
	&__abajo
		flex-shrink: 0
		display: flex
		flex-direction: column
		gap: 4px
		padding: 8px 8px 10px 8px
		border-top: 1px solid var(--ia-borde)

	&__nueva
		display: flex
		align-items: center
		gap: 10px
		width: 100%
		min-height: 42px
		padding: 8px 10px
		border: 0
		border-radius: 10px
		background: transparent
		color: var(--ia-texto)
		font-family: inherit
		font-size: .92rem
		font-weight: 500
		text-align: left
		cursor: pointer
		transition: background var(--ia-transicion)

		&:hover
			background: var(--ia-bg-hover)

		&:focus
			outline: none

		&:focus-visible
			outline: 2px solid var(--ia-foco)
			outline-offset: -2px

	&__usuario
		display: flex
		align-items: center
		gap: 10px
		min-width: 0
		padding: 6px 4px 4px 8px
		border-radius: 10px

	// Las iniciales de la persona en el degradé de la marca, como ia-spa.
	&__avatar
		flex-shrink: 0
		width: 32px
		height: 32px
		border-radius: 50%
		display: inline-flex
		align-items: center
		justify-content: center
		font-size: .78rem
		font-weight: 600
		color: #fff
		background: var(--ia-degrade)

	&__quien
		flex: 1
		min-width: 0
		display: flex
		flex-direction: column
		line-height: 1.25

	&__nombre, &__negocio
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__nombre
		font-size: .9rem
		font-weight: 500

	&__negocio
		font-size: .78rem
		color: var(--ia-texto-3)

// En pantalla táctil no hay hover: la basurita queda siempre visible (y el título le deja lugar).
@media (hover: none)
	.asistente-ia-lista__borrar
		opacity: 1

	.asistente-ia-lista__enlace
		padding-right: 36px

@media (prefers-reduced-motion: reduce)
	.asistente-ia-lista__nueva, .asistente-ia-lista__borrar
		transition: none

// 🔴 El cuadro de "¿Borrás esta conversación?" se abre desde ADENTRO del panel del chat, así que
// tiene que ganarle al overlay (1055). Mismo escalón que el modal de cuenta corriente y la
// configuración del agente (1066, ver CuentaCorrienteDeMencion.vue y ConfiguracionAgente.vue): los
// tres no se abren a la vez, porque el telón de cualquiera tapa el botón que abriría otro, y los
// toasts (1067) siguen arriba. El id lo arma BootstrapVue a partir del `id` del msgBoxConfirm.
#asistente-ia-borrar-conversacion___BV_modal_outer_
	z-index: 1066 !important
</style>
