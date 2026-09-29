<template>
	<!--
		Elemento `orden_de_compra` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). Sin el w-300 ni el m-b-10 que traia: el ancho lo da el diseño en uso y el aire
		entre campos la grilla (layout/GrillaDeEtapa.vue). Un ancho fijo adentro pelearia contra la
		columna elegida.
	-->
	<b-input-group
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