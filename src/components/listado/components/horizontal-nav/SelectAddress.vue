<template>
	<!--
		🔴 La raiz de este componente ES el select, sin ningun div envolviendolo, y eso no es
		cuestion de gusto.

		Este control se monta adentro de `.view-header__group`, que es un flex con
		`gap: var(--toolbar-btn-gap)`. Un wrapper que renderiza un elemento propio es un flex item
		mas: si queda vacio o de ancho cero, el gap se aplica igual a sus DOS lados y el hueco entre
		los vecinos se duplica. Es exactamente el defecto que documenta el comentario largo de
		horizontal-nav/Index.vue (dos wrappers de ancho cero dejaban 24px donde el resto tenia 8) y
		que la mision 35 vino a cerrar el 12/8/2026. No lo reintroduzcamos por una linea de HTML.

		Con el `v-if` en la raiz, la cuenta que no tiene sucursales cargadas no renderiza un div
		vacio sino un nodo comentario, que no participa del layout flex. Mismo patron que usa
		BtnInventoryPerformance.vue con su `v-if="is_admin"`.
	-->
	<b-form-select
	v-if="addresses.length"
	class="toolbar-select toolbar-btn--desde-md"
	title="Filtrar el listado por sucursal"
	aria-label="Filtrar el listado por sucursal"
	dusk="select_address_filtro_listado"
	v-model="address_id_filtro"
	:options="address_options"></b-form-select>
</template>
<script>
export default {
	computed: {
		/**
		 * Sucursales de la cuenta. Ya estan en el store cuando se entra al Listado: son las mismas
		 * que el mixin payment_method_discounts_addresses_columns usa para armar una columna de
		 * stock por sucursal en la tabla. No hace falta pedirlas de nuevo.
		 *
		 * @returns {Array}
		 */
		addresses() {
			return this.$store.state.address.models
		},
		/**
		 * Opciones del select. El 0 es "todas las sucursales" y es el valor por defecto: entrar al
		 * Listado no filtra nada.
		 *
		 * No se usa get_options_simple('address', 'street') a proposito: ese helper rotula el 0
		 * como "Seleccione sucursal", que en un filtro es enganoso —da a entender que hay que
		 * elegir algo para que la pantalla funcione, cuando el 0 es el estado normal.
		 *
		 * @returns {Array}
		 */
		address_options() {
			let options = [
				{
					value: 0,
					text: 'Todas las sucursales',
				}
			]

			this.addresses.forEach(address => {
				options.push({
					value: address.id,
					text: address.street,
				})
			})

			return options
		},
		/**
		 * Sucursal elegida. Al cambiar, vuelve a pedir el listado desde la pagina 1.
		 *
		 * Va a la pagina 1 y no a la pagina actual a proposito: cambiar el criterio cambia el
		 * conjunto entero, asi que quedarse en la pagina 7 de un resultado que ahora tiene 2 es
		 * mostrarle al usuario una tabla vacia sin explicacion. (Es lo contrario del boton
		 * "actualizar el listado", que si conserva la pagina: ahi el conjunto no cambia.)
		 *
		 * @returns {Number}
		 */
		address_id_filtro: {
			get() {
				return this.$store.state.article.address_id_filtro
			},
			set(value) {
				this.$store.commit('article/set_address_id_filtro', value)
				this.$store.dispatch('article/runGlobalSearch', { page: 1 })
			}
		},
	},
}
</script>
<!--
	Sin <style> propio: la altura, el radio, la tipografia y los colores (claro y oscuro) salen de
	`.toolbar-select`, declarada una sola vez en src/sass/_toolbar_botones.sass. Escribir metrica
	propia aca es como empezo el problema que la mision 33 vino a cerrar, cuando el mismo control
	tenia tres implementaciones distintas en tres modulos.

	La separacion respecto del boton de actualizar el listado tampoco se declara aca: la da el
	`gap` de `.view-header__group`. Un margen propio se SUMARIA a ese gap y este control quedaria
	mas separado que sus vecinos, que es justo lo contrario de lo que se pidio.

	`toolbar-btn--desde-md` lo oculta en telefono, igual que a los tres botones de al lado.
-->
