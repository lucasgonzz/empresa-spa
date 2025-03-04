<template>
	<b-modal
	hide-footer
	title="Forzar Total"
	id="forzar-total">
		<b-form-input
		v-model="final_price"
		type="number"
		id="precio-final-forzado"
		@keydown.enter="calcular_descuento"
		class="m-b-15"
		placeholder="Ingrese el precio deseado"></b-form-input>

		<b-button
		block
		id="btn_calcular_descuento"
		@click="calcular_descuento"
		variant="primary">
			Calcular Descuento
		</b-button>
	</b-modal>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	data() {
		return {
			final_price: '',
		}
	},
	computed: {
		total() {
			return this.$store.state.vender.total 
		},
	},
	watch: {
		total() {
			this.final_price = ''
		},
	},
	methods: {
		calcular_descuento() {
			let porcentaje_descuento = ((Number(this.total) - Number(this.final_price)) / Number(this.total)) * 100

			this.$store.commit('vender/set_descuento', porcentaje_descuento) 

			this.setTotal()

			this.$bvModal.hide('forzar-total')
		}
	}
}
</script>