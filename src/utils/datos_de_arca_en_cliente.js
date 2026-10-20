/**
 * Convierte lo que devuelve la consulta a ARCA (GET <modelo>/get-afip-information-by-cuit/{digits},
 * clave `afip_data`) en las propiedades de un cliente (o proveedor).
 *
 * Es la fuente UNICA de esa conversion y la usan los dos lugares donde se carga un cliente desde
 * ARCA: el input CUIT del formulario de Clientes (common-vue/components/model/ModelForm.vue) y el
 * buscador de cliente de Vender (vender/components/stage-1/buscar-por-cuit/ModalResult.vue). Antes
 * cada uno tenia su copia y se desfasaron: Clientes perdia el apellido, no cargaba el DNI y dejaba
 * el DNI tipeado en el campo CUIT; Vender buscaba provincia y localidad por nombre exacto (ARCA las
 * manda en mayusculas) y duplicaba las que ya existian.
 *
 * Claves que puede traer `afip_data` (AfipConstanciaInscripcionController, empresa-api):
 * nombre, apellido, razon_social (solo personas juridicas), cuit, dni (solo en la consulta por DNI),
 * direccion, localidad, provincia, condicion_iva.
 */

/**
 * iva_condition_id que corresponde a la condicion de IVA que informa ARCA.
 *
 * @param {string} condicion_iva Texto de ARCA ("RESPONSABLE INSCRIPTO", "MONOTRIBUTO", otro).
 * @returns {number}
 */
export function iva_condition_id_desde_arca(condicion_iva) {
	if (condicion_iva == 'RESPONSABLE INSCRIPTO') {
		return 1
	}
	if (condicion_iva == 'MONOTRIBUTO') {
		return 2
	}
	return 3
}

/**
 * Nombre del cliente sin "undefined" y sin el espacio colgando: en una persona juridica el backend
 * manda la razon social en `nombre` y `apellido` en ''.
 *
 * @param {Object} afip_data
 * @returns {string}
 */
export function nombre_desde_arca(afip_data) {
	let nombre = afip_data.nombre || ''
	let apellido = afip_data.apellido || ''
	return (nombre + ' ' + apellido).trim()
}

/**
 * Id de la provincia o localidad con ese nombre. Si no existe en el store la crea por la API y la
 * suma al store. La comparacion NO distingue mayusculas ni espacios de los bordes, porque ARCA
 * manda "BUENOS AIRES" y el negocio puede tenerla como "Buenos Aires".
 *
 * Siempre resuelve: ante un error de la API devuelve null (se sigue sin provincia/localidad) en
 * vez de dejar la promesa colgada, que dejaba cargando para siempre el boton de crear cliente.
 *
 * @param {Object} vm Instancia de Vue (da acceso a $store y $api).
 * @param {string} model_name 'provincia' o 'location'.
 * @param {string} name Nombre que informo ARCA.
 * @returns {Promise<number|null>}
 */
export function id_de_relacion_de_arca(vm, model_name, name) {
	if (!name) {
		return Promise.resolve(null)
	}

	let buscado = ('' + name).trim().toLowerCase()

	let existente = vm.$store.state[model_name].models.find(function(model) {
		return model.name && ('' + model.name).trim().toLowerCase() == buscado
	})

	if (typeof existente != 'undefined') {
		return Promise.resolve(existente.id)
	}

	return vm.$api.post(model_name, { name: name })
	.then(function(res) {
		vm.$store.commit(model_name + '/add', res.data.model)
		return res.data.model.id
	})
	.catch(function(err) {
		console.log(err)
		return null
	})
}

/**
 * Propiedades del cliente armadas con lo que devolvio ARCA, con la forma que recibe el tercer
 * argumento de setModel() (properties_to_override): [{ key, value }].
 *
 * Reglas:
 * - name: nombre + apellido.
 * - cuit: el que informa ARCA (si se busco por DNI, es el CUIT real de la persona).
 * - razon_social: solo si ARCA la manda (personas juridicas); en una persona fisica no se toca.
 * - dni: solo si ARCA lo manda (consulta por DNI).
 * - address, iva_condition_id: siempre.
 * - location_id, provincia_id: solo si ARCA informo localidad/provincia.
 *
 * @param {Object} vm Instancia de Vue.
 * @param {Object} afip_data `afip_data` de la respuesta de la consulta a ARCA.
 * @returns {Promise<Array<{key: string, value: *}>>}
 */
export function propiedades_de_cliente_desde_arca(vm, afip_data) {
	return Promise.all([
		id_de_relacion_de_arca(vm, 'location', afip_data.localidad),
		id_de_relacion_de_arca(vm, 'provincia', afip_data.provincia),
	])
	.then(function(ids) {
		let properties = [
			{
				key: 'name',
				value: nombre_desde_arca(afip_data),
			},
			{
				key: 'address',
				value: afip_data.direccion,
			},
			{
				key: 'cuit',
				value: afip_data.cuit,
			},
			{
				key: 'iva_condition_id',
				value: iva_condition_id_desde_arca(afip_data.condicion_iva),
			},
		]

		/*
			Localidad y provincia solo si hay id: si ARCA no las manda (o no se pudieron crear), el
			cliente que se esta editando conserva las que ya tenia en vez de quedar en null.
		*/
		if (ids[0]) {
			properties.push({
				key: 'location_id',
				value: ids[0],
			})
		}

		if (ids[1]) {
			properties.push({
				key: 'provincia_id',
				value: ids[1],
			})
		}

		/*
			🔴 La clave es `razon_social`, en snake_case, porque es la que arma
			AfipConstanciaInscripcionController::get_constancia_inscripcion() de empresa-api (no el
			`razonSocial` crudo de ARCA). Viene solo en personas juridicas.
		*/
		if (afip_data.razon_social) {
			properties.push({
				key: 'razon_social',
				value: afip_data.razon_social,
			})
		}

		if (afip_data.dni) {
			properties.push({
				key: 'dni',
				value: afip_data.dni,
			})
		}

		return properties
	})
}
