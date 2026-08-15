// Aislamiento del navegador de los tests respecto de los OTROS entornos de esta misma maquina.
//
// 🔴 El problema, medido el 15/8/2026 y por que esto no es opcional:
//
// Todos los entornos de empresa que conviven en la maquina de Lucas --los seis slots y la carpeta
// fija C:\wamp64\www\empresa-- comparten UNA sola app de Pusher: la key 98f389f62ef4a392fc77 esta
// hardcodeada en el .env.local que genera e2e/setup-slot.ps1 y en el .env de la carpeta fija. Los
// canales de broadcast se llaman por id de owner (`global_notification.<owner_id>`, ver
// common-vue/mixins/broadcast.js) y son PUBLICOS, y UserSeeder siembra el mismo id de usuario en
// todas las bases. O sea que los canales de todos los entornos son literalmente el mismo canal.
//
// Consecuencia: cualquier cosa que dispare un broadcast en cualquier otro entorno --un feature
// test de PHPUnit corriendo en otro slot, Lucas probando a mano-- le aparece encima al navegador
// de esta corrida. En la corrida del 15/8/2026 salto el modal "Importacion de Excel finalizada
// correctamente / Sucursales que no existen en el sistema" con el dato "zz Sucursal Que No
// Existe", que solo existe en tests/Feature/Import/ClientSucursalImportTest.php de empresa-api:
// no lo genero este test ni esta base. El modal quedo tapando el buscador de proveedor y el spec
// de compras murio ahi.
//
// Un modal que puede aparecer en CUALQUIER momento, disparado desde otra maquina virtualmente,
// hace que la suite entera sea inestable por construccion: no hay espera que lo resuelva. Por eso
// el navegador de los tests no habla con Pusher.
//
// Lo que esto NO es: no se toca el codigo de la aplicacion ni se apaga el broadcast del producto.
// Se corta la conexion del NAVEGADOR DEL TEST, y nada mas. Un spec que algun dia quiera probar el
// comportamiento de los broadcasts simplemente no llama a esta funcion.
//
// La solucion de fondo --que no es del harness-- es que cada entorno tenga sus propias
// credenciales de Pusher, o que los canales lleven algo que distinga al entorno ademas del id de
// owner. Queda escalado.

/** Hosts de Pusher a los que el navegador del test no se conecta. */
const PUSHER = /pusher(app)?\.com/

/**
 * Deja al navegador de esta pagina sin conexion a Pusher.
 *
 * Hay que llamarla ANTES del primer page.goto(): despues de que la aplicacion instancio Echo ya
 * no sirve.
 *
 * 🔴 Se cortan LOS DOS caminos, y hacen falta los dos. Cortar solo el WebSocket no alcanza:
 * pusher-js tiene transportes de repliegue por HTTP (sockjs, xhr_streaming, xhr_polling) y se pasa
 * a ellos cuando el socket no le responde. Medido el 15/8/2026: con solo el WebSocket
 * interceptado, la primera corrida quedo limpia y una posterior igual recibio el aviso "Precios
 * actualizados" de otro entorno, que aparecio como modal encima del buscador de articulos y mato
 * el spec de compras.
 *
 * El handler del WebSocket no llama a connectToServer() a proposito: Playwright se queda con la
 * punta del socket y nunca abre la conexion real. No se cierra de una porque un cierre inmediato
 * hace que pusher-js reintente en rafaga y llene la consola de errores.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function aislar_broadcasts(page) {
	await page.routeWebSocket(PUSHER, () => {
		// A proposito vacio: ver el comentario de arriba.
	})
	await page.route(PUSHER, route => route.abort())
}

module.exports = {
	PUSHER,
	aislar_broadcasts,
}
