<template>
	<!--
		Elemento `estado` del diseño de Vender (mision diseno-vender-configurable, 28/9/2026). Sin
		el w-300 ni el m-b-10 que traia: el ancho lo da el diseño en uso y el aire entre campos la
		grilla (layout/GrillaDeEtapa.vue). Un ancho fijo adentro pelearia contra la columna elegida.
	-->
	<b-input-group
	v-if="$store.state.sale_status.models.length"
	prepend="Estado">
		<b-form-select
		:options="get_options_simple('sale_status')"
		v-model="sale_status_id"></b-form-select>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		budget() {
			return this.$store.state.vender.budget 
		},
		sale_status_id: {
			set(value) {
				this.$store.commit('vender/set_sale_status_id', value)
			}, 
			get() { 
				return this.$store.state.vender.sale_status_id 
			}
		},
	},
}
</script>