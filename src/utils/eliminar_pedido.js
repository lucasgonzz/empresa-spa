/**
 * Texto de la eliminación de pedidos de la tienda online (misión eliminar-pedidos-tienda).
 *
 * Vive en un util para poder probarlo sin montar Vue (tests/eliminar-pedido-tienda.test.cjs).
 */

/**
 * Texto que muestra el modal de confirmación al tocar "Eliminar" en un pedido. Explica las dos
 * consecuencias: la venta que haya generado el pedido NO se elimina, y el stock que el pedido
 * haya reservado (o descontado sin generar venta) se libera.
 *
 * Empieza con "¿" a propósito: el componente Confirm de common-vue muestra tal cual los textos
 * que arrancan con ese signo.
 *
 * @type {string}
 */
export const TEXTO_CONFIRMAR_ELIMINAR_PEDIDO = '¿Eliminar este pedido? Si ya generó una venta, la venta NO se elimina: queda igual, con su stock y su cuenta corriente. Si el pedido reservó stock (o lo descontó sin generar venta), ese stock se libera.'
