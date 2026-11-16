const MODAL = '#search-article-search-modal'
const CAMPO = MODAL + '-input'
const NOMBRE = ['abrir_buscador', 'escribir_nombre', 'buscar_nombre', 'elegir_resultado']
const PASOS = {
	abrir_buscador: { selector: '#search-article', avanza: 'aparece', selector_al_aparecer: CAMPO, foco: false },
	escribir_nombre: { selector: CAMPO, avanza: 'escritura', foco: true },
	buscar_nombre: { selector: CAMPO, avanza: 'enter', foco: true },
	elegir_resultado: {
		ancla: 'vender.resultados_buscador_articulos',
		avanza: 'evento',
		evento: 'vender:articulo-elegido-en-buscador',
		selector_al_cerrar: MODAL + '.show',
		lado: 'right',
	},
	codigo_barras: { selector: '[data-tour="vender.campo_codigo_barras"]', avanza: 'enter', foco: true },
}

export function pasos_de_guia(pasos) {
	if (!Array.isArray(pasos) || !pasos.length || pasos.length > NOMBRE.length) return []
	if (pasos.some(function (paso) {
		return !paso || typeof paso.texto !== 'string' || !paso.texto.trim() || paso.texto.length > 240
	})) return []

	const inicio = NOMBRE.indexOf(pasos[0].id)
	const por_codigo = pasos.length === 1 && pasos[0].id === 'codigo_barras'
	if (!por_codigo && (inicio < 0 || pasos.some(function (paso, i) { return NOMBRE[inicio + i] !== paso.id }))) return []

	return pasos.map(function (paso) {
		return Object.assign({ id: paso.id, texto: paso.texto }, PASOS[paso.id])
	})
}

export function ajustar_guia_a_vender(pasos) {
	const modal_abierto = document.querySelector(MODAL + '.show')
	if (!modal_abierto) {
		if (NOMBRE.indexOf(pasos[0].id) <= 0) return pasos
		return [Object.assign({ id: 'abrir_buscador', texto: 'Tocá acá para abrir el buscador.' }, PASOS.abrir_buscador)].concat(pasos)
	}

	if (pasos[0].id === 'codigo_barras') {
		return [{
			selector: MODAL + ' .modal-header .close',
			texto: 'Cerrá el buscador para usar el código de barras.',
			avanza: 'desaparece',
			foco: false,
		}].concat(pasos)
	}

	return pasos[0].id === 'abrir_buscador' ? pasos.slice(1) : pasos
}
