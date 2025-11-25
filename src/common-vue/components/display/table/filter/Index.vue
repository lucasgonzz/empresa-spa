<template>
	<div 
	v-if="show"
	:class="full_width"
	:id="'cont-filters-'+field.key"
	class="filter-component custom-card">

		<div class="header">
			Filtros
		</div>

		<div class="body">

			<checkbox-filter
			:model_name="model_name"
			:field="local_field"></checkbox-filter>

			<select-filter
			@filtrar="filtrar"
			:model_name="model_name"
			:field="local_field"></select-filter>
			
			<number-filter
			@filtrar="filtrar"
			:model_name="model_name"
			:field="local_field"></number-filter>
			
			<date-filter
			@filtrar="filtrar"
			:model_name="model_name"
			:field="local_field"></date-filter>

			<search-filter
			@filtrar="filtrar"
			@clear_selected="clear_selected"
			:model_name="model_name"
			:field="local_field"></search-filter>

			<text-filter
			@filtrar="filtrar"
			:model_name="model_name"
			:field="local_field"></text-filter>

			<en-blanco
			:model_name="model_name"
			@filtrar="filtrar"
			:field="local_field"></en-blanco>

			<btn-buscar
			@filtrar="filtrar"
			:model_name="model_name"
			:field="local_field"></btn-buscar>
		</div>

	</div>
</template>
<script>
import filters from '@/common-vue/mixins/filters'
export default {
	mixins: [filters],
	props: {
		field: Object,
		model_name: String,
	},
	components: {
		CheckboxFilter: () => import('@/common-vue/components/display/table/filter/Checkbox'),
		SelectFilter: () => import('@/common-vue/components/display/table/filter/Select'),
		NumberFilter: () => import('@/common-vue/components/display/table/filter/Number'),
		SearchFilter: () => import('@/common-vue/components/display/table/filter/Search'),
		DateFilter: () => import('@/common-vue/components/display/table/filter/Date'),
		TextFilter: () => import('@/common-vue/components/display/table/filter/Text'),
		EnBlanco: () => import('@/common-vue/components/display/table/filter/EnBlanco'),
		BtnBuscar: () => import('@/common-vue/components/display/table/filter/BtnBuscar'),
	},
	data() {
		return {
			local_field: {...this.field} // Copia reactiva de field
		}
	},
	watch: {
		field: {
			deep: true,
			handler(newVal) {
				this.local_field = { ...newVal }; // Copia los valores de field cuando cambie
			}
		}
	},
	computed: {
		filter() {
			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)
		},
		show() {
			return typeof this.filter != 'undefined'
					&& ( 
						this.field.type == 'number'
						|| this.field.type == 'text'
						|| this.field.type == 'textarea'
						|| this.field.type == 'search'
						|| this.field.type == 'date'
						|| this.field.type == 'select'
						|| this.field.type == 'checkbox'
					)
		},
		full_width() {
			if (this.field.type == 'search') {
				return 'full-width'
			}
			return ''
		}
	},
	methods: {
		clear_selected() {
			let filter = this.limpiar_filtro(this.filter)
			console.log('filtro limpio:')
			console.log(filter)
			this.$store.commit(this.model_name+'/addFilter', filter)
		},
		filtrar() {
			this.$emit('filtrar')
		}
	}
}
</script>
<style lang="sass">
.filter-component
	// opacity: 0
	transition: opacity 0.3s ease
	position: absolute
	width: 200px
	top: 100%
	left: 0px
	z-index: 100000
	// left: 50%
	// transform: translateX(-50%)
	// pointer-events: none

	&::before 
		content: ""
		position: absolute
		top: -23px
		left: 50%
		transform: translateX(-50%)
		border-width: 13px
		height: 13px
		border-style: solid
		border-color: transparent transparent #fff transparent /* Triángulo */

	.header 
		color: #000

	.body
		padding: 10px 

	input  
		margin-bottom: 15px

		&:last-child
			margin-bottom: 0

	.custom-control-label, legend
		color: #000
		font-weight: normal



.full-width
	width: 400px
	left: 50%
	transform: translateX(-50%)
</style>