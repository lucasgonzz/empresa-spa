// Misión eliminar-pedidos-tienda, CA10 (SPA).
//
// Fija dos cosas del botón "Eliminar" de Tienda Online → Pedidos:
//   1. El texto de confirmación vive en `src/utils/eliminar_pedido.js` (constante exportada
//      TEXTO_CONFIRMAR_ELIMINAR_PEDIDO) y le avisa al dueño que la venta NO se elimina y que
//      la reserva de stock se libera.
//   2. `components/online/components/orders/Index.vue` muestra el botón (permiso `order.delete`),
//      usa ese texto, refresca el globito de pedidos sin confirmar y saca la fila al eliminar.
//
// Es un test de funciones puras y de lectura de fuente: no necesita webpack ni navegador.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

// Ruta del componente que lista los pedidos de la tienda online.
const RUTA_INDEX_PEDIDOS = path.join(__dirname, '..', 'src', 'components', 'online', 'components', 'orders', 'Index.vue')

test('el texto de confirmación avisa que la venta no se elimina y que se libera la reserva', () => {
	// Este require falla mientras src/utils/eliminar_pedido.js no exista (estado rojo esperado).
	const { TEXTO_CONFIRMAR_ELIMINAR_PEDIDO } = cargar('utils/eliminar_pedido.js')
	assert.equal(typeof TEXTO_CONFIRMAR_ELIMINAR_PEDIDO, 'string')
	assert.ok(TEXTO_CONFIRMAR_ELIMINAR_PEDIDO.startsWith('¿'), 'debe empezar con "¿"')
	assert.ok(TEXTO_CONFIRMAR_ELIMINAR_PEDIDO.includes('la venta NO se elimina'), 'debe aclarar que la venta NO se elimina')
	assert.ok(TEXTO_CONFIRMAR_ELIMINAR_PEDIDO.includes('se libera'), 'debe aclarar que se libera el stock reservado')
})

test('orders/Index.vue habilita el botón Eliminar con permiso, texto, refresco y salida de la fila', () => {
	const fuente = fs.readFileSync(RUTA_INDEX_PEDIDOS, 'utf8')
	// El botón ya no está apagado a mano...
	assert.ok(!fuente.includes(':show_btn_delete="false"'), 'no debe quedar :show_btn_delete="false"')
	// ...se prende según el permiso del usuario...
	assert.ok(fuente.includes(':show_btn_delete="puede_eliminar_pedidos"'), 'falta :show_btn_delete="puede_eliminar_pedidos"')
	assert.ok(fuente.includes("can('order.delete')"), "falta can('order.delete')")
	// ...usa el texto propio de confirmación (sin el texto genérico de borrado)...
	assert.ok(fuente.includes('not_show_delete_text'), 'falta not_show_delete_text')
	assert.ok(fuente.includes(':delete_text='), 'falta :delete_text=')
	// ...y al eliminar saca la fila y refresca el globito de pedidos sin confirmar.
	assert.ok(fuente.includes('@modelDeleted="pedido_eliminado"'), 'falta @modelDeleted="pedido_eliminado"')
	assert.ok(fuente.includes('order/getUnconfirmedModels'), 'falta order/getUnconfirmedModels')
})
