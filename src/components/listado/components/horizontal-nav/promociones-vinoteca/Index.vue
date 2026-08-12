<template>
	<div
	v-if="hasExtencion('vinoteca')">

		<modal></modal>	

		<delete-modal></delete-modal>	

		<!--
			Sin m-l-15 y sin variant (mision 27, 11/8/2026): el espaciado lo da el gap de
			.view-header__group, y el relleno azul salia sobrando porque la unica accion con
			relleno macizo de la barra es "Crear" (regla de la mision 13). Queda neutro y SIN
			clase de tinte a proposito: el tinte pinta el <i> del boton y este no tiene icono
			--solo texto--, asi que lo unico que agregaria es un hover de color que ningun otro
			boton de texto de la barra tiene. Ponerle un icono no entra en esta mision: su
			alcance solo permite tocar class y variant.
		-->
		<b-button
		@click="abrir_modal">
			Promos
		</b-button>
	</div>
</template>
<script>
export default {
	components: {
		Modal: () => import('@/components/listado/components/horizontal-nav/promociones-vinoteca/Modal'),
		DeleteModal: () => import('@/components/listado/components/horizontal-nav/promociones-vinoteca/DeleteModal'),
	},
	methods: {
		abrir_modal() {
			this.$store.dispatch('promocion_vinoteca/getModels')
			this.$bvModal.show('promociones-vinoteca')
		}
	}
}
</script>