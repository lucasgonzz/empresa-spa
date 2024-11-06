<template>
	<div 
	v-if="field.type == 'number'"
	class="numbers">
		<b-form-group>
			<b-form-input
			@keyup="setFilters"
			@keyup.enter="filtrar"
			v-model="filter.menor_que"
			type="number"
			placeholder="Menor que"></b-form-input>
			
			<b-form-input
			@keyup.enter="filtrar"
			@keyup="setFilters"
			v-model="filter.igual_que"
			type="number"
			placeholder="Igual que"></b-form-input>
			
			<b-form-input
			@keyup.enter="filtrar"
			@keyup="setFilters"
			v-model="filter.mayor_que"
			type="number"
			placeholder="Mayor que"></b-form-input>
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
