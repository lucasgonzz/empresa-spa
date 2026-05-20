<template>

	<div 

	v-if="show"

	:class="root_classes"

	:id="'cont-filters-'+field.key"

	class="filter-component">



		<div
		v-if="!in_modal"
		class="header">

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



			<!-- En modal los botones van en el footer del b-modal -->

			<btn-buscar

			v-if="!in_modal"

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

		// true cuando se renderiza dentro de FilterModal (sin dropdown ni botón Filtrar).

		in_modal: {

			type: Boolean,

			default: false,

		},

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

			// Copia reactiva de field para inputs de filtro sin mutar la prop.

			local_field: {...this.field},

		}

	},

	watch: {

		field: {

			deep: true,

			handler(new_val) {

				this.local_field = { ...new_val }

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

		/**

		 * Clases del contenedor según contexto (modal vs dropdown legacy).

		 *

		 * @returns {Array}

		 */

		root_classes() {

			let classes = []

			if (this.in_modal) {

				classes.push('filter-component-in-modal')

			}

			if (this.field.type == 'search') {

				classes.push('full-width')

			}

			return classes

		},

	},

	methods: {

		clear_selected() {

			let filter = this.limpiar_filtro(this.filter)

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

	// transition: opacity 0.3s ease

	// position: absolute

	// width: 200px

	// top: 100%

	// left: 0px

	// z-index: 100000



	// &::before 

	// 	content: ""

	// 	position: absolute

	// 	top: -23px

	// 	left: 50%

	// 	transform: translateX(-50%)

	// 	border-width: 13px

	// 	height: 13px

	// 	border-style: solid

	// 	border-color: transparent transparent #fff transparent



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



// Variante dentro del modal: flujo normal, sin triángulo ni position absolute.

.filter-component-in-modal

	position: static

	width: 100%

	z-index: auto



	&::before

		display: none



	.body

		padding: 0



.full-width

	width: 400px



.filter-component-in-modal.full-width

	width: 100%

</style>

