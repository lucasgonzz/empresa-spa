<template>
	<b-input-group
	class="w-300 m-b-10"
	v-if="hasExtencion('ventas_con_fecha_de_entrega') && !budget"
	prepend="Fecha de Entrega">
		<b-form-input
		type="date"
		v-model="fecha_entrega"></b-form-input>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		budget() {
			return this.$store.state.vender.budget 
		},
		fecha_entrega: {
			set(value) {
				this.$store.commit('vender/set_fecha_entrega', value)
			}, 
			get() { 
				return this.$store.state.vender.fecha_entrega 
			}
		},
	},
}
</script>