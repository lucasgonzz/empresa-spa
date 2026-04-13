<template>
	<div>
		
		<b-form-checkbox
		v-if="sale"
		class="m-t-15"
		:value="1"
		:unchecked-value="0"
		v-model="update_unidades_devueltas">
			Actualizar unidades devueltas en los items de la venta
		</b-form-checkbox>
	</div>
</template>
<script>
export default {
	computed: {
		sale() {
			return this.$store.state.devoluciones.sale
		},
		update_unidades_devueltas: {
			get() {
				return this.$store.state.devoluciones.update_unidades_devueltas
			},
			set(value) {
				this.$store.commit('devoluciones/set_update_unidades_devueltas', value)
			}
		},
	}
}
</script>