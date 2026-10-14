/**
 * ¿La persona logueada puede editar el stock de una sucursal? (misión stock-sucursal-desde-listado,
 * 14/10/2026).
 *
 * Es LA regla de la edición de stock por depósito desde el listado, en un solo lugar: la usan la
 * celda de cada sucursal (address-stock/Index.vue, para mostrar el input o el número) y el botón de
 * guardar (stock-btn/EditAddressesStockBtn.vue, para no mandar renglones de una sucursal que la
 * persona no puede tocar). Antes vivía solo en la celda y el payload llevaba todas las sucursales.
 *
 * Es el espejo de `PermisoStockPorSucursalHelper` de empresa-api: si cambia una, cambia la otra.
 *
 * 🔴 El nombre del método es largo a propósito: los métodos de un mixin se mezclan por nombre con
 * los globales y uno con el mismo nombre los pisa sin avisar.
 */
export default {
	methods: {
		/**
		 * @param {Number|String} address_id Id de la sucursal.
		 * @returns {Boolean}
		 */
		puede_editar_stock_de_sucursal(address_id) {
			if (this.is_admin) {
				return true
			}

			if (this.can('article.edit_stock_only_sucursal')) {
				return Number(this.user.address_id) == Number(address_id)
			}

			return this.can('article.edit_stock')
		},
	},
}
