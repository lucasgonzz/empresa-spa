/**
 * Anclas `data-tour` de los componentes GENÉRICOS, indexadas por `model_name`.
 *
 * Existe porque la tabla, el modal de formulario, el botón de guardar y el de crear son **un solo
 * componente** que se dibuja para todos los modelos del sistema. Sin este mapa, cada anclaje nuevo
 * es una rama más de un ternario que ya venía encadenado, y al sexto modelo el template deja de
 * leerse.
 *
 * 🔴 El contrato de nombres y la regla de unicidad están en
 * `claude-comerciocity/contexto/demo_data_tour.md`. Un valor nuevo acá se da de alta ALLÁ en el
 * mismo commit, o `herramientas/validar_data_tour.ps1` lo reporta como sobrante.
 *
 * ⚠️ **Vive en `common-vue/` y no en `src/tours/` a propósito.** Lo importan tres componentes de
 * `common-vue`, que es código compartido con `admin-spa` y `tienda-spa` — y esos dos proyectos **no
 * tienen** una carpeta `src/tours/`. Con el mapa afuera, el día que alguien porte
 * `model/Index.vue` a otro proyecto se lleva un import que no resuelve y el build revienta con
 * "Module not found". Viviendo acá, viaja con el código que lo usa.
 *
 * Este archivo viaja en el bundle de los ~40 clientes reales. Por eso es —y tiene que seguir siendo— un objeto literal de strings: nada que
 * se ejecute, nada que se importe adentro. El motor de tour y driver.js quedan del otro lado, en
 * el chunk diferido de `PanelDemo`, y un cliente real no los baja nunca.
 */

/** El `<table>` de `common-vue/components/display/table/Index.vue`. */
export const ANCLA_TABLA = {
	article: 'listado.tabla',
	sale: 'ventas.tabla',
	provider_order: 'compras.tabla',
	order: 'ecommerce.tabla_pedidos',
	budget: 'presupuestos.tabla',
}

/** El `<b-modal>` de formulario de `common-vue/components/model/Index.vue`. */
export const ANCLA_MODAL = {
	article: 'listado.modal_articulo',
	sale: 'ventas.modal_venta',
	provider_order: 'compras.modal_compra',
	provider_order_extra_cost: 'compras.modal_costo_extra',
	order: 'ecommerce.modal_pedido',
	price_type: 'listado.modal_lista_precio',
	budget: 'presupuestos.modal',
}

/**
 * El botón "Guardar y cerrar" del modal de formulario.
 *
 * 🔴 `provider_order` y `provider_order_extra_cost` tienen valores DISTINTOS a propósito, y no es
 * redundancia: el clip 4.2 hace dos "Guardar y cerrar" seguidos —primero el costo extra, después
 * la compra— y el segundo es el que reparte el flete. Los dos salen de este mismo `<btn-loader>`;
 * con un solo valor, el paso que espera el guardado de la compra puede resolverse contra el botón
 * del modal hijo, que todavía está en el DOM.
 */
export const ANCLA_BOTON_GUARDAR = {
	article: 'listado.boton_guardar_articulo',
	provider_order: 'compras.boton_guardar',
	provider_order_extra_cost: 'compras.boton_guardar_costo_extra',
	order: 'ecommerce.boton_guardar_pedido',
	budget: 'presupuestos.boton_guardar',
}

/**
 * El botón "Crear" de `common-vue/components/BtnCreate.vue`.
 *
 * ⚠️ `article` NO está en este mapa, y eso es un arreglo, no un olvido. En el Listado ese botón
 * **no se dibuja nunca**: `views/Listado.vue:54` pasa `show_excel_drop_down`, y
 * `common-vue/components/view/header/Index.vue:38-54` elige entre `<excel-drop-down>` y
 * `<btn-create>` con un `v-if`/`v-else-if` excluyente. O sea que se monta el desplegable y este
 * botón jamás. El ancla de artículo vive ahora en `ExcelDropDown.vue`, que es lo que el lead ve.
 */
export const ANCLA_BOTON_CREAR = {
	provider_order: 'compras.boton_crear',
}

/**
 * Devuelve el ancla de ese modelo, o null.
 *
 * El null importa: `:data-tour="null"` hace que Vue no dibuje el atributo, mientras que
 * `:data-tour="''"` dibuja uno vacío que el validador cuenta como anclaje presente.
 *
 * @param {Object} mapa
 * @param {String} model_name
 * @returns {String|null}
 */
export function ancla_de(mapa, model_name) {
	return mapa[model_name] || null
}

export default {
	ANCLA_TABLA: ANCLA_TABLA,
	ANCLA_MODAL: ANCLA_MODAL,
	ANCLA_BOTON_GUARDAR: ANCLA_BOTON_GUARDAR,
	ANCLA_BOTON_CREAR: ANCLA_BOTON_CREAR,
	ancla_de: ancla_de,
}
