/**
 * Normalización del teléfono para el módulo de WhatsApp.
 *
 * Es el único lugar del sistema donde se decide qué es "el teléfono" de un contacto para
 * WhatsApp. Existía duplicado inline en dos lados (el link del comprobante de Ventas y el
 * salto a wa.me de Compradores); los enganches nuevos del sidebar habrían sido la tercera
 * copia del mismo `replace`.
 */

/**
 * Devuelve el teléfono como SOLO DÍGITOS.
 *
 * 🔴 A propósito NO antepone `54` ni `549`, por más que casi todos los números del sistema
 * sean argentinos. El contrato con el backend —`WhatsappPhoneHelper::normalize()` de
 * `empresa-api`, que hace exactamente el mismo `preg_replace('/\D+/', '', $raw)`— es
 * "mandá dígitos y dejá que él matchee": `matches($a, $b)` compara los ÚLTIMOS 10 DÍGITOS,
 * y así resuelve solo las cuatro variantes que conviven en la base (el `54` de país, el `9`
 * de celular, el `0` de larga distancia y el `15`).
 *
 * O sea que el prefijo que agregáramos "para ayudar" no mejora nada, y si el número ya lo
 * traía cargado lo duplicaríamos, empujando dígitos reales fuera de esa ventana de 10 y
 * rompiendo el matcheo con un chat que ya existía. Si algún día hay que agregar prefijo, se
 * agrega del lado del backend, que es el que tiene el número del negocio para saber qué país es.
 *
 * @param {String|Number|null} raw Teléfono como lo trae el modelo (con guiones, espacios, +, paréntesis).
 * @returns {String} Solo dígitos. Cadena vacía si no había ninguno.
 */
export function normalizar_telefono(raw) {
	return String(raw || '').replace(/\D/g, '')
}

/**
 * El teléfono con el que el camino de la OFERTA tiene que abrir la conversación.
 *
 * 🔴 ES EL MISMO CRITERIO QUE EL DEL AGENTE, Y ESE ES TODO EL PUNTO. Hasta ahora la
 * oferta usaba uno propio: `whatsapp_telefono` viene en E.164 argentino
 * (`TelefonoArgentinoHelper::a_e164()` le CONSTRUYE el 549), mientras que el botón de
 * WhatsApp de Clientes manda `normalizar_telefono(clients.phone)`, que son los dígitos
 * pelados. `WhatsappChatController::store()` busca el chat con un `where('phone', ...)`
 * EXACTO, así que el mismo cliente terminaba en DOS conversaciones distintas según por
 * qué botón del sistema hubieras entrado.
 *
 * Por eso se prefiere `clients.phone`: es la MISMA columna y el MISMO normalizador que
 * usa `BtnWhatsappChat`, así que los dos botones caen en el mismo chat. Recién si el
 * cliente no tiene teléfono cargado se cae a `whatsapp_telefono` (que en ese caso salió
 * del `buyers.phone`), y ahí no hay conflicto posible: sin `clients.phone`,
 * `BtnWhatsappChat` ni se muestra.
 *
 * 🔴 Lo que NO se hace acá es fusionar los cuatro normalizadores del sistema.
 * `WhatsappPhoneHelper::normalize()` NO se toca (su docblock explica por qué tiene otros
 * consumidores) y `TelefonoArgentinoHelper` tampoco: el link externo lo sigue necesitando
 * en E.164. Lo único que se unifica es el camino de la oferta.
 *
 * @param {Object} oferta Fila de client_offers con la relación `client` cargada (withAll).
 * @returns {String} Solo dígitos. Cadena vacía si no hay ninguno usable.
 */
export function telefono_de_chat_de_oferta(oferta) {
	let de_cliente = normalizar_telefono(oferta && oferta.client ? oferta.client.phone : '')
	if (de_cliente) {
		return de_cliente
	}
	return normalizar_telefono(oferta ? oferta.whatsapp_telefono : '')
}

/**
 * El texto del mensaje de la oferta, sacado del propio `whatsapp_url`.
 *
 * 🔴 CONTRATO CON empresa-api: `OfertaComunicacionHelper::link_de_whatsapp()` arma
 * SIEMPRE `https://api.whatsapp.com/send?phone=<digitos>&text=<rawurlencode(texto)>`,
 * con `&text=` último y el texto entero encodeado — o sea que un `&text=` literal no
 * puede aparecer adentro del mensaje. Hay un test que fija ese formato
 * (tests/Feature/MotorDeOfertas/11_Contrato_del_link_de_whatsapp_Test.php): si alguien
 * cambia el link del lado del backend, ese test se pone rojo antes de que esto devuelva
 * cadena vacía en silencio.
 *
 * `rawurlencode` manda los espacios como %20 y nunca como `+`, así que `decodeURIComponent`
 * a secas alcanza y no hay que tocar los `+` (un `+` en el texto vendría como %2B).
 *
 * @param {String} whatsapp_url
 * @returns {String} El mensaje en texto plano, o '' si no se pudo extraer.
 */
export function mensaje_de_oferta(whatsapp_url) {
	let url = String(whatsapp_url || '')
	let marca = '&text='
	let corte = url.indexOf(marca)
	if (corte == -1) {
		return ''
	}
	try {
		return decodeURIComponent(url.slice(corte + marca.length))
	} catch (e) {
		// Un %XX roto no puede tumbar el botón: se abre el chat sin borrador.
		return ''
	}
}
