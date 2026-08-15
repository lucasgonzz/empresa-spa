<template>
	<div class="sugerencias-de-compra">

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
			Este modulo requiere la extension de sugerencias de compra a proveedores.
			Comunicate con ComercioCity si queres activarla.
		</b-alert>

		<template v-else>
			<detalle
			v-if="$route.params.id"></detalle>
			<listado
			v-else></listado>
		</template>

	</div>
</template>
<script>
/*
	Decide que se muestra dentro de la vista propia de sugerencias de compra: sin
	id en la ruta, el listado; con id, el detalle de esa sugerencia. Molde de
	sugerencias-de-stock/Index.vue.
*/
export default {
	components: {
		Listado: () => import('@/components/sugerencias-de-compra/Listado'),
		Detalle: () => import('@/components/sugerencias-de-compra/Detalle'),
	},
	computed: {
		/**
		 * true cuando el dueño tiene activa la extension del modulo. hasExtencion
		 * devuelve undefined mientras auth/me no resolvio; se trata como "no tiene"
		 * y el alert desaparece solo cuando cargan las extensiones.
		 */
		tiene_extension() {
			return !!this.hasExtencion('sugerencias_compras')
		},
	},
	created() {
		// El listado de proveedores alimenta el filtro de la tabla priorizada del
		// detalle; si el store todavia no lo tiene (ingreso directo por URL), se
		// pide aca arriba de todo para que este listo cuando el filtro lo use.
		if (!this.$store.state.provider.options_loaded) {
			this.$store.dispatch('provider/getOptions')
		}
	},
}
</script>
