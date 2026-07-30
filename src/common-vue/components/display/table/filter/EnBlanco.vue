<template>
	<div
	v-if="field.type != 'checkbox'"
	class="text filter-toggles">
		<div class="filter-toggle-row">
			<span class="filter-toggle-row__label">En blanco</span>
			<label class="filter-toggle">
				<input
				type="checkbox"
				:checked="Number(filter.en_blanco) === 1"
				@change="on_en_blanco_toggle">
				<span class="filter-toggle-track">
					<span class="filter-toggle-thumb"></span>
				</span>
			</label>
		</div>

		<div class="filter-toggle-row">
			<span class="filter-toggle-row__label">Que no esté en blanco</span>
			<label class="filter-toggle">
				<input
				type="checkbox"
				:checked="Number(filter.no_en_blanco) === 1"
				@change="on_no_en_blanco_toggle">
				<span class="filter-toggle-track">
					<span class="filter-toggle-thumb"></span>
				</span>
			</label>
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
	computed: {
		filter() {
			return this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)
		},
	},
	methods: {
		/**
		 * Handler del toggle "En blanco": escribe el valor tocado (el input nativo ya reemplaza al
		 * v-model de b-form-checkbox) y delega en la MISMA lógica de siempre.
		 *
		 * @param {Event} event
		 */
		on_en_blanco_toggle(event) {
			this.$set(this.filter, 'en_blanco', event.target.checked ? 1 : 0)
			this.on_en_blanco_change()
		},
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
		 * Handler del toggle "Que no esté en blanco", mismo criterio que on_en_blanco_toggle.
		 *
		 * @param {Event} event
		 */
		on_no_en_blanco_toggle(event) {
			this.$set(this.filter, 'no_en_blanco', event.target.checked ? 1 : 0)
			this.on_no_en_blanco_change()
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
