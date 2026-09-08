<template>
	<!-- Mismo data-testid que expone ExcelDropDown.vue en la rama v-if del slot btn_create: -->
	<!-- la igualdad es intencional, para que un test no dependa de cual de los dos le tocó. -->
	<b-button
	:dusk="'btn_create_'+model_name"
	:data-testid="'btn-crear-'+model_name"
	:class="[with_margin ? 'm-b-15' : '', 'toolbar-btn--acento']"
	:data-tour="ancla_tour"
	@click="create"
	:block="block ? true : false"
	:size="button_size"
	variant="primary">
		<i class="bi bi-plus-lg"></i>
		Crear
	</b-button>
</template>
<script>
import { ANCLA_BOTON_CREAR, ancla_de } from '@/common-vue/tours/anclas-por-modelo'

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
	computed: {
		/**
		 * Ancla `data-tour` del boton, segun el modelo.
		 *
		 * ⚠️ `article` NO esta en el mapa a proposito. En el Listado este boton **no se dibuja
		 * nunca**: `views/Listado.vue` pasa `show_excel_drop_down`, y
		 * `common-vue/components/view/header/Index.vue` elige entre `<excel-drop-down>` y
		 * `<btn-create>` con un `v-if`/`v-else-if` excluyente. El ancla de articulo vivio aca
		 * hasta el 30/8/2026 apuntando a un elemento que no existia, y se mudo a
		 * `ExcelDropDown.vue`, que es el que el lead ve.
		 *
		 * @returns {String|null}
		 */
		ancla_tour() {
			return ancla_de(ANCLA_BOTON_CREAR, this.model_name)
		},
	},
	methods: {
		create() {
			this.setModel(null, this.model_name)
		}
	}
}
</script>