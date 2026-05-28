<template>
	<div 
	v-if="field.type != 'checkbox'"
	class="text">
		<hr>
		<b-form-group>
			<b-form-checkbox
			@change="on_en_blanco_change"
			:value="1"
			:unchecked-value="0"
			v-model="filter.en_blanco">
				En blanco
			</b-form-checkbox>

			<b-form-checkbox
			class="m-t-10"
			@change="on_no_en_blanco_change"
			:value="1"
			:unchecked-value="0"
			v-model="filter.no_en_blanco">
				Que no esté en blanco
			</b-form-checkbox>
			
		</b-form-group>
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
	computed: {
		filter() {
			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)
		},
	},
	methods: {
		/**
		 * Activa "En blanco" y desactiva el filtro inverso.
		 */
		on_en_blanco_change() {
			if (this.filter.en_blanco) {
				this.filter.no_en_blanco = 0
			}
			this.setFilters()
		},
		/**
		 * Activa "Que no esté en blanco" y desactiva "En blanco".
		 */
		on_no_en_blanco_change() {
			if (this.filter.no_en_blanco) {
				this.filter.en_blanco = 0
			}
			this.setFilters()
		},
		/**
		 * Limpia criterios de valor y persiste el filtro en el store.
		 */
		setFilters() {
			let filter = this.limpiar_filtro(this.filter, false)
			this.$store.commit(this.model_name+'/addFilter', {...filter})
		},
	}
}
</script>
