<template>
	<div 
	v-if="field.type == 'select'"
	class="text">
		<b-form-group>
			<b-form-select
			@change="setFilters"
			v-model="filter.igual_que"
			:options="getOptions({key: filter.key, text: 'Seleccione Iva'})"></b-form-select>
			
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
		filter() {
			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)
		},
	},
	methods: {
		setFilters() {
			this.$store.commit(this.model_name+'/addFilter', {...this.filter})
		},
		filtrar() {
			this.$emit('filtrar')
		}
	}
}
</script>
