import __base_store from '@/store/__base_store'
import { es_solo_lista_precio_final, se_ven_las_listas } from '@/utils/lista_precio_final'

/**
 * ¿El flag `users.listas_de_precio` del dueño está prendido? Un 1 / true real: el "1" en texto
 * también cuenta (así lo serializa la API a veces), igual que ownerUsesListasDePrecio() del mixin.
 *
 * @param {Object} rootState Estado raíz (para llegar al dueño autenticado).
 * @returns {Boolean}
 */
function flag_del_dueno(rootState) {
	let auth = rootState && rootState.auth ? rootState.auth : null
	if (!auth || !auth.authenticated) {
		return false
	}
	let owner = auth.user && auth.user.owner ? auth.user.owner : auth.user
	if (!owner) {
		return false
	}
	let valor = owner.listas_de_precio
	return valor === 1 || valor === true || valor === '1'
}

/**
 * Store de tipos de precio (modelo `price_type`) construido desde el factory común.
 *
 * Misión prueba-listas-siempre (3/11/2026, decisión D4 del plan): todo negocio trabaja con listas de
 * precios (el flag va siempre en 1 y el que no carga listas tiene UNA, «Precio final», que es el precio
 * del artículo de siempre), pero la INTERFAZ de listas —tarjetas por lista del modal del artículo,
 * columnas por lista del listado, selector de lista en Vender, opciones por lista de PDF / Excel /
 * etiquetas, mapeo por lista de la importación— no aparece si la única lista es la «Precio final». Ahí la
 * pantalla se comporta exactamente como la de un negocio sin listas: el recuadro «Precio final» del
 * artículo y la columna del listado son los de esa lista, y Vender la elige solo sin pedirla. Cualquier
 * otra cuenta ve lo mismo que veía: cada lugar conserva su condición de siempre, más esa salvedad.
 *
 * Es el molde de `address/muestra_sucursales` (misión sucursal-siempre): antes cada componente decidía
 * con `ownerUsesListasDePrecio()` o con `price_types.length`; ahora todos le preguntan a estos getters
 * (y al computed global `muestra_listas` de mixins/generals.js), así el criterio vive en un solo lugar.
 *
 * 🔴 Solo para decidir QUÉ SE VE. Lo que es dato —mandar el price_type_id de una venta, leer el pivote
 * de un artículo, la regla "toda venta lleva lista" (requiere_lista_de_precios)— sigue en el flag.
 */
export default __base_store({
	state: {
		model_name: 'price_type',
		per_page: 25,
	},
	getters: {
		/**
		 * Las listas de precios cargadas.
		 *
		 * @param {Object} state
		 * @returns {Array}
		 */
		listas(state) {
			return Array.isArray(state.models) ? state.models : []
		},
		/**
		 * ¿Se trabaja con listas? Para lo que en la base leía el flag del dueño o la "extensión" de
		 * márgenes por lista: el flag prendido, salvo que la única lista sea la «Precio final». Con el
		 * flag y CERO listas da true, como en la base: el artículo sigue escondiendo margen y precio. El
		 * flag participa a propósito: una cuenta de márgenes por categoría (`lista_de_precios_por_categoria`,
		 * flag apagado y listas cargadas) tiene su propia interfaz y no entra por acá. Lo que en la base
		 * leía `price_types.length` no usa este getter: usa `visibles`.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @param {Object} rootState
		 * @returns {Boolean}
		 */
		muestra_listas(state, getters, rootState) {
			return flag_del_dueno(rootState) && !es_solo_lista_precio_final(getters.listas)
		},
		/**
		 * ¿La cuenta tiene una sola lista y es la «Precio final»? Ahí Vender precia como un negocio sin
		 * listas, con `final_price` y la cotización de la venta (ver utils/lista_precio_final.js). Una
		 * sola lista PROPIA no entra: su precio sale de esa lista.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @param {Object} rootState
		 * @returns {Boolean}
		 */
		solo_precio_final(state, getters, rootState) {
			return flag_del_dueno(rootState) && es_solo_lista_precio_final(getters.listas)
		},
		/**
		 * Las listas que se DIBUJAN, para lo que en la base leía `price_types.length`: todas, salvo que la
		 * única sea la «Precio final». 🔴 SIN el flag: una cuenta `lista_de_precios_por_categoria` o con
		 * listas y el flag apagado tiene que seguir viendo sus columnas y su lista por renglón.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @returns {Array}
		 */
		visibles(state, getters) {
			return se_ven_las_listas(getters.listas) ? getters.listas : []
		},
	},
})

