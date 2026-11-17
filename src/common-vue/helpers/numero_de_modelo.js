/**
 * La referencia visible sale de la misma propiedad que la columna del modelo: un id interno
 * puede diferir de num o num_receipt, y los artículos pueden conservar un num viejo sin usarlo.
 * No reemplazar por `model.num || model.id`: volvería a mezclar números comerciales con claves.
 */
export function numero_de_modelo(model, properties = []) {
	if (!model) return ''
	let prop = properties.find(property => ['num', 'num_receipt', 'id'].includes(property.key))
	let numero = prop ? model[prop.key] : model.num
	if (!prop && !tiene_numero(numero)) numero = model.id
	return tiene_numero(numero) ? numero : ''
}

function tiene_numero(numero) {
	return numero !== null && typeof numero !== 'undefined' && String(numero).trim() !== ''
}
