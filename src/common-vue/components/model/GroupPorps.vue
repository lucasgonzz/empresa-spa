<template>
	<div
	v-if="show_group_nav"
	class="group-props-container m-b-15 m-t--15">
		<horizontal-nav
		:items="group_items"
		:show_display="false"
		prop_name="name"
		:selected_item_value="selected_group_title"
		@setSelected="set_selected_group"></horizontal-nav>
	</div>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'

export default {
	name: 'GroupPorps',
	components: {
		HorizontalNav,
	},
	props: {
		group_items: {
			type: Array,
			default: () => [],
		},
		/**
		 * Guarda el grupo activo informado por `ModelForm`.
		 * Se usa para sincronizar el estado visual de `HorizontalNav`.
		 */
		selected_group_title: {
			type: String,
			default: null,
		},
	},
	computed: {
		/**
		 * Indica si corresponde mostrar la navegación de grupos.
		 * Se muestra únicamente cuando existe más de un grupo visible.
		 */
		show_group_nav() {
			return this.group_items && this.group_items.length > 1
		},
	},
	methods: {
		/**
		 * Emite hacia el padre el `group_title` seleccionado.
		 *
		 * @param {Object} group_item Item seleccionado en la navegación horizontal.
		 * @returns {void}
		 */
		set_selected_group(group_item) {
			/* Validación defensiva para evitar emitir estados inválidos. */
			if (!group_item || !group_item.name) {
				return
			}

			/* Reenvía solo el nombre del grupo para simplificar el estado en `ModelForm`. */
			this.$emit('setSelectedGroup', group_item.name)
		},
	},
}
</script>
<style scoped lang="sass">
.group-props-container
	width: 100%
</style>
