<template>
	<b-button-group
	v-if="filter">
		
		<b-button 
		class="m-l-10"
		size="sm"
		:id="'btn_filter_'+field.key"
		:variant="filtro_usado ? 'success' : 'outline-primary'"
		@click="toggleFilter(field.key)">
			<i class="icon-search"></i>
		</b-button>

		<b-button 
		size="sm"
		v-if="filtro_usado && field.type != 'search'"
		variant="danger"
		@click="call_limpiar_filtro(field.key)">
			<i class="icon-undo"></i>
		</b-button>
	</b-button-group>
</template>
<script>
import filters from '@/common-vue/mixins/filters'
export default {
	mixins: [filters],
	props: {
		field: Object,
		model_name: String,
	},
	computed: {
		filter() {
			let filter = this.$store.state[this.model_name].filters.find(_filter => _filter.key == this.field.key)

			if (typeof filter != 'undefined') {
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
					|| (this.filter.en_blanco)
			}
			return false
		}
	},
	methods: {
		call_limpiar_filtro() {
			let filter = this.limpiar_filtro(this.filter)
			console.log('filtro limpio:')
			console.log(filter)
			this.$store.commit(this.model_name+'/addFilter', filter)
		},
		toggleFilter() {
			this.$emit('toggleFilter', this.field.key)
			setTimeout(() => {
				this.input_foco()
			}, 300)
		},
		input_foco() {
			if (
				this.field.type == 'text'
				|| this.field.type == 'number'
			) {
				let cont_filters = document.getElementById('cont-filters-'+this.field.key)

				if (cont_filters) {

					let input = cont_filters.querySelector('input')

					if (input) {
						input.focus()
					}
				}
			}
		}
	}
}
</script>