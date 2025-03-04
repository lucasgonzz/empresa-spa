<template>
	<b-form-checkbox
	class="m-t-15"
	v-if="client"
	:value="1"
	:unchecked-value="0"
	v-model="generar_current_acount">
		Generar movimiento en C/C 
	</b-form-checkbox>
</template>
<script>
export default {
	computed: {
		client() {
			return this.$store.state.devoluciones.client
		},
		generar_current_acount: {
			get() {
				return this.$store.state.devoluciones.generar_current_acount
			},
			set(value) {
				this.$store.commit('devoluciones/set_generar_current_acount', value)
			}
		},
	}
}
</script>