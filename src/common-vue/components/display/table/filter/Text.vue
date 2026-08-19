<template>
	<div
	v-if="field.type == 'text' || field.type == 'textarea'"
	class="text">
		<b-form-group label="Que contenga">
			<b-form-input
			@keyup="setFilters"
			@keyup.enter="filtrar"
			v-model="filter.que_contenga"></b-form-input>
		</b-form-group>

		<b-form-group label="Igual que">
			<b-form-input
			@keyup.enter="filtrar"
			@keyup="setFilters"
			v-model="filter.igual_que"></b-form-input>
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
