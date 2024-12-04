<template>
	<b-dropdown
	v-if="show"
	class="m-l-15"
	right
	variant="primary"
	:text="text_dropdown">
		<b-dropdown-item
		v-if="puede_actualizar"
		@click="setUpdate">
			<i class="icon-undo"></i>
			Actualizar
		</b-dropdown-item>
		<b-dropdown-item
		v-if="puede_eliminar"
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
		check_permissions: Boolean,
	},
	computed: {
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
				return this.$store.state[this.model_name].total_filter_results+' filtrados'
			}
			return 'Seleccion: '+this.$store.state[this.model_name].selected.length
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