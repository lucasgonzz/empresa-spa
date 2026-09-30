/*
	Que componente dibuja cada elemento del catalogo de Vender (mision diseno-vender-configurable,
	28/9/2026).

	Es la otra mitad de elementos.js: aquel tiene los metadatos (contrato con el editor del ABM, que
	no monta componentes de Vender), este tiene el runtime. Lo usa layout/GrillaDeEtapa.vue, que
	dibuja cada item del diseño con <component :is="...">.

	-------------------------------------------------------------------------------------------------
	🔴 LAS FABRICAS SE DECLARAN ACA, A NIVEL DE MODULO, UNA SOLA VEZ. NO MOVERLAS A UN COMPUTED.
	-------------------------------------------------------------------------------------------------

	Vue 2 guarda el componente asincrono ya resuelto SOBRE LA FUNCION FABRICA misma
	(factory.resolved). Si la fabrica se creara de nuevo en cada evaluacion (adentro de un computed,
	de data() o del render), cada render seria una funcion nueva: Vue volveria a arrancar el
	import y REMONTARIA el componente desde cero, perdiendo lo que el vendedor estaba tipeando en el
	buscador. Es el mismo motivo por el que src/mixins/abm.js declara afuera los componentes
	propios de sus solapas.

	Si se agrega un elemento a elementos.js, se agrega su fabrica aca con la MISMA key. Un elemento
	sin fabrica no se dibuja (GrillaDeEtapa lo saltea y lo avisa por consola).
*/

/* ---------------------------------------------------------------- Etapa 1 */

const facturacion = () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/Index')
const metodo_de_pago = () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/PaymentMethod')
const caja = () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Caja')
const sucursal = () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Address')
const lista_de_precios = () => import('@/components/vender/components/remito/total-previus-sales/price-type/Index')
const moneda = () => import('@/components/vender/components/remito/total-previus-sales/Moneda')
const tipo_de_venta = () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/SaleType')
const vendedor = () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Seller')
const fecha_de_venta = () => import('@/components/vender/components/stage-1/FechaVenta')
const cliente = () => import('@/components/vender/components/stage-1/SelectClient')
const guardar_como_presupuesto = () => import('@/components/vender/components/stage-1/GuardarComoPresupuesto')
const omitir_en_cuenta_corriente = () => import('@/components/vender/components/stage-1/OmitirEnCuentaCorriente')
const alerta_de_cobro = () => import('@/components/vender/components/stage-1/AlertarPersonalizado')
const enviar_correo = () => import('@/components/vender/components/stage-1/EnviarCorreo')

/* ---------------------------------------------------------------- Etapa 2 */

const resumen = () => import('@/components/vender/components/stage-2/ContextBar')
const codigo_de_barras = () => import('@/components/vender/components/remito/header-form/ArticleBarCode')
const buscador_de_articulos = () => import('@/components/vender/components/remito/header-form/ArticleName')
const combos = () => import('@/components/vender/components/remito/header-form/Combos')
const promociones = () => import('@/components/vender/components/remito/header-form/PromocionVinoteca')
const servicio = () => import('@/components/vender/components/remito/header-form/Services')
const cantidad = () => import('@/components/vender/components/remito/header-form/Amount')

/* ---------------------------------------------------------------- Etapa 3 */

const estado = () => import('@/components/vender/components/remito/header-2/buttons/SaleStatus')
const fecha_de_entrega = () => import('@/components/vender/components/remito/header-2/buttons/FechaEntrega')
const orden_de_compra = () => import('@/components/vender/components/remito/header-2/buttons/NumeroOrdenDeCompra')
const empleado = () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Employee')
const precios_con_iva = () => import('@/components/vender/components/remito/header-2/buttons/IvaAplicado')
const descontar_stock = () => import('@/components/vender/components/remito/header-2/buttons/DiscountStock')
const observaciones = () => import('@/components/vender/components/stage-3/ObservacionesVisibles')
const observaciones_ocultas = () => import('@/components/vender/components/stage-3/ObservacionesOcultas')
const descuentos = () => import('@/components/vender/components/stage-3/Discounts')
const recargos = () => import('@/components/vender/components/stage-3/Surchages')
const puntos = () => import('@/components/vender/components/stage-3/Puntos')
const nota_de_credito = () => import('@/components/vender/components/stage-3/NotaCredito')

/*
	key del catalogo -> fabrica. Congelado: nadie tiene que poder reemplazar una fabrica en
	caliente (seria justamente el remontaje que se quiere evitar).
*/
export const COMPONENTES_DE_ELEMENTOS = Object.freeze({
	facturacion: facturacion,
	metodo_de_pago: metodo_de_pago,
	caja: caja,
	sucursal: sucursal,
	lista_de_precios: lista_de_precios,
	moneda: moneda,
	tipo_de_venta: tipo_de_venta,
	vendedor: vendedor,
	fecha_de_venta: fecha_de_venta,
	cliente: cliente,
	guardar_como_presupuesto: guardar_como_presupuesto,
	omitir_en_cuenta_corriente: omitir_en_cuenta_corriente,
	alerta_de_cobro: alerta_de_cobro,
	enviar_correo: enviar_correo,

	resumen: resumen,
	codigo_de_barras: codigo_de_barras,
	buscador_de_articulos: buscador_de_articulos,
	combos: combos,
	promociones: promociones,
	servicio: servicio,
	cantidad: cantidad,

	estado: estado,
	fecha_de_entrega: fecha_de_entrega,
	orden_de_compra: orden_de_compra,
	empleado: empleado,
	precios_con_iva: precios_con_iva,
	descontar_stock: descontar_stock,
	observaciones: observaciones,
	observaciones_ocultas: observaciones_ocultas,
	descuentos: descuentos,
	recargos: recargos,
	puntos: puntos,
	nota_de_credito: nota_de_credito,
})

/**
 * La fabrica del componente de un elemento, o null si la key no tiene componente (un separador,
 * o un elemento del catalogo al que todavia no se le agrego su fabrica aca).
 *
 * @param {string} key
 * @returns {Function|null}
 */
export function componente_de_elemento(key) {
	return Object.prototype.hasOwnProperty.call(COMPONENTES_DE_ELEMENTOS, key) ? COMPONENTES_DE_ELEMENTOS[key] : null
}
