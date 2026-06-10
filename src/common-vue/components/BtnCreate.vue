<template>
	<b-button
	:dusk="'btn_create_'+model_name"
	:class="with_margin ? 'm-b-15' : ''"
	@click="create"
	:block="block ? true : false"
	:size="button_size"
	variant="primary">
		<i class="icon-plus"></i>
		Crear
	</b-button>
</template>
<script>
export default {
	props: {
		model_name: String,
		text: String,
		with_margin: {
			type: Boolean,
			default: true,
		},
		block: {
			type: Boolean,
			default: true,
		},
		/** Tamaño Bootstrap del botón (p. ej. `sm` en cabecera de vista). */
		button_size: {
			type: String,
			default: null,
		},
	},
	methods: {
		create() {
			this.setModel(null, this.model_name)
		}
	}
}
</script>