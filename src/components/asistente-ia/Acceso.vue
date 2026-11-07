<template>
	<button
	v-if="authenticated && puede_entrar_al_mostrador"
	type="button"
	class="acceso-asistente"
	:class="{ 'acceso-asistente--movil': movil }"
	:aria-expanded="String(panel_abierto)"
	:aria-controls="panel_abierto ? 'asistente-ia-panel' : null"
	aria-label="Asistente"
	aria-keyshortcuts="Alt+Shift+A"
	title="Asistente (Alt + Mayús + A)"
	@click="$store.commit('ai_chat/setPanelAbierto', !panel_abierto)">
		<span class="acceso-asistente__texto">Asistente</span>
		<span class="acceso-asistente__orb" aria-hidden="true">✦</span>
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
	},
}
</script>

<style lang="sass" scoped>
.acceso-asistente
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
	&:hover, &[aria-expanded="true"]
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
	&--movil
		width: auto
		min-height: 44px
		margin: 0 0 0 auto
		padding: 4px
		.acceso-asistente__texto
			display: none
</style>
