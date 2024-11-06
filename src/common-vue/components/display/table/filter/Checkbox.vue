<template>
	<div 
	v-if="field.type == 'checkbox'"
	class="text">
		<b-form-group>
			<b-form-select
			@change="setFilters"
			v-model="filter.checkbox"
			:options="options"></b-form-select>
		</b-form-group>
	</div>
</template>
<script>
export default {
	props: {
		field: Object,
		model_name: String,
	},
	computed: {
		options() {
			return [
				{
					value: -1,
					text: 'Seleccione una opcion',
				},
				{
					value: 1,
					text: 'Activado',
				},
				{
					value: 0,
					text: 'Desactivado',
				},
			]
		},
		filter() {
			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)
		},
	},
	methods: {
		setFilters() {
			console.log('actualizando filtro con:')
			console.log(this.field)
			this.$store.commit(this.model_name+'/addFilter', {...this.filter})
		},
	}
}
</script>
