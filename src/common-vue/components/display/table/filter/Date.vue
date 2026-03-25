<template>
	<div 
	v-if="field.type == 'date'"
	class="numbers">
		<b-form-group
		label="Menor que">
			<b-form-input
			@change="setFilters"
			@keyup.enter="filtrar"
			v-model="filter.menor_que"
			type="date"
			placeholder="Menor que"></b-form-input>
		</b-form-group>
			
		<b-form-group
		label="Igual que">
			<b-form-input
			@keyup.enter="filtrar"
			@change="setFilters"
			v-model="filter.igual_que"
			type="date"
			placeholder="Igual que"></b-form-input>
		</b-form-group>
			
		<b-form-group
		label="Mayor que">
			<b-form-input
			@keyup.enter="filtrar"
			@change="setFilters"
			v-model="filter.mayor_que"
			type="date"
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
			if (!this.filter) return
			this.$store.commit(this.model_name+'/addFilter', {...this.filter})
		},
		filtrar() {
			this.$emit('filtrar')
		}
	}
}
</script>
