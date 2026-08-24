<template>
	<div>

		<modal-component
		:model_name="model_name"></modal-component>

		<!-- Un solo icono, del set de Bootstrap Icons como el resto de la barra. Antes eran DOS
		     iconos apilados dentro del mismo boton (ojo + lista), el unico caso asi de toda la
		     barra, y el par no decia "elegir columnas". -->
		<b-button
		v-b-modal="'props-to-show-'+model_name"
		class="toolbar-btn--icono"
		size="sm">
			<i class="bi bi-layout-three-columns"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	components: {
		ModalComponent: () => import('@/common-vue/components/view/header/props-to-show/Modal'),
	},
}
</script>