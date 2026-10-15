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
			<b-button
			:variant="tab == 'conexion' ? 'primary' : 'outline-secondary'"
			size="sm"
			@click="tab = 'conexion'">
				<i class="bi bi-plug"></i>
				Conexión
			</b-button>
		</div>

		<!-- Modo demostración (misión whatsapp-envio-simulado-demos): la instancia es una demo y
		la API da los envíos por hechos sin mandarlos a Kapso. Lo dice acá, en la configuración,
		para que nadie lea «Bot activo» y piense que el negocio está conectado de verdad.
		`modo_demostracion` lo calcula la API (no se guarda ni se edita desde ninguna pantalla) y
		es opcional: con una API vieja no viene y el cartel no sale. -->
		<b-alert
		v-if="modo_demostracion"
		class="whatsapp-config__demo"
		variant="warning"
		show>
			<i class="bi bi-cone-striped"></i>
			<strong>Modo demostración:</strong>
			los mensajes no se envían. Todo se ve como enviado en las conversaciones, pero no sale
			nada por WhatsApp.
		</b-alert>

		<agent-config
		v-if="tab == 'agente'"></agent-config>

		<connection-config
		v-else-if="tab == 'conexion'"></connection-config>

		<templates
		v-else></templates>
	</b-modal>
</template>
<script>
import AgentConfig from '@/components/whatsapp/config/AgentConfig'
import ConnectionConfig from '@/components/whatsapp/config/ConnectionConfig'
import Templates from '@/components/whatsapp/config/Templates'
export default {
	components: {
		AgentConfig,
		ConnectionConfig,
		Templates,
	},
	data() {
		return {
			// Sección activa dentro del modal de configuración: 'agente' | 'plantillas' | 'conexion'.
			// El default sigue siendo 'agente' a propósito: es la solapa que se toca todos los
			// días. 'conexion' se carga una vez cuando se da de alta el número y no se vuelve
			// a mirar, así que no gana el primer lugar por ser la última que se agregó.
			tab: 'agente',
		}
	},
	computed: {
		/**
		 * La instancia está en modo demostración: la API devuelve `modo_demostracion` en la
		 * configuración (la lista de 0 o 1 ítem del store, mismo patrón que el resto del ABM).
		 * Sin configuración cargada o con una API que no manda el campo, es falso.
		 */
		modo_demostracion() {
			let config = this.$store.state.whatsapp_bot_config.models[0]
			return !!(config && config.modo_demostracion)
		},
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

.whatsapp-config__demo
	margin-bottom: 18px
	font-size: 14px
</style>
