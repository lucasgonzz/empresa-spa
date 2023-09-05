<template>
	<b-dropdown
	v-if="show"
	class="m-l-15"
	right
	variant="primary"
	:text="text_dropdown">
		<b-dropdown-item
		@click="setUpdate">
			<i class="icon-undo"></i>
			Actualizar
		</b-dropdown-item>
		<b-dropdown-item
		@click="setDelete">
			<i class="icon-trash"></i>
			Eliminar
		</b-dropdown-item>
		<slot
		name="options_drop_down"></slot>
	</b-dropdown>
</template>
<script>
export default {
	props: {
		model_name: String,
		from_filter: Boolean,
	},
	computed: {
		text_dropdown() {
			if (this.from_filter) {
				return this.$store.state[this.model_name].filtered.length+' filtrados'
			}
			return this.$store.state[this.model_name].selected.length+' seleccionados'
		},
		show() {
			if (this.from_filter) {
				return this.$store.state[this.model_name].filtered.length
			}
			return this.$store.state[this.model_name].selected.length
		}
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