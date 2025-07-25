<template>
	<b-card
	v-if="discounts.length">
		<h5
		class="text-left">
			Descuentos
		</h5>

		<b-form-checkbox
		v-for="discount in discounts"
		:key="discount.id"
		:value="discount.id"
		v-model="devolucion_discounts">
			{{ discount.name }} ({{ discount.percentage }}%)
			
			<span
			v-if="discount.deleted_at">
				(actualmente eliminado)
			</span>

			<span
			v-else-if="discount.updated_percentage">
				({{ discount.updated_percentage }}% en este momento)
			</span>

			<p
			class="text-muted"
			v-if="!discount.deleted_at && discount.updated_percentage">
				En caso de querer usar el valor actual del descuento ({{ discount.updated_percentage }}%), actualice la venta, quite el descuento y guarde la venta sin el descuento. Luego vuelva a generar una devolucion para esta venta y agregue el descuento con el valor actual.
			</p>
			
		</b-form-checkbox>
	</b-card>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
	computed: {
		discounts() {
			return this.$store.state.discount.models 
		},
		devolucion_discounts: {
			get() {
				return this.$store.state.devoluciones.discounts_id
			},
			set(value) {
				console.log('value:')
				console.log(value)
				this.$store.commit('devoluciones/set_discounts_id', value)
				this.set_total_devolucion()
			}
		}
	},
}
</script>