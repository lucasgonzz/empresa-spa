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
		v-if="filtro_usado"
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
				// Si el usuario marcó "En blanco", el filtro siempre cuenta como activo.
				if (typeof this.filter.en_blanco !== 'undefined' && this.filter.en_blanco) {
					return true
				}

				let type = this.field && this.field.type ? this.field.type : this.filter.type

				if (type === 'select' || type === 'search') {
					return typeof this.filter.igual_que !== 'undefined'
						&& this.filter.igual_que !== 0
						&& this.filter.igual_que !== ''
						&& this.filter.igual_que !== null
				}

				if (type === 'checkbox') {
					return typeof this.filter.checkbox !== 'undefined' && this.filter.checkbox != -1
				}

				if (type === 'date') {
					return (typeof this.filter.menor_que !== 'undefined' && this.filter.menor_que !== '') 
						|| (typeof this.filter.igual_que !== 'undefined' && this.filter.igual_que !== '') 
						|| (typeof this.filter.mayor_que !== 'undefined' && this.filter.mayor_que !== '')
				}

				if (type === 'number') {
					return (typeof this.filter.menor_que !== 'undefined' && this.filter.menor_que !== '')
						|| (typeof this.filter.igual_que !== 'undefined' && this.filter.igual_que !== '' && this.filter.igual_que !== null)
						|| (typeof this.filter.mayor_que !== 'undefined' && this.filter.mayor_que !== '')
				}

				// text/textarea
				return (typeof this.filter.que_contenga !== 'undefined' && this.filter.que_contenga !== '')
					|| (typeof this.filter.igual_que !== 'undefined' && this.filter.igual_que !== '')
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