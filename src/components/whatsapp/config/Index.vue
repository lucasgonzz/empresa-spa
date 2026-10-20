<template>
	<b-modal id="whatsapp-config" hide-header hide-footer size="xl" content-class="whatsapp-config-shell" @shown="onShown">
		<div class="whatsapp-settings">
			<nav class="whatsapp-settings__nav" aria-label="Configuración del agente">
				<div class="whatsapp-settings__brand"><span>✦</span><div>Tu agente<small>WhatsApp</small></div></div>
				<button v-for="item in secciones" :key="item.key" type="button" :data-agent-section="item.key" :aria-label="item.label" :class="{ 'is-active': tab === item.key }" :aria-current="tab === item.key ? 'page' : null" @click="tab = item.key"><i :class="item.icon"></i><span>{{ item.label }}</span></button>
				<div v-if="modo_demostracion" class="whatsapp-settings__demo"><i class="bi bi-stars"></i><strong>Modo demo</strong><p>Probá con mensajes simulados. No le llega nada a nadie.</p></div>
			</nav>
			<main class="whatsapp-settings__contenido">
				<header class="whatsapp-settings__header"><div><small>CONFIGURACIÓN DEL AGENTE</small><h2>{{ seccion.label }}</h2><p>{{ seccion.descripcion }}</p></div><button type="button" aria-label="Cerrar configuración" @click="$bvModal.hide('whatsapp-config')"><i class="bi bi-x-lg"></i></button></header>
				<agent-config v-show="es_agente" :section="tab"></agent-config>
				<connection-config v-if="tab === 'conexion'"></connection-config>
				<templates v-if="tab === 'plantillas'"></templates>
			</main>
		</div>
	</b-modal>
</template>
<script>
import AgentConfig from '@/components/whatsapp/config/AgentConfig'
import ConnectionConfig from '@/components/whatsapp/config/ConnectionConfig'
import Templates from '@/components/whatsapp/config/Templates'
export default {
	components: { AgentConfig, ConnectionConfig, Templates },
	data() {
		return {
			tab: 'personalidad',
			secciones: [
				{ key: 'personalidad', label: 'Personalidad', icon: 'bi bi-emoji-smile', descripcion: 'Elegí cómo querés que hable tu agente.' },
				{ key: 'objetivo', label: 'Objetivo', icon: 'bi bi-bullseye', descripcion: 'Definí hacia dónde querés llevar la conversación.' },
				{ key: 'conocimiento', label: 'Conocimiento', icon: 'bi bi-lightbulb', descripcion: 'Contale sobre tu rubro y cómo asesorar a tus clientes.' },
				{ key: 'respuestas', label: 'Respuestas y pruebas', icon: 'bi bi-chat-dots', descripcion: 'Ajustá la respuesta automática y probá con mensajes simulados.' },
				{ key: 'plantillas', label: 'Plantillas', icon: 'bi bi-file-earmark-text', descripcion: 'Tus mensajes para comprobantes, avisos y seguimientos.' },
				{ key: 'conexion', label: 'Conexión', icon: 'bi bi-plug', descripcion: 'El número de WhatsApp y su conexión con el negocio.' },
			],
		}
	},
	computed: {
		seccion() { return this.secciones.find(item => item.key === this.tab) || this.secciones[0] },
		es_agente() { return ['personalidad', 'objetivo', 'conocimiento', 'respuestas'].indexOf(this.tab) !== -1 },
		modo_demostracion() { let config = this.$store.state.whatsapp_bot_config.models[0]; return !!(config && config.modo_demostracion) },
	},
	methods: { onShown() { this.$store.dispatch('whatsapp_bot_config/getModels') } },
}
</script>
<style lang="sass">
.whatsapp-config-shell
	border: 0 !important
	border-radius: 22px !important
	overflow: hidden
	.modal-body
		padding: 0
.whatsapp-settings
	display: flex
	min-height: 620px
	background: #fff
.whatsapp-settings__nav
	width: 220px
	flex: 0 0 220px
	padding: 26px 14px
	background: #f4f6fb
	border-right: 1px solid #e9ecf4
	> button
		display: flex
		align-items: center
		gap: 12px
		width: 100%
		border: 0
		border-radius: 10px
		background: transparent
		color: #667086
		padding: 12px 14px
		text-align: left
		font-size: 13px
		margin-bottom: 5px
		cursor: pointer
		&.is-active
			background: #e4e8fd
			color: #4d5dbb
			font-weight: 700
		&:hover
			background: #e9edf7
.whatsapp-settings__brand
	display: flex
	align-items: center
	gap: 12px
	margin: 0 10px 30px
	font-size: 16px
	font-weight: 700
	color: #25304e
	> span
		font-size: 32px
		color: #7384d8
	small
		display: block
		font-size: 11px
		font-weight: 400
		color: #8893aa
.whatsapp-settings__contenido
	flex: 1
	min-width: 0
	padding: 32px
	max-height: 80vh
	overflow-y: auto
.whatsapp-settings__header
	display: flex
	justify-content: space-between
	align-items: flex-start
	gap: 12px
	margin-bottom: 26px
	small
		font-size: 9px
		letter-spacing: .12em
		color: #8993aa
		font-weight: 700
	h2
		font-size: 24px
		font-weight: 700
		color: #26324d
		margin: 8px 0
	p
		color: #79839a
		font-size: 13px
		margin: 0
	button
		background: #f2f4f8
		border: 0
		border-radius: 9px
		width: 32px
		height: 32px
		color: #6c7891
		flex-shrink: 0
.whatsapp-settings__demo
	margin: 32px 9px 0
	font-size: 11px
	line-height: 1.5
	color: #78839b
	strong
		margin-left: 6px
		color: #596983
	p
		margin-top: 7px
.whatsapp-settings .whatsapp-agent-config
	.form-control
		border-radius: 12px
		border-color: #e1e6f1
		background: #fbfcff
		font-size: 13px
		line-height: 1.6
	.whatsapp-agent-config__hint
		font-size: 11px
		line-height: 1.5
	.whatsapp-agent-config__actions
		border-top: 1px solid #eff1f7
		padding-top: 18px
		margin-top: 22px
	.whatsapp-agent-config__objective-preview
		background: #f7f9fd
		border-radius: 12px
@media (max-width: 991px)
	.whatsapp-settings__nav
		width: 180px
		flex-basis: 180px
		padding: 24px 9px
	.whatsapp-settings__contenido
		padding: 24px
@media (max-width: 600px)
	.whatsapp-settings
		min-height: 500px
	.whatsapp-settings__nav
		width: 66px
		flex-basis: 66px
		padding: 18px 7px
		> button
			justify-content: center
			padding: 13px 5px
			font-size: 18px
			span
				display: none
	.whatsapp-settings__brand
		margin: 0 0 24px
		justify-content: center
		div
			display: none
	.whatsapp-settings__demo
		display: none
	.whatsapp-settings__contenido
		padding: 18px 13px
	.whatsapp-settings__header h2
		font-size: 20px
</style>
