<template>
	<div 
	v-if="field.type == 'date'"
	class="numbers">
		<b-form-group
		label="Menor que">
			<b-form-input
			@change="setFilters"
			@keyup.enter="filtrar"
			v-model="field.menor_que"
			type="date"
			placeholder="Menor que"></b-form-input>
		</b-form-group>
			
		<b-form-group
		label="Igual que">
			<b-form-input
			@keyup.enter="filtrar"
			@change="setFilters"
			v-model="field.igual_que"
			type="date"
			placeholder="Igual que"></b-form-input>
		</b-form-group>
			
		<b-form-group
		label="Mayor que">
			<b-form-input
			@keyup.enter="filtrar"
			@change="setFilters"
			v-model="field.mayor_que"
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
	methods: {
		setFilters() {
			this.$store.commit(this.model_name+'/addFilter', {...this.field})
		},
		filtrar() {
			this.$emit('filtrar')
		}
	}
}
</script>
