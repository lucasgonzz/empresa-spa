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
	class="toolbar-select"
	title="Filtrar el listado por sucursal"
	aria-label="Filtrar el listado por sucursal"
	dusk="select_address_filtro_listado"
	v-model="address_id_filtro"
	:options="address_options"></b-form-select>
</template>
<script>
import { puede_ver_address } from '@/common-vue/helpers/article_dynamic_table_columns'

export default {
	computed: {
		/**
		 * Sucursales que este usuario tiene permitido ver, no todas las de la cuenta.
		 *
		 * 🔴 El filtro por `puede_ver_address` NO es opcional: un empleado con el permiso
		 * `article.stock_only_sucursal` ve en la tabla una sola columna de sucursal --la suya--,
		 * porque article_dynamic_table_columns.js:128 aplica ese mismo gate al armar las columnas.
		 * Sin este filtro, el select le listaba TODAS las sucursales por nombre de calle y lo
		 * dejaba filtrar por cualquiera: le filtraba el nombre de las sucursales que no puede ver
		 * y qué articulos tienen stock cargado en ellas.
		 *
		 * Los modelos ya estan en el store al entrar al Listado (los usa el mixin de columnas), asi
		 * que no hay que pedir nada.
		 *
		 * @returns {Array}
		 */
		addresses() {
			let self = this

			return this.$store.state.address.models.filter(function (address) {
				return puede_ver_address(self, address)
			})
		},
		/**
		 * Ids visibles, como texto, solo para que el watch de abajo pueda detectar que la sucursal
		 * elegida dejo de existir. Se compara un string y no el array porque el ABM puede mutar la
		 * lista en el lugar, y ahi la referencia no cambia y el watch no dispararia.
		 *
		 * @returns {String}
		 */
		address_ids() {
			return this.addresses.map(function (address) { return address.id }).join(',')
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
	watch: {
		/**
		 * Si la sucursal elegida desaparece de la lista --la borraron desde el ABM, o cambio el
		 * permiso del usuario--, el filtro vuelve a "todas".
		 *
		 * Sin esto quedaban dos estados rotos: con otras sucursales cargadas, el select se
		 * renderizaba EN BLANCO mientras el listado seguia filtrado por un id muerto; y si era la
		 * unica sucursal, el `v-if` desmontaba el select entero y el filtro se seguia aplicando en
		 * cada request sin que quedara ningun control en pantalla para sacarlo.
		 */
		address_ids() {
			if (!this.address_id_filtro) {
				return
			}

			let self = this

			let sigue_existiendo = this.addresses.find(function (address) {
				return address.id == self.address_id_filtro
			})

			if (typeof sigue_existiendo == 'undefined') {
				// Pasa por el setter a proposito: commitea y vuelve a pedir el listado sin filtro.
				this.address_id_filtro = 0
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

	🔴 Este control NO lleva `toolbar-btn--desde-md`, aunque sus tres vecinos si, y la asimetria es
	deliberada: esa clase es `display: none` abajo de 768px. Esconder un boton esconde una ACCION,
	que el usuario puede no hacer y no pasa nada. Esconder este select esconde ESTADO: el listado
	quedaria filtrado, sin el control que lo explica y sin ningun otro cartel que lo denuncie, y el
	usuario veria un listado al que le faltan articulos sin nada con que deshacerlo. Un filtro
	activo tiene que ser visible en todos los anchos.
-->
