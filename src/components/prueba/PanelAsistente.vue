<template>
	<demo-chat-panel v-if="habilitado" prueba :colapsado="colapsado"
		@alternar="colapsado = !colapsado" @sin-acceso="habilitado = false"></demo-chat-panel>
</template>

<script>
import DemoChatPanel from '@/components/demo/DemoChatPanel'

export default {
	components: { DemoChatPanel },
	data() {
		return { colapsado: false, habilitado: true }
	},
}
</script>
