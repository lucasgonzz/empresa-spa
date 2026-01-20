<template>
	<div 
	class="description j-between align-start">
		<b-form-textarea
		placeholder="Ingrese descripcion"
		v-model="description.notes"></b-form-textarea>

		<b-form-input
		class="w-200px m-l-10"
		placeholder="Ingrese valor"
		type="number"
		@keyup="call_set_total_devolucion"
		@change="call_set_total_devolucion"
		v-model="description.price"></b-form-input>

		<b-form-select
		class="w-200px m-l-10"
		:options="getOptions({key: 'iva_id', text: 'Iva'})"
		v-model="description.iva_id"></b-form-select>

		<b-button
		class="m-l-10"
		@click="del"
		variant="outline-danger">
			<i class="icon-trash"></i>
		</b-button>
	</div>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
	props: {
		description: Object,
	},
	methods: {
		del() {
			this.$store.commit('devoluciones/delete_description', this.description)
		},
		call_set_total_devolucion() {
			// this.$store.commit('devoluciones/set_total_devolucion')
			this.set_total_devolucion()
		},
	}
}
</script>