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



	// Este margen nació para separar los inputs sueltos del filtro, que van uno abajo del

	// otro. La exclusión es por el input del buscador de relaciones, que NO es uno de esos:

	// vive adentro de .search-field, un contenedor flex con align-items:center, así que el

	// cross-size de la línea sale del MARGIN BOX del hijo y los 15px se convertían en

	// ALTURA del campo. El buscador se dibujaba de 53px contra los 38px de un filtro de

	// texto: el "alto de área de texto" que se veía en el modal de filtro por columna.

	// Medido el 11/8/2026 sobre el CSS compilado: sacando el margen, 53 -> 38.

	// El :last-child de abajo no lo salvaba, y por eso hay que excluirlo a mano: ese input

	// tiene el ícono de la lupa como hermano posterior, así que nunca es el último hijo.

	//

	// Ojo si venís a tocar esto: la regla se recortó, no se borró, porque borrarla cambia

	// también el dropdown legacy de filtros (el de `in_modal = false`) y eso excede a la

	// misión que la encontró. Pero hoy NINGÚN input la usa para lo que dice el párrafo de

	// arriba —en texto y número el :last-child ya la anulaba— y en Date.vue produce el

	// mismo alto fantasma que acá, porque .date-filter-criterion también es flex con

	// align-items:center y su input de fecha tampoco es el último hijo. Está registrado en

	// prompts/hallazgos/20260811-el-margen-de-filter-component-se-vuelve-alto-en-los-flex.json

	input:not(.search-field__input)

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

