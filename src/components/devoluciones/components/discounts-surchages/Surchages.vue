<template>
	<b-card>
		<h5
		class="text-left">
			Recargos
		</h5>

		<b-form-checkbox
		v-for="surchage in surchages"
		:key="surchage.id"
		:value="surchage.id"
		v-model="devolucion_surchages">
			{{ surchage.name }} ({{ surchage.percentage }}%)
			
			<span
			v-if="surchage.deleted_at">
				(actualmente eliminado)
			</span>

			<span
			v-else-if="surchage.updated_percentage">
				({{ surchage.updated_percentage }}% en este momento)
			</span>

			<p
			class="text-muted"
			v-if="!surchage.deleted_at && surchage.updated_percentage">
				En caso de querer usar el valor actual del recargo ({{ surchage.updated_percentage }}%), actualice la venta, quite el recargo y guarde la venta sin el recargo. Luego vuelva a generar una devolucion para esta venta y agregue el recargo con el valor actual.
			</p>
			
		</b-form-checkbox>
	</b-card>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
	computed: {
		surchages() {
			return this.$store.state.surchage.models 
		},
		devolucion_surchages: {
			get() {
				return this.$store.state.devoluciones.surchages_id
			},
			set(value) {
				console.log('value:')
				console.log(value)
				this.$store.commit('devoluciones/set_surchages_id', value)
				this.set_total_devolucion()
			}
		}
	},
}
</script>