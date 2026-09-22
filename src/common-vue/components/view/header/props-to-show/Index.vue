<template>
	<div>

		<modal-component
		:model_name="model_name"
		:preference_scope="preference_scope"></modal-component>

		<!-- Un solo icono, del set de Bootstrap Icons como el resto de la barra. Antes eran DOS
		     iconos apilados dentro del mismo boton (ojo + lista), el unico caso asi de toda la
		     barra, y el par no decia "elegir columnas". -->
		<b-button
		v-b-modal="modal_id"
		class="toolbar-btn--icono"
		size="sm">
			<i class="bi bi-layout-three-columns"></i>
		</b-button>
	</div>
</template>
<script>
import { props_to_show_modal_id } from '@/common-vue/helpers/column_preferences_helper'

export default {
	props: {
		model_name: String,
		/**
		 * Ámbito de vista de la tabla (ej. 'por_entregar'): columnas propias de esa pantalla,
		 * separadas de las del listado principal del modelo. Ver la prop homónima en Modal.vue.
		 */
		preference_scope: {
			type: String,
			default: null,
		},
	},
	computed: {
		// Tiene que ser el mismo id que arma Modal.vue: con ámbito lleva el sufijo, porque el
		// listado de Ventas y Por Entregar montan cada uno su modal sobre el mismo modelo.
		modal_id() {
			return props_to_show_modal_id(this.model_name, this.preference_scope)
		},
	},
	components: {
		ModalComponent: () => import('@/common-vue/components/view/header/props-to-show/Modal'),
	},
}
</script>