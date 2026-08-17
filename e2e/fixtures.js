// Base comun de todos los specs. En vez de `require('@playwright/test')`, los specs hacen
// `require('../fixtures')` y reciben el mismo `test`/`expect` de siempre, con una diferencia: la
// pagina ya viene aislada de los broadcasts de los otros entornos de la maquina.
//
// Por que es un fixture y no una linea en cada spec: el aislamiento tiene que estar puesto ANTES
// de la primera navegacion, y si depende de que cada autor se acuerde, el dia que alguien no se
// acuerde el sintoma no va a ser "falta el aislamiento" sino un test en rojo por un modal que
// aparecio de la nada. Ya paso: la corrida del 15/8/2026 dejo dos specs en rojo --el modal
// "Precios actualizados" tapando la pantalla-- porque el aislamiento estaba solo en
// alta-compra.spec.js y en auth.setup.js.
//
// Ese modal no venia de afuera: lo disparo el propio alta-compra.spec.js al guardar una compra con
// facturacion automatica, que actualiza precios y emite el broadcast. Como todos los entornos de
// la maquina comparten una sola app de Pusher y los canales son publicos (ver helpers/entorno.js),
// el aviso le llego a los specs que corrieron despues, en OTRA pagina. O sea que la contaminacion
// no es solo entre entornos: tambien es entre specs de esta misma suite.
const base = require('@playwright/test')
const { aislar_broadcasts } = require('./helpers/entorno')

const test = base.test.extend({
	page: async ({ page }, use) => {
		await aislar_broadcasts(page)
		await use(page)
	},
})

module.exports = {
	test,
	expect: base.expect,
}
