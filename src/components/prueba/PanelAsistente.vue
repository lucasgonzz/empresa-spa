<template>
	<demo-chat-panel v-if="habilitado" prueba :colapsado="colapsado"
		@alternar="colapsado = !colapsado" @sin-acceso="habilitado = false"></demo-chat-panel>
</template>

<script>
import DemoChatPanel from '@/components/demo/DemoChatPanel'

export default {
	components: { DemoChatPanel },
	data() {
		return { colapsado: this.$store.state.ai_chat.panel_abierto, habilitado: true }
	},
	watch: {
		'$store.state.ai_chat.panel_abierto'(abierto) {
			if (abierto) this.colapsado = true
		},
		colapsado(colapsado) {
			if (!colapsado) this.$store.commit('ai_chat/setPanelAbierto', false)
		},
	},
}
</script>
