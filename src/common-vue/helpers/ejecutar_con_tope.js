/*
	Corre una lista de tareas asincronas con un TOPE de concurrencia: nunca hay mas de `tope`
	tareas en vuelo a la vez, y cada vez que una termina arranca la siguiente.

	Nacio para el repliegue del arranque (download-resources/Index.vue): cuando la llamada masiva
	de recursos iniciales se cae, la SPA tenia que pedir ~70 catalogos de a uno, y los pedia TODOS
	juntos. En el shared hosting de Hostinger el limite es de ~20 conexiones nuevas por segundo
	para toda la cuenta (error 2002 `Operation not permitted`), asi que justo cuando el servidor
	esta saturado la SPA le tiraba encima otras ~70 conexiones, y la mayoria volvia a fallar.

	Contrato:
	- Cada tarea es una FUNCION que devuelve una promesa (no la promesa ya creada: si se creara de
	  antemano, la request ya habria salido y el tope no serviria de nada).
	- La promesa que devuelve esta funcion NUNCA rechaza. Si una tarea rechaza o tira de forma
	  sincronica se la da por terminada igual y se sigue con la proxima: quien necesite saber si
	  fallo tiene que manejarlo adentro de su propia tarea. Es lo mismo que ya hacia
	  pedir_sueltos(), donde cada pedido atrapa su propio error.
	- Una lista vacia resuelve enseguida.
	- Sin async/await (Vue 2, ver CLAUDE.md del repo).

	@param {Array<function(): Promise>} tareas Funciones que arrancan cada trabajo.
	@param {number} tope Maximo de tareas simultaneas. Menos de 1 se toma como 1.
	@returns {Promise<void>} Resuelve cuando terminaron todas.
*/
export function ejecutar_con_tope(tareas, tope) {
	let pendientes = tareas.slice()
	let maximo = tope >= 1 ? Math.floor(tope) : 1

	return new Promise(resolve => {
		let en_vuelo = 0

		function avanzar() {
			while (en_vuelo < maximo && pendientes.length) {
				let tarea = pendientes.shift()
				en_vuelo++
				arrancar(tarea)
			}

			if (!en_vuelo && !pendientes.length) {
				resolve()
			}
		}

		function terminar() {
			en_vuelo--
			avanzar()
		}

		function arrancar(tarea) {
			let promesa

			try {
				promesa = Promise.resolve(tarea())
			} catch (err) {
				promesa = Promise.reject(err)
			}

			promesa.then(terminar, terminar)
		}

		avanzar()
	})
}
