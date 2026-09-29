<template>
	<!--
		Elemento `fecha_de_entrega` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). Sin el w-300 ni el m-b-10 que traia: el ancho lo da el diseño en uso y el aire
		entre campos la grilla (layout/GrillaDeEtapa.vue). Un ancho fijo adentro pelearia contra la
		columna elegida.
	-->
	<b-input-group
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