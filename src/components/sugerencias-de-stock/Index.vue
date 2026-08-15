<template>
	<div class="sugerencias-de-stock">

		<!--
			Gate visual de la extension: la ruta existe siempre (el router del proyecto no
			procesa extensiones), asi que si alguien tipea la URL sin tener la extension
			activa, aca se le explica en vez de mostrarle una pantalla rota. El gate real
			esta en el backend (403 en las rutas nuevas) y en el menu (routes.js).
		-->
		<b-alert
		v-if="!tiene_extension"
		show
		variant="warning"
		class="m-t-15">
			Este modulo requiere la extension de sugerencias inteligentes de stock.
			Comunicate con ComercioCity si queres activarla.
		</b-alert>

		<listado
		v-else></listado>

	</div>
</template>
<script>
/*
	Decide que se muestra dentro de la vista propia de sugerencias. El listado es la
	pantalla principal; el detalle (segun $route.params.id) se conecta en la pieza
	siguiente de la construccion.
*/
export default {
	components: {
		Listado: () => import('@/components/sugerencias-de-stock/Listado'),
	},
	computed: {
		/**
		 * true cuando el dueño tiene activa la extension del modulo. hasExtencion
		 * devuelve undefined mientras auth/me no resolvio; se trata como "no tiene"
		 * y el alert desaparece solo cuando cargan las extensiones.
		 */
		tiene_extension() {
			return !!this.hasExtencion('sugerencias_inteligentes')
		},
	},
	created() {
		// Las sucursales alimentan los filtros y las columnas origen/destino de todo el
		// modulo; si el store todavia no las tiene (ingreso directo por URL), se piden aca.
		if (!this.$store.state.address.models.length) {
			this.$store.dispatch('address/getModels')
		}
	},
}
</script>
