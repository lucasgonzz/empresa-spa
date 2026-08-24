<template>
	<div class="ofertas">

		<!--
			Gate visual de la extension: la ruta existe siempre (el router del
			proyecto no procesa extensiones), asi que si alguien tipea la URL sin
			tener la extension activa, aca se le explica en vez de mostrarle una
			pantalla rota. El gate real esta en el backend (403 en las rutas nuevas)
			y en el menu (routes.js).
		-->
		<b-alert
		v-if="!tiene_extension"
		show
		variant="warning"
		class="m-t-15">
			Este modulo requiere la extension del motor de ofertas por cliente.
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
	ESTE es el componente de ofertas, el unico. Se monta en los DOS lugares del
	menu sin duplicar una sola linea de contenido:
	  - views/Ofertas.vue                                  (modulo IA -> Ofertas)
	  - components/online/components/promociones/Index.vue (Tienda Online -> Promociones)

	Decide listado vs detalle con $route.params.id, igual que
	components/sugerencias-de-compra/Index.vue. En /online/promociones nunca hay
	:id (esa ruta usa :view), asi que ahi siempre cae el listado y no hace falta
	ningun condicional propio de ese montaje.
*/
export default {
	components: {
		Listado: () => import('@/components/ofertas/Listado'),
		Detalle: () => import('@/components/ofertas/Detalle'),
	},
	computed: {
		/**
		 * true cuando el dueño tiene activa la extension del modulo. hasExtencion
		 * devuelve undefined mientras auth/me no resolvio; se trata como "no tiene"
		 * y el alert desaparece solo cuando cargan las extensiones.
		 */
		tiene_extension() {
			return !!this.hasExtencion('motor_de_ofertas')
		},
	},
	created() {
		// El listado liviano de clientes alimenta los filtros de las dos tablas
		// (sugeridas y activas); si el store todavia no lo tiene (ingreso directo
		// por URL o entrada por Tienda Online), se pide aca arriba de todo para que
		// este listo cuando el filtro lo use. getOptions no re-pide si ya cargo.
		if (!this.$store.state.client.options_loaded) {
			this.$store.dispatch('client/getOptions')
		}
	},
}
</script>
