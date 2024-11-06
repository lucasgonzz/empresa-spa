<template>
	<b-button 
	class="m-l-10"
	size="sm"
	v-if="filter"
	:variant="filtro_usado ? 'success' : 'outline-primary'"
	@click="toggleFilter(field.key)">
		<i class="icon-search"></i>
	</b-button>
</template>
<script>
export default {
	props: {
		field: Object,
		model_name: String,
	},
	computed: {
		filter() {
			let filter = this.$store.state[this.model_name].filters.find(_filter => _filter.key == this.field.key)

			if (typeof filter != 'undefined') {
				console.log('retornando filtro actualizado')
				return filter  
			}
			return null
		},
		filtro_usado() {
			if (this.filter) {
				return (this.filter.que_contenga && this.filter.que_contenga != '') 
					|| (this.filter.mayor_que && this.filter.mayor_que != '') 
					|| (this.filter.menor_que && this.filter.menor_que != '') 
					|| (this.filter.igual_que && this.filter.igual_que != '')
					|| (this.filter.checkbox && this.filter.checkbox != -1)
			}
			return false
		}
	},
	methods: {
		toggleFilter() {
			this.$emit('toggleFilter', this.field.key)
		}
	}
}
</script>