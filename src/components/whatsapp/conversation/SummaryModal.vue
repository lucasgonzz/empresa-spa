<template>
	<b-modal
	id="whatsapp-summary"
	title="Resumen de la conversación"
	hide-footer
	@shown="loadSummary">
		<p
		v-if="loading"
		class="text-center text-muted">
			Generando resumen...
		</p>
		<div v-else>
			<p class="whatsapp-summary__text">
				{{ summary }}
			</p>
			<div class="whatsapp-summary__actions">
				<b-button
				variant="outline-primary"
				size="sm"
				:disabled="!summary"
				@click="copy">
					<i class="bi bi-clipboard"></i>
					Copiar
				</b-button>
			</div>
		</div>
	</b-modal>
</template>
<script>
export default {
	props: {
		chat: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			summary: '',
			loading: false,
		}
	},
	methods: {
		loadSummary() {
			if (!this.chat) {
				return
			}
			this.loading = true
			this.summary = ''
			this.$store.dispatch('whatsapp_chat/summary', this.chat.id)
			.then(summary => {
				this.loading = false
				this.summary = summary
			})
			.catch(err => {
				this.loading = false
				console.log(err)
				this.$toast.error('No se pudo generar el resumen')
			})
		},
		copy() {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(this.summary)
				.then(() => {
					this.$toast.success('Resumen copiado')
				})
				.catch(() => {
					this.$toast.error('No se pudo copiar')
				})
			}
		},
	},
}
</script>
<style lang="sass">
.whatsapp-summary__text
	white-space: pre-wrap
.whatsapp-summary__actions
	display: flex
	justify-content: flex-end
</style>
