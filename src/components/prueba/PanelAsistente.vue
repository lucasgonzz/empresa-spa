<template>
	<div>
		<demo-chat-panel v-if="habilitado" prueba :colapsado="colapsado"
			@alternar="colapsado = !colapsado" @sin-acceso="habilitado = false"></demo-chat-panel>
	</div>
</template>

<script>
import DemoChatPanel from '@/components/demo/DemoChatPanel'

// 🔴 El div raíz no es decorativo: App.vue le pone `v-show` a este componente para esconderlo en el
// módulo de Agentes. Sin él, ese display:none caería sobre el chat, que ahí justamente tiene que verse.
export default {
	components: { DemoChatPanel },
	data() {
		return { colapsado: this.$store.state.ai_chat.panel_abierto, habilitado: true }
	},
}
</script>
