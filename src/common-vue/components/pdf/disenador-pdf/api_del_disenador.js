/*
	Pedidos a la API del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).

	Contrato (plan de la misión, §2.3 y §2.4):

	- GET pdf-column-profiles/page-layout-catalog
	      ?model_name=sale|budget|order&profile_id=<opcional>&is_afip_ticket=0|1
	      -> 200 {model_name, es_fiscal, categorias, campos, fijos, formatos_de_hoja, limites,
	              diseno_derivado, comprobante_de_prueba}
	      -> 422 {message} si el modelo no se diseña con cajas (no pasa: el diseñador solo se abre
	              para venta, presupuesto y pedido online). Con una API vieja, 404.
	- PUT pdf-column-profiles/{id}   solo las claves que vienen (page_layout, paper_width_mm,
	                                 printable_width_mm, margin_mm, paper_height_mm, header_layout,
	                                 logo_size_mm) -> 200 {model}; 422 {message | errors}.

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
 * @param {{model_name: string, profile_id: (number|undefined), is_afip_ticket: number}} parametros
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
