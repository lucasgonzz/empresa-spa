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
		para_que_sirve: 'Conecta la tienda online con tu propia cuenta de Mercado Pago y con Zippin para los envios.',
		implicancias: 'La conexion se hace por OAuth contra la cuenta del comercio: ya no se pegan claves a mano en ningun formulario. ComercioCity no es intermediario del cobro; la comision de cada venta se la paga el comercio directo a Mercado Pago.',
		como_se_utiliza: 'Entra a ABM → Integraciones → Tienda online y toca Conectar en la tarjeta que corresponda. Para cortar la conexion, Desconectar en la misma tarjeta.',
		palabras_clave: ['mercado pago', 'cobro online', 'checkout', 'zippin', 'envios', 'oauth', 'conectar', 'integraciones'],
	},
	singular_model_name_spanish: 'Tienda online',
	plural_model_name_spanish: 'Tienda online',
	create_model_name_spanish: 'Nuevo',
	text_delete: 'la',
}
