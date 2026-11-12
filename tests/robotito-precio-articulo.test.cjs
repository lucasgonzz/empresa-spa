// Robotito guía «cambiarle el precio a un producto» dentro de la ficha del artículo (12/11/2026).
//
// Antes el recorrido dinámico solo podía abrir el Listado: abrir la ficha, ir a Precio, Setear precio
// final y Guardar salían como texto sin señalar nada. Acá se fija que esas claves existen, que usan los
// mismos identificadores que los guiones fijos y que la ficha deja usar la tarjeta de Robotito.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const { pasos_de_soporte } = cargar('tours/soporte.js')
const catalogo = cargar('tours/catalogo-soporte.json')
const raiz = path.join(__dirname, '..', 'src')

function leer(relativo) {
	return fs.readFileSync(path.join(raiz, relativo), 'utf8')
}

test('el camino Listado → ficha → Precio → Guardar se compila con controles que señalan', () => {
	const pasos = pasos_de_soporte({ tema: 'guia_dinamica', pasos: [
		{ clave: 'listado.buscador', texto: 'Buscá el artículo.' },
		{ clave: 'listado.abrir_ficha', texto: 'Abrilo.' },
		{ clave: 'listado.pestana_precio', texto: 'Andá a Precio.' },
		{ clave: 'listado.precio_final', texto: 'Este es el precio final.' },
		{ clave: 'listado.setear_precio_final', texto: 'Activá Setear precio final.' },
		{ clave: 'listado.guardar_articulo', texto: 'Guardá.' },
	] })

	assert.equal(pasos.length, 6)
	const [buscador, abrir, precio, final, setear, guardar] = pasos
	pasos.forEach(paso => assert.deepEqual(paso.ruta, { name: 'article' }))
	pasos.forEach(paso => assert.ok(!paso.indicacion, 'Ningún paso del camino queda como texto suelto.'))

	assert.equal(buscador.selector, '#listado [data-testid="buscador-general"]')
	assert.equal(buscador.foco, true, 'En el buscador hay que escribir.')

	assert.ok(abrir.selector.includes('[data-testid^="article-row-"]'))
	assert.ok(abrir.selector.includes('.cont-cards:has(.card-component.apretable)'))
	assert.equal(abrir.avanza, 'aparece')
	assert.equal(abrir.selector_al_aparecer, '[data-modelo-en-edicion="article"] #article.show .modal-content',
		'El paso se cumple cuando aparece la ficha de un artículo existente, no por el paso que venga.')

	assert.equal(precio.selector, '#article.show [data-testid="nav-item-Precio"]')
	assert.equal(precio.avanza, 'clic')

	assert.equal(final.ancla, 'listado.campo_precio_final')
	assert.equal(final.avanza, undefined)
	assert.equal(setear.ancla, 'listado.campo_precio_manual')
	assert.equal(setear.avanza, undefined, 'El campo puede estar bloqueado por el margen: avanza con Siguiente.')

	assert.equal(guardar.ancla, 'listado.boton_guardar_articulo')
	assert.equal(guardar.avanza, 'desaparece', 'Guardar es HTTP: el paso sigue cuando la ficha se cerró.')

	;[abrir, precio, final, setear, guardar].forEach(paso => assert.ok(paso.si_falta, 'Sin el control, el paso explica qué abrir.'))
})

test('las claves de la ficha están publicadas en el catálogo y sus anclas existen en la pantalla', () => {
	const controles = {}
	catalogo.controles.forEach(control => { controles[control.clave] = control })

	;['listado.buscador', 'listado.abrir_ficha', 'listado.pestana_precio', 'listado.setear_precio_final',
		'listado.precio_final', 'listado.guardar_articulo'].forEach(clave => assert.ok(controles[clave], clave + ' no está en el catálogo'))

	assert.match(leer('components/listado/components/modal-props/PriceInput.vue'), /data-tour="listado\.campo_precio_manual"/)
	assert.match(leer('components/listado/components/price-type-input/Index.vue'), /'listado\.campo_precio_manual'/)
	assert.match(leer('components/listado/components/modal-props/FinalPrice.vue'), /data-tour="listado\.campo_precio_final"/)
	assert.match(leer('common-vue/tours/anclas-por-modelo.js'), /article: 'listado\.boton_guardar_articulo'/)
	assert.match(leer('views/Listado.vue'), /<div id="listado"/)
	assert.match(leer('common-vue/components/view/header/buscador-general/Index.vue'), /'buscador-general'/)
})

test('la ficha del artículo deja el foco en la tarjeta de Robotito', () => {
	const modelo = leer('common-vue/components/model/Index.vue')
	const atributo = modelo.match(/:ignore-enforce-focus-selector="\[([^\]]*)\]\.includes\(model_name\) \? '\.driver-popover\.tour-soporte'/)
	assert.ok(atributo, 'El b-modal de formulario ignora el foco de la tarjeta de soporte para algunos modelos.')
	assert.ok(atributo[1].includes("'article'"))
	assert.match(modelo, /:id="modal_id \|\| model_name"/, 'La ficha es #article.')
})
