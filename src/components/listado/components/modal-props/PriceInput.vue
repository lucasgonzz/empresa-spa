<template>
	<!--
		El ancla va en el contenedor: el clip 1.1 muestra este campo JUSTAMENTE cuando esta
		bloqueado ("mientras haya margen, el precio lo calcula el sistema"), y driver.js no resalta
		ni recibe clics sobre un input `disabled`. Anclando el div se resalta el campo y la
		explicacion de por que esta bloqueado, que es lo que el lead tiene que leer.
	-->
	<div data-tour="listado.campo_precio_manual">
		<b-form-input
		:disabled="disabled"
		v-model="article.price"
		placeholder="Precio manual"></b-form-input>
		<div
		v-if="disabled">
			<p
			class="m-t-10"
			v-if="margen_del_articulo">
				Elimine el margen de ganancia del articulo para poder fijar el precio manualmente
			</p>
			<p
			class="m-t-10"
			v-else-if="margen_del_proveedor">
				Elimine el margen de ganancia del proveedor para poder fijar el precio manualmente
			</p>
		</div>
	</div>
</template>
<script>
import { usa_margen_del_articulo, usa_margen_del_proveedor } from '@/utils/criterio_de_precio'

export default {
	computed: {
		article() {
			return this.$store.state.article.model
		},
		disabled() {
			if (
				this.margen_del_articulo
				|| this.margen_del_proveedor
			) {
				return true
			}
			return false
		},
		article_provider() {
			// Antes buscaba el proveedor en el store paginado (provider.models), que ya no se
			// descarga completo al iniciar sesion (grupo 332/342, 4/8/2026). El articulo ya
			// trae la relacion embebida via scopeWithAll(), asi que no hace falta el store.
			return this.article.provider || null
		},
		/*
		 * Mision 44: el criterio vive en un solo lugar (utils/criterio_de_precio.js, espejo
		 * de CriterioDePrecioHelper.php del back). Antes este computed alcanzaba con que el
		 * proveedor tuviera margen, sin mirar el costo: un articulo con proveedor con margen
		 * y SIN costo quedaba con el precio manual bloqueado y con un margen que no podia
		 * producir ningun precio, o sea sin ninguna forma de ponerle un precio.
		 */
		margen_del_proveedor() {
			return usa_margen_del_proveedor(this.article, this.article_provider)
		},
		/*
		 * Mision 44: exige margen > 0. Antes alcanzaba con que percentage_gain no fuera null
		 * ni cadena vacia, y en JS "0.00" != '' es verdadero: un margen de 0 bloqueaba este
		 * input mientras el back (que pide > 0) no limpiaba el precio, y el articulo quedaba
		 * con los dos campos deshabilitados.
		 */
		margen_del_articulo() {
			return usa_margen_del_articulo(this.article)
		},
	},
}
</script>
