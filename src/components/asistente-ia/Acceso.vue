<template>
	<button
	v-if="authenticated && (puede_entrar_al_mostrador || puede_soporte || puede_guia)"
	type="button"
	class="acceso-asistente"
	:class="{ 'acceso-asistente--movil': movil, 'acceso-asistente--activo': $route.name === 'agentes' }"
	:data-tour="puede_soporte ? 'soporte.abrir' : null"
	:aria-expanded="String(panel_abierto)"
	:aria-current="$route.name === 'agentes' ? 'page' : null"
	:aria-controls="panel_abierto ? 'asistente-ia-panel' : null"
	aria-label="Agentes"
	aria-keyshortcuts="Alt+Shift+A"
	title="Agentes · Un clic abre el lateral, dos abren el módulo"
	@click.stop="al_hacer_clic"
	@dblclick.stop.prevent="abrir_modulo">
		<span class="acceso-asistente__texto">Agentes</span>
		<span class="acceso-asistente__orb" aria-hidden="true">✦</span>
		<span v-if="sin_leer" class="acceso-asistente__badge" :title="sin_leer + ' mensajes de soporte sin leer'">{{ Math.min(sin_leer, 99) }}{{ sin_leer > 99 ? '+' : '' }}</span>
	</button>
</template>

<script>
import mostrador_acceso from '@/mixins/mostrador_acceso'

export default {
	mixins: [mostrador_acceso],
	props: {
		movil: Boolean,
	},
	computed: {
		panel_abierto() { return this.$store.state.ai_chat.panel_abierto },
		puede_soporte() { return this.hasExtencion('support_chat') },
		puede_guia() { return !!this.$store.state.ai_chat.guia },
		sin_leer() {
			return this.puede_soporte ? this.$store.state.support_ticket.models.reduce((total, ticket) => total + (Number(ticket.unread_messages_count) || 0), 0) : 0
		},
	},
	beforeDestroy() {
		clearTimeout(this._clic_agentes)
	},
	methods: {
		al_hacer_clic(evento) {
			clearTimeout(this._clic_agentes)
			if (evento.detail > 1) return
			const abrir = () => this.$root.$emit('agentes:abrir', 'lateral')
			if (evento.detail === 0 || this.movil) {
				abrir()
				return
			}
			this._clic_agentes = setTimeout(abrir, 275)
		},
		abrir_modulo() {
			clearTimeout(this._clic_agentes)
			this.$root.$emit('agentes:abrir', 'modulo')
		},
	},
}
</script>

<style lang="sass" scoped>
.acceso-asistente
	position: relative
	display: flex
	align-items: center
	justify-content: space-between
	flex: 0 0 auto
	gap: .5rem
	width: calc(100% - 16px)
	min-height: 40px
	margin: 4px 8px
	padding: 4px 6px 4px 12px
	color: #fff
	background: transparent
	border: 1px solid transparent
	border-radius: 8px
	&:hover, &[aria-expanded="true"], &--activo
		background: rgba(99, 102, 241, .22)
	&:focus-visible
		outline: 2px solid #a5b4fc
		outline-offset: -2px
	&__orb
		display: grid
		place-items: center
		width: 30px
		height: 30px
		flex: 0 0 auto
		border-radius: 10px
		background: linear-gradient(135deg, #2563eb, #6d28d9)
	&__badge
		position: absolute
		right: 0
		top: 0
		border-radius: 999px
		padding: 0 5px
		background: #b91c3b
		font-size: .67rem
	&--movil
		width: auto
		min-height: 44px
		margin: 0 0 0 auto
		padding: 4px
		.acceso-asistente__texto
			font-size: .82rem
</style>
