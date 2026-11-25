/**
 * Solapa "Tienda online" del ABM de Integraciones.
 *
 * 🔴 Esto NO es un modelo: no tiene tabla, ni store, ni endpoint de ABM. Existe solo para
 * declarar el nombre de la solapa --de ahi salen la etiqueta y el segmento de la URL
 * (/abm/integraciones/tienda-online)-- y para que el buscador de recursos del ABM la
 * encuentre igual que a cualquier otro recurso.
 *
 * Lo que se renderiza no es el ABM generico sino el componente propio que la view declara
 * en `componentes` (src/mixins/abm.js): components/abm/integraciones/TiendaOnline.vue.
 */
export default {
	properties: [],
	abm_descripcion: {
		para_que_sirve: 'Conecta la tienda online con tu propia cuenta de Mercado Pago para cobrar con Zipnova (ex Zippin) para cotizar y despachar envíos por Correo Argentino, Andreani y más de 20 transportes, y directo con Andreani (con tu propio contrato) para cotizar envíos a domicilio y retiro en sucursal, incluso paquetes grandes.',
		implicancias: 'Mercado Pago se conecta por OAuth contra la cuenta del comercio; Zipnova, pegando el API Token y el API Secret que el comercio genera en su propia cuenta de Zipnova; Andreani, cargando el número de cliente y el contrato que figuran en el contrato comercial con Andreani. Ninguna clave queda a la vista después de conectar. ComercioCity no es intermediario del cobro ni del envío: la comisión de cada venta se la paga el comercio directo a Mercado Pago, y el costo del envío se lo cobra al comprador en el mismo pedido (o lo absorbe si marca envío gratis). Los pedidos con Andreani se despachan a mano en el portal de Andreani: el botón Envío del pedido deja los datos listos para copiar.',
		como_se_utiliza: 'Entrá a ABM → Integraciones → Tienda online y tocá Conectar en la tarjeta que corresponda. Para Zipnova, seguí el paso a paso de la tarjeta para conseguir los dos códigos, pegalos y tocá Conectar; después elegí el depósito, completá el paquete por defecto y probá con un código postal como lo vería tu cliente. Para Andreani, cargá el número de cliente y el contrato (el de domicilio es obligatorio), tocá Conectar y probá un código postal. Para cortar la conexión, Desconectar en la misma tarjeta.',
		// Las palabras clave van sin tilde a propósito: son lo que el dueño tipea en el buscador
		// del ABM, y ahí nadie acentúa.
		palabras_clave: ['mercado pago', 'cobro online', 'checkout', 'zipnova', 'zippin', 'andreani', 'numero de cliente', 'contrato andreani', 'sucursal andreani', 'paquete grande', 'correo argentino', 'codigo postal', 'costo de envio', 'etiqueta', 'envios', 'oauth', 'conectar', 'integraciones'],
	},
	singular_model_name_spanish: 'Tienda online',
	plural_model_name_spanish: 'Tienda online',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'la',
}
