<template>
	<!-- Mismo data-testid que expone ExcelDropDown.vue en la rama v-if del slot btn_create: -->
	<!-- la igualdad es intencional, para que un test no dependa de cual de los dos le tocó. -->
	<b-button
	:dusk="'btn_create_'+model_name"
	:data-testid="'btn-crear-'+model_name"
	:class="[with_margin ? 'm-b-15' : '', 'toolbar-btn--acento']"
	:data-tour="model_name === 'article' ? 'listado.boton_crear_articulo' : null"
	@click="create"
	:block="block ? true : false"
	:size="button_size"
	variant="primary">
		<i class="bi bi-plus-lg"></i>
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