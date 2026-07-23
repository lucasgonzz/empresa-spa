<template>
	<b-modal
	id="whatsapp-config"
	title="Configuración de WhatsApp"
	hide-footer
	size="lg"
	@shown="onShown">
		<!-- Selector simple de sección (no hay b-tabs en el resto del proyecto, se sigue el
		mismo criterio de botones que usan otras pantallas del sistema). -->
		<div class="whatsapp-config__tabs">
			<b-button
			:variant="tab == 'agente' ? 'primary' : 'outline-secondary'"
			size="sm"
			@click="tab = 'agente'">
				<i class="bi bi-robot"></i>
				Agente
			</b-button>
			<b-button
			:variant="tab == 'plantillas' ? 'primary' : 'outline-secondary'"
			size="sm"
			@click="tab = 'plantillas'">
				<i class="bi bi-chat-square-text"></i>
				Plantillas
			</b-button>
		</div>

		<agent-config
		v-if="tab == 'agente'"></agent-config>

		<templates
		v-else></templates>
	</b-modal>
</template>
<script>
import AgentConfig from '@/components/whatsapp/config/AgentConfig'
import Templates from '@/components/whatsapp/config/Templates'
export default {
	components: {
		AgentConfig,
		Templates,
	},
	data() {
		return {
			// Sección activa dentro del modal de configuración: 'agente' | 'plantillas'.
			tab: 'agente',
		}
	},
	methods: {
		/**
		 * Al abrir el modal, carga (o recarga) la configuración del agente. El catálogo de
		 * plantillas ya se carga una vez al entrar al módulo (Whatsapp.vue), así que acá no
		 * hace falta pedirlo de nuevo.
		 */
		onShown() {
			this.$store.dispatch('whatsapp_bot_config/getModels')
		},
	},
}
</script>
<style lang="sass">
.whatsapp-config__tabs
	display: flex
	flex-direction: row
	gap: 8px
	margin-bottom: 18px
</style>
