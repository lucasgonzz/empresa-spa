/**
 * Guiones de tour de la sección S6 — Ecommerce.
 *
 * Dos clips, los dos con práctica. El detalle medido de cada anclaje está en
 * `.mision/mapa-S6-y-motor.md`.
 *
 * 🔴 Casi todos los pasos de esta sección usan `selector` crudo en vez de `ancla`, y es a
 * propósito: los `#form-group-<key>` los arma `ModelForm` para **cada campo de cada formulario del
 * sistema**, y los `[data-testid="nav-item-X"]` los arma el nav horizontal. Ya existen, son
 * estables y salen del `prop.key` del modelo, que es el nombre del campo. Usarlos evita agregar
 * atributos a componentes de `common-vue`, que se despliegan a los ~40 clientes reales para que
 * los use únicamente la demo.
 */
export default {
	/**
	 * 6.1 — Tu artículo del sistema, publicado en tu tienda.
	 *
	 * ⚠️ El clip promete "lo cambiás acá y aparece allá", y el tour **no puede cerrar ese loop**:
	 * no existe ningún link a la tienda desde el ERP (verificado por búsqueda en todo `src/`). El
	 * último paso deja al lead en Guardar y le dice que abra la tienda él. Si alguna vez se agrega
	 * ese link, acá va un paso más.
	 */
	'6.1': {
		ruta: { name: 'article' },
		pasos: [
			{
				ancla: 'listado.tabla',
				texto: 'Este es tu listado. Abrí cualquier artículo tuyo tocando la fila.',
				avanza: 'aparece',
			},
			{
				ancla: 'listado.modal_articulo',
				texto: 'Este es el artículo. Todo lo que ves acá es lo que ve tu tienda.',
				avanza: 'siguiente',
				antes: 'esperar_modal',
			},
			{
				/* `final_price` y no `price`: el precio manual desaparece en las cuentas con listas
				 * de precios, y el precio final está siempre. */
				selector: '#form-group-final_price',
				texto: 'Cambiale el precio. Escribí un número nuevo.',
				avanza: 'siguiente',
			},
			{
				selector: '[data-testid="nav-item-Tienda online"]',
				texto: 'Acá decidís qué pasa con este artículo en la tienda: sacarlo, destacarlo, ponerlo en oferta.',
				avanza: 'clic',
			},
			{
				selector: '#form-group-online',
				texto: 'Publicar no es un paso: ya está. Esto es lo contrario, el interruptor para sacarlo de la tienda.',
				avanza: 'siguiente',
			},
			{
				ancla: 'listado.boton_guardar_articulo',
				texto: 'Guardá. En la tienda ya está: no hay nada que sincronizar. Abrí tu tienda en otra pestaña y fijate.',
				avanza: 'clic',
			},
		],
	},

	/**
	 * 6.2 — Entra un pedido y lo procesás desde el sistema.
	 *
	 * ⚠️ El paso del estado depende de que el pedido esté en "Sin confirmar":
	 * `get_order_status_options` filtra las opciones según el estado actual y solo deja avanzar o
	 * cancelar. Sobre un pedido ya confirmado, "Confirmado" no está en la lista y el paso no tiene
	 * qué elegir.
	 */
	'6.2': {
		ruta: { name: 'online', params: { view: 'pedidos' } },
		pasos: [
			{
				ancla: 'ecommerce.tabla_pedidos',
				texto: 'Este es un pedido que entró de tu tienda. Abrilo.',
				avanza: 'aparece',
			},
			{
				ancla: 'ecommerce.modal_pedido',
				texto: 'Un pedido no reserva nada todavía. Es tuyo hasta que lo confirmás.',
				avanza: 'siguiente',
				antes: 'esperar_modal',
			},
			{
				/* El prefijo del testid es `article-amount-`, no `order-...`: la tabla del pivote se
				 * renderiza con `model_name = 'article'`. */
				selector: '[data-testid^="article-amount-"][data-testid$="-editable"]',
				/* Sin números: el pedido lo hizo un cliente del lead y trae las cantidades que
				 * trae. Decirle "esas siete unidades" era describirle la pantalla de otro. */
				texto: 'Si no le podés dar todo lo que pidió, bajale la cantidad acá. El total se recalcula solo.',
				avanza: 'siguiente',
			},
			{
				selector: '#form-group-order_status_id',
				texto: 'El estado se cambia solamente acá. Ponelo en Confirmado.',
				avanza: 'siguiente',
			},
			{
				selector: '[data-testid="btn-guardar-order"]',
				texto: 'Guardá. Eso crea la venta: descuenta stock y entra a la cuenta corriente del cliente.',
				avanza: 'clic',
			},
			{
				/* Condicional: solo aparece si el cliente se pasa del límite de crédito. El motor
				 * lo saltea solo cuando no está. */
				selector: '#limite-credito-pedido',
				texto: 'Si el cliente se pasa del límite, te avisa antes de confirmar. Vos decidís.',
				avanza: 'siguiente',
				techo_ms: 4000,
			},
		],
	},
}
