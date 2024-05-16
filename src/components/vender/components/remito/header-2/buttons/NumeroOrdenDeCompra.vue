<template>
	<b-input-group
	class="w-300 m-b-10"
	v-if="hasExtencion('numero_orden_de_compra_para_las_ventas')"
	prepend="N° Orden compra">
		<b-form-input
		type="number"
		placeholder="Ingrese N° de orden de compra"
		min="0"
		v-model="numero_orden_de_compra"></b-form-input>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		numero_orden_de_compra: {
			set(value) {
				this.$store.commit('vender/set_numero_orden_de_compra', value)
			}, 
			get() { 
				return this.$store.state.vender.numero_orden_de_compra 
			}
		},
	},
}
</script>