// Recorridos de Robotito (ronda 7 de la prueba gratuita, 15/11/2026): durante un paso con ancla,
// (B) los controles de formulario del mismo modal se dejan usar sin «¿Terminamos el tour?», y
// (A) la tarjeta se corre para no tapar el control que aparece al usar el ancla.
//
// Ejecutar con: node --test tests/robotito-paso-interactivo.test.cjs
// No levanta servidores ni usa la suite de Playwright.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const {
	es_control_de_formulario,
	accion_para,
	control_en_punto,
	elegir_posicion_tarjeta,
	ubicaciones_posibles,
	costo_de,
	PESO_CONTROL_NUEVO,
	PESO_ANCLA,
	PESO_PIE_DE_MODAL,
} = cargar('tours/paso-interactivo.js')

const en_modal = { en_contenedor: true }
function caja(left, top, ancho, alto) {
	return { left: left, top: top, right: left + ancho, bottom: top + alto }
}

test('B: input, textarea, select, interruptor y checkbox del mismo modal se dejan usar', () => {
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'input', tipo: 'text' }, en_modal)), true)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'input', tipo: 'number' }, en_modal)), true)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'input' }, en_modal)), true)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'textarea' }, en_modal)), true)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'select' }, en_modal)), true)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'input', tipo: 'checkbox' }, en_modal)), true)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'div', rol: 'switch' }, en_modal)), true)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'div', editable: true }, en_modal)), true)
})

test('B: botones, enlaces y acciones del modal siguen como siempre (no se dejan pasar)', () => {
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'button' }, en_modal)), false)
	assert.equal(es_control_de_formulario(Object.assign({ tag: 'a' }, en_modal)), false)
	;['button', 'submit', 'reset', 'image', 'hidden', 'file'].forEach(tipo => {
		assert.equal(es_control_de_formulario(Object.assign({ tag: 'input', tipo: tipo }, en_modal)), false, tipo)
	})
	// Un campo en el pie o el encabezado del modal (donde viven Guardar, Eliminar y la X).
	assert.equal(es_control_de_formulario({ tag: 'input', tipo: 'text', en_contenedor: true, en_parte_de_accion: true }), false)
	// Deshabilitado o de solo lectura: no hay nada que hacer ahí.
	assert.equal(es_control_de_formulario({ tag: 'input', tipo: 'text', en_contenedor: true, deshabilitado: true }), false)
})

test('B: fuera del modal del ancla, adentro de la tarjeta o del ancla, no se reenvía', () => {
	assert.equal(es_control_de_formulario({ tag: 'input', tipo: 'text', en_contenedor: false }), false)
	assert.equal(es_control_de_formulario({ tag: 'input', tipo: 'text', en_contenedor: true, en_tarjeta: true }), false)
	assert.equal(es_control_de_formulario({ tag: 'input', tipo: 'text', en_contenedor: true, en_ancla: true }), false)
	assert.equal(es_control_de_formulario(null), false)
})

test('B: un interruptor se alterna; un campo de texto o un select reciben el foco', () => {
	assert.equal(accion_para({ tag: 'input', tipo: 'checkbox' }), 'alternar')
	assert.equal(accion_para({ tag: 'input', tipo: 'radio' }), 'alternar')
	assert.equal(accion_para({ tag: 'div', rol: 'switch' }), 'alternar')
	assert.equal(accion_para({ tag: 'input', tipo: 'text' }), 'enfocar')
	assert.equal(accion_para({ tag: 'select' }), 'enfocar')
	assert.equal(accion_para({ tag: 'textarea' }), 'enfocar')
})

test('B: el control bajo el clic; si se superponen gana el más chico; fuera de todos, ninguno', () => {
	const grupo = { nombre: 'grupo', caja: caja(100, 400, 300, 120) }
	const campo = { nombre: 'precio', caja: caja(117, 444, 246, 36) }
	assert.equal(control_en_punto([grupo, campo], 150, 460).nombre, 'precio')
	assert.equal(control_en_punto([grupo, campo], 380, 500).nombre, 'grupo')
	assert.equal(control_en_punto([grupo, campo], 10, 10), null)
	assert.equal(control_en_punto([], 150, 460), null)
})

// El caso de producción (captura r7-tour-05c-interruptor, 1366×768): ancla = interruptor «Setear
// precio final» en x=117,y=345 (245×78); tarjeta debajo en x=107,y=443 (350×280); al prender el
// interruptor aparece el campo «Precio manual» en x=117,y=444 (246×36), tapado.
const vista = { ancho: 1366, alto: 768 }
const ancla = caja(117, 345, 245, 78)
const tarjeta = caja(107, 443, 350, 280)
const campo_nuevo = caja(117, 444, 246, 36)
const pie = caja(70, 680, 1226, 60)

test('A: la tarjeta que tapa el campo recién aparecido se corre a un lado libre', () => {
	const obstaculos = [
		{ caja: campo_nuevo, peso: PESO_CONTROL_NUEVO },
		{ caja: ancla, peso: PESO_ANCLA },
		{ caja: pie, peso: PESO_PIE_DE_MODAL },
	]
	assert.ok(costo_de(tarjeta, obstaculos) > 0)
	const nueva = elegir_posicion_tarjeta(tarjeta, ancla, obstaculos, vista)
	assert.ok(nueva, 'tiene que moverse')
	const movida = { left: nueva.left, top: nueva.top, right: nueva.left + 350, bottom: nueva.top + 280 }
	assert.equal(costo_de(movida, [{ caja: campo_nuevo, peso: 1 }]), 0, 'no tapa el campo')
	assert.equal(costo_de(movida, [{ caja: ancla, peso: 1 }]), 0, 'no tapa el ancla')
	assert.equal(costo_de(movida, [{ caja: pie, peso: 1 }]), 0, 'no tapa el pie')
	// Entera adentro de la pantalla.
	assert.ok(movida.left >= 0 && movida.top >= 0 && movida.right <= vista.ancho && movida.bottom <= vista.alto)
})

test('A: si la tarjeta no tapa nada con peso, se queda donde la puso driver.js', () => {
	const lejos = caja(700, 100, 350, 280)
	const obstaculos = [{ caja: campo_nuevo, peso: PESO_CONTROL_NUEVO }, { caja: ancla, peso: PESO_ANCLA }]
	assert.equal(elegir_posicion_tarjeta(lejos, ancla, obstaculos, vista), null)
})

test('A: sin lugar que libere todo, prioriza el campo nuevo sobre el ancla y el ancla sobre el pie', () => {
	// Pantalla de teléfono: la tarjeta ocupa casi todo el ancho y no entra al costado de nada.
	const telefono = { ancho: 390, alto: 700 }
	const ancla_t = caja(20, 200, 350, 80)
	const campo_t = caja(20, 290, 350, 40)
	const pie_t = caja(0, 640, 390, 60)
	const tarjeta_t = caja(20, 292, 350, 300)
	const obstaculos = [
		{ caja: campo_t, peso: PESO_CONTROL_NUEVO },
		{ caja: ancla_t, peso: PESO_ANCLA },
		{ caja: pie_t, peso: PESO_PIE_DE_MODAL },
	]
	const nueva = elegir_posicion_tarjeta(tarjeta_t, ancla_t, obstaculos, telefono)
	assert.ok(nueva)
	const movida = { left: nueva.left, top: nueva.top, right: nueva.left + 350, bottom: nueva.top + 300 }
	assert.equal(costo_de(movida, [{ caja: campo_t, peso: 1 }]), 0, 'el campo nuevo queda libre')
	assert.equal(costo_de(movida, [{ caja: ancla_t, peso: 1 }]), 0, 'el ancla queda libre si se puede')
})

// Revisión de 9aa1b091: el modal del artículo es `scrollable`, con encabezado y pie fijos. Un clic en
// la X, «Eliminar» o «Guardar y cerrar» no puede tocar lo que el cuerpo tenga escondido debajo.
const { punto_en_alguna, recortar_caja, contenedor_permitido, CLASE_BUSCADOR_DE_RELACION } = cargar('tours/paso-interactivo.js')

test('B: un punto dentro del encabezado o del pie del modal no es para ningún control', () => {
	const encabezado = caja(0, 0, 390, 56)
	const pie = caja(0, 780, 390, 64)
	assert.equal(punto_en_alguna([encabezado, pie], 360, 28), true, 'la X')
	assert.equal(punto_en_alguna([encabezado, pie], 300, 805), true, 'Guardar y cerrar')
	assert.equal(punto_en_alguna([encabezado, pie], 200, 400), false, 'el cuerpo')
	assert.equal(punto_en_alguna([], 200, 400), false)
})

test('B: un control que el scroll del modal dejó debajo del pie no tiene parte visible', () => {
	const cuerpo = caja(0, 56, 390, 724) // entre el encabezado y el pie
	const ventana = caja(0, 0, 390, 844)
	const escondido = caja(20, 790, 300, 36) // scrolleado debajo del pie
	assert.equal(recortar_caja(escondido, [ventana, cuerpo]), null)
	// A medias: solo cuenta lo que se ve, y un clic en la parte tapada ya no cae en él.
	const a_medias = caja(20, 760, 300, 36)
	const visible = recortar_caja(a_medias, [ventana, cuerpo])
	assert.deepEqual(visible, { left: 20, right: 320, top: 760, bottom: 780 })
	assert.equal(control_en_punto([{ caja: visible }], 100, 790), null)
	assert.ok(control_en_punto([{ caja: visible }], 100, 770))
})

test('B: el input de un buscador de relación no se toca ni por clic ni por Tab', () => {
	assert.equal(CLASE_BUSCADOR_DE_RELACION, 'search-field__input')
	assert.equal(es_control_de_formulario({ tag: 'input', tipo: 'text', en_contenedor: true, buscador_de_relacion: true }), false)
})

test('A y B: sin modal no hay contenedor permitido (todo queda como antes)', () => {
	const sin_modal = { closest: () => null }
	assert.equal(contenedor_permitido(sin_modal), null)
	const modal = { tag: 'modal-content' }
	const en_modal = { closest: selector => (selector === '.modal.show .modal-content' ? modal : null) }
	assert.equal(contenedor_permitido(en_modal), modal)
	assert.equal(contenedor_permitido(null), null)
})

test('A: las ubicaciones posibles quedan siempre enteras en la pantalla', () => {
	ubicaciones_posibles({ ancho: 350, alto: 280 }, ancla, vista, 12, 8).forEach(function (u) {
		assert.ok(u.left >= 8 && u.top >= 8 && u.right <= vista.ancho - 8 && u.bottom <= vista.alto - 8, JSON.stringify(u))
	})
})
