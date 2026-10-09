/*
	Pedidos a la API del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).

	Contrato (plan de la misión, §2.3 y §2.4):

	- GET pdf-column-profiles/page-layout-catalog
	      ?model_name=sale|budget|order&profile_id=<opcional>&is_afip_ticket=0|1
	       &sheet_type_id=<opcional>&sin_comprobante_de_prueba=1<opcional>
	      -> 200 {model_name, es_fiscal, categorias, campos, fijos, formatos_de_hoja, limites,
	              diseno_derivado, comprobante_de_prueba, es_ticket, grilla_de_tabla,
	              columnas_sugeridas} y, en un ticket de comandera, además {ancho_mm,
	              caracteres_por_renglon, tamanos_de_ticket} (misión diseno-ticket-comandera,
	              contrato §3.3). `sheet_type_id` es el tipo de hoja del FORMULARIO (puede no estar
	              guardado): decide si el catálogo es el de una hoja o el de un ticket.
	              `sin_comprobante_de_prueba=1` lo manda la tarjeta del formulario, que no lo usa
	              (la API no hace esa consulta y la clave va en null); el diseñador no.
	      -> 422 {message} si el modelo no se diseña con cajas (no pasa: el diseñador solo se abre
	              para venta, presupuesto y pedido online). Con una API vieja, 404 (y una API de
	              antes del ticket ignora los dos parámetros nuevos: todo es hoja).
	- GET pdf-column-profiles/{id}   el perfil GUARDADO -> 200 {model}: para comparar su Modelo con el
	                                 del formulario (si se cambió sin guardar, no se deja guardar).
	- GET pdf-column-options?model_name=   el catálogo de columnas de la tabla -> 200 {models: [{id,
	                                 name, label, value_resolver, default_width, allow_wrap_content,
	                                 order...}]} (misión diseno-ticket-comandera: la tabla se arma
	                                 adentro del diseñador). Solo con `skip_global_error_event`: es el
	                                 mismo pedido que hace el editor del formulario.
	- PUT pdf-column-profiles/{id}   solo las claves que vienen (page_layout, paper_width_mm,
	                                 printable_width_mm, margin_mm, paper_height_mm, header_layout,
	                                 logo_size_mm, en venta is_afip_ticket y, si la tabla o la hoja
	                                 cambiaron, pdf_column_options completo) -> 200 {model};
	                                 422 {message | errors}. Va como JSON en el cuerpo (objeto): la
	                                 API lee page_layout del cuerpo crudo para no perder las etiquetas
	                                 vacías ("sin rótulo"). En un ticket no viajan la hoja ni el
	                                 encabezado (la API fuerza los del rollo), y en venta viaja
	                                 `sheet_type_id` si el formulario lo cambió y no lo guardó.
	- GET sale/{sale_id}/ticket-comandera?pdf_column_profile_id=&afip_ticket_id=&formato=texto
	                                 "Ver cómo sale" de un ticket de comandera (contrato §3.6) ->
	                                 200 {disenado, perfil_id, es_factura, ancho_mm,
	                                 caracteres_por_renglon, payload_base64, lineas}: `lineas` es el
	                                 ticket en texto ("[LOGO]" y "[QR]" donde van). Con el perfil sin
	                                 diseño se arma con el derivado y `disenado` viene en false.
	                                 404 si la venta no es del dueño o la API es vieja; 422 {message}
	                                 si el perfil no es un ticket del dueño.

	🔴 Los pedidos van con `skip_global_error_event` y `skip_global_validation_toast`, igual que
	disenos-de-vender/api_de_disenos.js: el error lo muestra el diseñador con mensaje_de_error().
	Sin esas banderas el interceptor de main.js mostraría su propio aviso y saldrían dos por el
	mismo error.
*/
import { mensaje_de_error } from '@/components/abm/disenos-de-vender/api_de_disenos'

/* Ruta del recurso, relativa a $api (que ya lleva el prefijo /api) */
const RUTA = 'pdf-column-profiles'

/* Configuración de axios de todos los pedidos de este módulo (ver el comentario de arriba) */
const CONFIGURACION = {
	skip_global_error_event: true,
	skip_global_validation_toast: true,
}

/**
 * Trae el catálogo de campos, el diseño derivado y el comprobante de prueba de un perfil.
 *
 * @param {Object} vm componente que hace el pedido (usa su $api)
 * @param {{model_name: string, profile_id: (number|undefined), is_afip_ticket: number, sheet_type_id: (number|undefined), sin_comprobante_de_prueba: (number|undefined)}} parametros
 * @returns {Promise}
 */
export function traer_catalogo(vm, parametros) {
	return vm.$api.get(RUTA + '/page-layout-catalog', {
		params: parametros,
		skip_global_error_event: CONFIGURACION.skip_global_error_event,
		skip_global_validation_toast: CONFIGURACION.skip_global_validation_toast,
	})
}

/**
 * Trae el perfil GUARDADO (GET pdf-column-profiles/{id} → {model}), para comparar el Modelo del
 * formulario con el de la base antes de dejar diseñar y guardar.
 *
 * @param {Object} vm
 * @param {number} id id del pdf_column_profile
 * @returns {Promise}
 */
export function traer_perfil(vm, id) {
	return vm.$api.get(RUTA + '/' + id, CONFIGURACION)
}

/**
 * Trae el catálogo de columnas de la tabla de un modelo (GET pdf-column-options?model_name=): todas
 * las opciones activas, para mezclarlas con los pivots del perfil (tabla_del_disenador.js).
 *
 * Solo `skip_global_error_event` (sin el de validación), igual que el editor del formulario: si
 * falla, el diseñador arma la tabla con las columnas que ya tiene el perfil.
 *
 * @param {Object} vm componente que hace el pedido (usa su $api)
 * @param {string} model_name 'sale' | 'budget' | 'order'
 * @returns {Promise}
 */
export function traer_opciones_de_columnas(vm, model_name) {
	return vm.$api.get('pdf-column-options', {
		params: {
			model_name: model_name,
		},
		skip_global_error_event: true,
	})
}

/**
 * El ticket de comandera de una venta en texto, armado con un perfil de ticket ("Ver cómo sale").
 *
 * @param {Object} vm componente que hace el pedido (usa su $api)
 * @param {number} sale_id la venta de prueba (`comprobante_de_prueba.id` del catálogo)
 * @param {{pdf_column_profile_id: number, afip_ticket_id: (number|undefined)}} parametros
 * @returns {Promise}
 */
export function traer_ticket_en_texto(vm, sale_id, parametros) {
	let consulta = {
		pdf_column_profile_id: parametros.pdf_column_profile_id,
		formato: 'texto',
	}
	if (parametros.afip_ticket_id) {
		consulta.afip_ticket_id = parametros.afip_ticket_id
	}
	return vm.$api.get('sale/' + sale_id + '/ticket-comandera', {
		params: consulta,
		skip_global_error_event: CONFIGURACION.skip_global_error_event,
		skip_global_validation_toast: CONFIGURACION.skip_global_validation_toast,
	})
}

/**
 * Guarda en un perfil ya creado lo que armó el diseñador. Solo viajan las claves de `datos`: la
 * API no toca las que no vienen (un PUT sin `page_layout` deja el diseño como estaba).
 *
 * @param {Object} vm
 * @param {number} id id del pdf_column_profile
 * @param {Object} datos
 * @returns {Promise}
 */
export function guardar_diseno(vm, id, datos) {
	return vm.$api.put(RUTA + '/' + id, datos, CONFIGURACION)
}

/*
	El mensaje de un pedido que falló: los errores de validación de Laravel si vinieron, el
	`message` del backend si vino, y si no el texto de respaldo. Es el de Diseños de Vender.
*/
export { mensaje_de_error }
