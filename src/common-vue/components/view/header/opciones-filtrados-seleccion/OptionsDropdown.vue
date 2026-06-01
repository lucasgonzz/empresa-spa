<template>
	<b-dropdown
	v-if="show"
	class="m-l-15"
	right
	:id="id"
	:variant="variant"
	:text="text_dropdown">
		<b-dropdown-item
		v-if="puede_actualizar && show_actualizar_option && !ocultar_actualizar_eliminar_por_filtro"
		id="btn_actualizar"
		@click="setUpdate">
			<i class="icon-undo"></i>
			Actualizar
		</b-dropdown-item>
		<b-dropdown-item
		id="btn_eliminar"
		v-if="puede_eliminar && !ocultar_actualizar_eliminar_por_filtro"
		@click="setDelete"> 
			<i class="icon-trash"></i>
			Eliminar
		</b-dropdown-item>
		<slot
		name="options_drop_down"></slot>
		<slot
		name="options_drop_down_seleccion"></slot>
		<slot
		name="options_drop_down_filtro"></slot>
	</b-dropdown>
</template>
<script>
export default {
	props: {
		model_name: String,
		from_filter: Boolean,
		check_permissions: Boolean,
		show_actualizar_option: Boolean,
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		id() {
			if (this.from_filter) {
				return 'btn_filtrados_dropdown'
			}
			return 'btn_seleccionados_dropdown'
		},
		variant() {
			if (this.from_filter) {
				return 'primary'
			}
			return 'warning'
		},
		puede_eliminar() { 
			if (this.check_permissions) {
				return this.can(this.model_name+'.delete')
			}
			return true 
		},
		puede_actualizar() { 
			if (this.check_permissions) {
				return this.can(this.model_name+'.update')
			}
			return true 
		},
		text_dropdown() {
			if (this.from_filter) {
				if (this.papelera) {
					return this.$store.state.papelera[this.model_name].total_filter_results + ' filtrados'
				}
				return this.$store.state[this.model_name].total_filter_results + ' filtrados'
			}
			return 'Seleccion: ' + this.$store.state[this.model_name].selected.length
		},
		show() {
			if (this.from_filter) {
				if (this.papelera) {
					return this.$store.state.papelera[this.model_name].filtered.length
				}
				return this.$store.state[this.model_name].filtered.length
			}
			return this.$store.state[this.model_name].selected.length
		},
		/**
		 * Oculta actualizar/eliminar masivos por filtro cuando solo hay `filtered`
		 * sin `filters` (búsqueda rápida en listado de artículos).
		 */
		ocultar_actualizar_eliminar_por_filtro() {
			if (!this.from_filter) {
				return false
			}
			let module_state = this.papelera
				? this.$store.state.papelera[this.model_name]
				: this.$store.state[this.model_name]
			return !!module_state.filtered_without_filter_form
		},
	},
	methods: {
		setUpdate() {
			this.$emit('setUpdate', this.from_filter)
		},
		setDelete() {
			this.$emit('setDelete', this.from_filter)
		},
	}
}
</script>