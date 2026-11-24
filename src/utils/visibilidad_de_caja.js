/**
 * Visibilidad de las cajas (misión cajas-permisos-claros, 24/11/2026).
 *
 * Funciones puras, sin store ni componente: las usan Caja.vue (listado de Tesorería), el formulario de la
 * caja (componente permisos/), el filtro de Vender (mixins/generals.js) y la prueba
 * tests/visibilidad-de-caja.test.cjs.
 *
 * La regla vive UNA vez en la API (CajaVisibilidadHelper) y esta es su espejo para que el SPA pueda
 * mostrarla antes de guardar y siga andando contra una API que todavía no manda los campos nuevos:
 *
 *  - Quién VE una caja en Tesorería: el dueño y los administradores ven todas. Para el resto, si la caja
 *    tiene lista de Tesorería (`treasury_users`), sólo los de esa lista; si no, si tiene lista de Vender
 *    (`users`), sólo los de esa lista (herencia); si las dos están vacías, todos.
 *  - Quién USA una caja en Vender: el dueño y los administradores todas. Para el resto, la lista `users`;
 *    si está vacía, todos.
 */

/** Permiso que habilita entrar al módulo de Tesorería. */
const PERMISO_TESORERIA = 'caja.index'

/**
 * ¿El usuario es dueño o administrador (ve y usa todas las cajas)?
 *
 * @param {Object|null} user Usuario o empleado (con `owner_id` y `admin_access`).
 * @returns {boolean}
 */
function es_administrador(user) {
	return !!user && (!user.owner_id || !!user.admin_access)
}

/**
 * ¿El usuario está en una lista de empleados de la caja?
 *
 * @param {Array<Object>|undefined} lista Lista (`users` o `treasury_users`).
 * @param {Object} user Usuario a buscar.
 * @returns {boolean}
 */
function esta_en_lista(lista, user) {
	return (lista || []).some(function (item) {
		return item.id == user.id
	})
}

/**
 * Los nombres de una lista de empleados, separados por coma.
 *
 * @param {Array<Object>|undefined} lista Lista de empleados de la caja.
 * @returns {string}
 */
function nombres_de_lista(lista) {
	return (lista || []).map(function (item) {
		return item.name
	}).join(', ')
}

/**
 * ¿El usuario ve esta caja en Tesorería? Si la caja trae `ve_en_tesoreria` (lo calcula el servidor para el
 * usuario logueado) se respeta; si no (API vieja o caja armada a mano), se aplica la regla local.
 *
 * @param {Object} caja Caja del store (con `treasury_users` y `users`).
 * @param {Object} user Usuario logueado.
 * @returns {boolean}
 */
export function ve_en_tesoreria(caja, user) {
	if (es_administrador(user)) {
		return true
	}
	if (typeof caja.ve_en_tesoreria !== 'undefined' && caja.ve_en_tesoreria !== null) {
		return !!caja.ve_en_tesoreria
	}
	return regla_tesoreria(caja, user).ve
}

/**
 * ¿El usuario puede usar esta caja en Vender? Si la caja trae `opera_en_vender` se respeta; si no, la
 * regla local.
 *
 * @param {Object} caja Caja del store (con `users`).
 * @param {Object} user Usuario logueado.
 * @returns {boolean}
 */
export function opera_en_vender(caja, user) {
	if (es_administrador(user)) {
		return true
	}
	if (typeof caja.opera_en_vender !== 'undefined' && caja.opera_en_vender !== null) {
		return !!caja.opera_en_vender
	}
	return regla_vender(caja, user).usa
}

/**
 * ¿De dónde sale la regla de Tesorería de esta caja? Si la caja trae `origen_visibilidad_tesoreria` se
 * respeta; si no, se deduce de las listas.
 *
 * @param {Object} caja Caja del store.
 * @returns {string} 'lista_tesoreria' | 'lista_vender' | 'todos'
 */
export function origen_tesoreria(caja) {
	if (caja.origen_visibilidad_tesoreria) {
		return caja.origen_visibilidad_tesoreria
	}
	if ((caja.treasury_users || []).length) {
		return 'lista_tesoreria'
	}
	if ((caja.users || []).length) {
		return 'lista_vender'
	}
	return 'todos'
}

/**
 * La regla de Tesorería para un usuario NO administrador, mirando sólo las listas de la caja (nunca los
 * campos del servidor: sirve también para el resumen por empleado y para listas sin guardar).
 *
 * @param {Object} caja Caja (con `treasury_users` y `users`).
 * @param {Object} user Empleado.
 * @returns {{ve: boolean, motivo: string}}
 */
function regla_tesoreria(caja, user) {
	if ((caja.treasury_users || []).length) {
		let esta = esta_en_lista(caja.treasury_users, user)
		return { ve: esta, motivo: esta ? 'Está en la lista' : 'No está en la lista' }
	}
	if ((caja.users || []).length) {
		return {
			ve: esta_en_lista(caja.users, user),
			motivo: 'Sin lista de Tesorería: se usa la de Vender',
		}
	}
	return { ve: true, motivo: 'Lista vacía: la ven todos' }
}

/**
 * La regla de Vender para un usuario NO administrador, mirando sólo la lista `users` de la caja.
 *
 * @param {Object} caja Caja (con `users`).
 * @param {Object} user Empleado.
 * @returns {{usa: boolean, motivo: string}}
 */
function regla_vender(caja, user) {
	if ((caja.users || []).length) {
		let esta = esta_en_lista(caja.users, user)
		return { usa: esta, motivo: esta ? 'Está en la lista' : 'No está en la lista' }
	}
	return { usa: true, motivo: 'Lista vacía: la pueden usar todos' }
}

/**
 * ¿El empleado puede entrar a Tesorería? Administrador o con el permiso `caja.index`. Si el empleado no
 * trae la lista de permisos (dato incompleto) no se lo descarta: la tabla no debe afirmar de más.
 *
 * @param {Object} employee Empleado.
 * @returns {boolean}
 */
function entra_a_tesoreria(employee) {
	if (es_administrador(employee)) {
		return true
	}
	if (!Array.isArray(employee.permissions)) {
		return true
	}
	return employee.permissions.some(function (permission) {
		return permission.slug == PERMISO_TESORERIA
	})
}

/**
 * Una fila por empleado con lo que ve y lo que usa de esta caja, para la tabla «Quién ve y quién usa esta
 * caja». Mira las listas de la caja que recibe: si es el modelo del formulario, reacciona a lo que se va
 * cargando antes de guardar.
 *
 * @param {Object} caja Caja (o el modelo del formulario) con `treasury_users` y `users`.
 * @param {Array<Object>} employees Empleados del store.
 * @returns {Array<Object>} `{ id, name, sucursal_id, entra_a_tesoreria, ve_en_tesoreria, motivo_tesoreria,
 *                            usa_en_vender, motivo_vender }`
 */
export function resumen_por_empleado(caja, employees) {
	let filas = []
	;(employees || []).forEach(function (employee) {
		let admin = es_administrador(employee)
		let entra = entra_a_tesoreria(employee)
		let en_tesoreria = regla_tesoreria(caja, employee)
		let en_vender = regla_vender(caja, employee)

		let ve = entra && (admin || en_tesoreria.ve)
		let motivo_tesoreria = en_tesoreria.motivo
		if (!entra) {
			motivo_tesoreria = 'No tiene permiso para entrar a Tesorería'
		} else if (admin) {
			motivo_tesoreria = 'Administrador: ve todas'
		}

		filas.push({
			id: employee.id,
			name: employee.name,
			sucursal_id: employee.address_id || null,
			entra_a_tesoreria: entra,
			ve_en_tesoreria: ve,
			motivo_tesoreria: motivo_tesoreria,
			usa_en_vender: admin || en_vender.usa,
			motivo_vender: admin ? 'Administrador: usa todas' : en_vender.motivo,
		})
	})
	return filas
}

/**
 * Los ids de los empleados asignados a una sucursal (atajo «Sólo los empleados de la sucursal»).
 *
 * @param {Number|null} address_id Sucursal de la caja.
 * @param {Array<Object>} employees Empleados del store (con `address_id`).
 * @returns {Array<Number>}
 */
export function empleados_de_la_sucursal(address_id, employees) {
	if (!address_id) {
		return []
	}
	return (employees || []).filter(function (employee) {
		return employee.address_id == address_id
	}).map(function (employee) {
		return employee.id
	})
}

/**
 * El renglón de estado de la lista de Vender, siempre visible debajo del campo.
 *
 * @param {Object} caja Caja (o modelo del formulario).
 * @returns {string}
 */
export function texto_estado_vender(caja) {
	let cantidad = (caja.users || []).length
	if (!cantidad) {
		return 'Lista vacía: TODOS los empleados pueden usar esta caja en Vender.'
	}
	if (cantidad == 1) {
		return 'Sólo 1 empleado la usa en Vender.'
	}
	return 'Sólo estos ' + cantidad + ' empleados la usan en Vender.'
}

/**
 * El renglón de estado de la lista de Tesorería, con la herencia explícita.
 *
 * @param {Object} caja Caja (o modelo del formulario).
 * @returns {{texto: string, aviso: boolean}} `aviso` es true cuando la caja queda abierta a todos.
 */
export function texto_estado_tesoreria(caja) {
	let cantidad = (caja.treasury_users || []).length
	if (cantidad == 1) {
		return { texto: 'Sólo 1 empleado la ve en Tesorería.', aviso: false }
	}
	if (cantidad) {
		return { texto: 'Sólo estos ' + cantidad + ' empleados la ven en Tesorería.', aviso: false }
	}
	if ((caja.users || []).length) {
		return {
			texto: 'Lista vacía: se usa la lista de Vender (' + nombres_de_lista(caja.users) + ').',
			aviso: false,
		}
	}
	return {
		texto: 'Las dos listas vacías: TODOS los empleados con permiso de Tesorería ven esta caja.',
		aviso: true,
	}
}
