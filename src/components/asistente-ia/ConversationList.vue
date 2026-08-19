<template>
	<div class="asistente-ia-lista">
		<!-- Botón grande de conversación nueva, arriba de todo (pedido de Lucas). -->
		<div class="asistente-ia-lista__cabecera">
			<b-button
			block
			variant="primary"
			@click="nueva_conversacion">
				<i class="bi bi-plus-lg"></i>
				Nueva conversación
			</b-button>
		</div>

		<div class="asistente-ia-lista__scroll">
			<p
			v-if="loading && !conversations.length"
			class="asistente-ia-lista__aviso">
				Cargando conversaciones...
			</p>
			<p
			v-else-if="!conversations.length"
			class="asistente-ia-lista__aviso">
				Todavía no hay conversaciones. Escribile al asistente y arranca la primera.
			</p>
			<button
			v-for="conversation in conversations"
			:key="conversation.id"
			type="button"
			class="asistente-ia-lista__item"
			:class="{ 'asistente-ia-lista__item--activa': conversation.id == selected_conversation_id }"
			@click="seleccionar(conversation)">
				<!-- Título en UNA línea con ellipsis (como Claude); sin título todavía,
				se muestra el provisorio (D20). -->
				<span class="asistente-ia-lista__titulo">
					{{ conversation.titulo || 'Nueva conversación' }}
				</span>
				<span
				class="asistente-ia-lista__borrar"
				title="Borrar conversación"
				@click.stop="confirmar_borrado(conversation)">
					<i class="bi bi-trash3"></i>
				</span>
			</button>
		</div>
	</div>
</template>

<script>
export default {
	computed: {
		conversations() {
			return this.$store.state.ai_chat.conversations
		},
		loading() {
			return this.$store.state.ai_chat.loading_conversations
		},
		selected_conversation_id() {
			return this.$store.state.ai_chat.selected_conversation_id
		},
	},
	methods: {
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
		 */
		confirmar_borrado(conversation) {
			let self = this
			this.$bvModal.msgBoxConfirm('¿Borrás esta conversación? Los mensajes se pierden y no se puede deshacer.', {
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
.asistente-ia-lista
	flex: 1
	min-height: 0
	display: flex
	flex-direction: column

	&__cabecera
		flex-shrink: 0
		padding: 12px

	&__scroll
		flex: 1
		min-height: 0
		overflow-y: auto
		padding: 0 8px 12px 8px

	&__aviso
		font-size: .85rem
		color: var(--color-text-secondary, #6c757d)
		text-align: center
		padding: 14px 10px
		margin: 0

	&__item
		width: 100%
		display: flex
		align-items: center
		gap: 6px
		border: none
		background: transparent
		color: var(--color-text-primary, #212529)
		text-align: left
		padding: 9px 10px
		border-radius: 8px
		margin-bottom: 2px
		transition: background .15s ease

		&:hover
			background: var(--bg-hover, #f1f3f5)

		// La basurita aparece recién al pasar por encima (y siempre en la activa),
		// para que la lista se lea limpia.
		&:hover .asistente-ia-lista__borrar
			opacity: 1

		&--activa
			background: var(--bg-hover, #f1f3f5)
			font-weight: 600

			.asistente-ia-lista__borrar
				opacity: 1

	&__titulo
		flex: 1
		min-width: 0
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis
		font-size: .9rem

	&__borrar
		flex-shrink: 0
		width: 26px
		height: 26px
		border-radius: 6px
		display: flex
		align-items: center
		justify-content: center
		color: var(--color-text-secondary, #6c757d)
		opacity: 0
		transition: opacity .15s ease, background .15s ease, color .15s ease

		&:hover
			background: var(--btn-peligro-fondo, #fdf3f2)
			color: var(--btn-peligro-texto, #9c3a36)

@media (prefers-reduced-motion: reduce)
	.asistente-ia-lista__item,
	.asistente-ia-lista__borrar
		transition: none

// En pantalla táctil no hay hover: la basurita queda siempre visible.
@media (hover: none)
	.asistente-ia-lista__borrar
		opacity: 1
</style>
