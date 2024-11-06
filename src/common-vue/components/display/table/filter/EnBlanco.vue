<template>
	<div 
	v-if="field.type != 'checkbox'"
	class="text">
		<hr>
		<b-form-group>
			<b-form-checkbox
			@change="setFilters"
			:value="1"
			:unchecked-value="0"
			v-model="field.en_blanco">
				En blanco
			</b-form-checkbox>
			
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
			console.log('actualizando filtro con:')
			console.log(this.field)
			this.$store.commit(this.model_name+'/addFilter', {...this.field})
		},
	}
}
</script>
