<template>
<b-modal
hide-footer
hide-header
size="md"
class="modal-belongs-to-many"
:id="id">
	<carousel
	v-if="model"
	navigationEnabled
	navigationNextLabel="<i class='icon-right'></i>"
	navigationPrevLabel="<i class='icon-left'></i>"
	:spacePadding="50" 
	:paginationPadding="10"
	:perPage="1"
	@page-change="handleSlideClick"
	:navigateTo="index">
		<slide
		:data-index="index"
		v-for="(prop_to_set, index) in prop.belongs_to_many.properties_to_set"
		:key="prop_to_set.id">
			<div class="cont-slide-belongs-to-many">
				<label>
					{{ prop_to_set.text }}
				</label>

				<b-form-input
				v-model="model_to_add.pivot[prop_to_set.key]"
				v-if="prop_to_set.type == 'text' || prop_to_set.type == 'number'"
				@keyup.enter="change"
				@blur="normalize_belongs_to_many_number_on_blur(prop_to_set)"
				:type="prop_to_set.type"
				:step="prop_to_set.type == 'number' ? get_number_input_step(prop_to_set) : undefined"></b-form-input>

				<b-form-checkbox
				v-model="model_to_add.pivot[prop_to_set.key]"
				:value="1"
				:unchecked-value="0"
				v-else-if="prop_to_set.type == 'checkbox'"></b-form-checkbox>	

				<b-form-select
				v-else-if="prop_to_set.type == 'select'"
				v-model="model_to_add.pivot[prop_to_set.key]"
				:class="getInputSize(prop_to_set)"
				:options="getOptions({key: prop_to_set.key, text: propText(prop_to_set), select_prop_name: prop_to_set.select_prop_name})"></b-form-select>
			</div>

		</slide>
	</carousel>
</b-modal>
</template>
<script>
import { Carousel, Slide } from 'vue-carousel'
export default {
	components: {
		Carousel,
		Slide,
	},
	computed: {
		model_to_add() {
			return this.$store.state.belongs_to_many.model_to_add  
		},
		model() {
			return this.$store.state.belongs_to_many.model  
		},
		prop() {
			return this.$store.state.belongs_to_many.prop  
		},
		model_name() {
			return this.$store.state.belongs_to_many.model_name  
		},
		id() {
			if (this.prop) {
				return 'belongs-to-many-props-'+this.model_name+'-'+this.prop.key 
			}
			return ''
		},
	},
	methods: {
		change() {
			this.index++
		},
		handleSlideClick(index) {
			this.index = index 
		},
		/**
		 * Al salir del input numérico del carrusel, aplica formato de decimales variables en el pivot.
		 *
		 * @param {Object} prop_to_set propiedad del belongs_to_many (ej. cost).
		 * @returns {void}
		 */
		normalize_belongs_to_many_number_on_blur(prop_to_set) {
			if (!prop_to_set || prop_to_set.type != 'number' || !prop_to_set.variable_decimals) {
				return
			}
			if (!this.model_to_add || !this.model_to_add.pivot) {
				return
			}
			const pivot_key = prop_to_set.key
			const current_value = this.model_to_add.pivot[pivot_key]
			if (current_value === null || current_value === undefined || current_value === '') {
				return
			}
			const normalized_value = this.normalize_variable_decimal_pivot_value(prop_to_set, current_value)
			if (normalized_value !== current_value) {
				this.$set(this.model_to_add.pivot, pivot_key, normalized_value)
			}
		},
	},
	data() {
		return {
			index: 1,
		}
	}
}
</script>
<style lang="sass">
.VueCarousel-navigation-prev
	left: 20px
.VueCarousel-navigation-next
	right: 20px 

.VueCarousel-slide
	width: calc(100% - 60px) !important
	margin-bottom: 0 30px
</style>