export default {
	methods: {
		/**
		 * Indica si un filtro puntual tiene criterio activo (tabla o modal horizontal).
		 *
		 * @param {Object} filter
		 * @returns {boolean}
		 */
		filter_has_active_values(filter) {
			if (!filter) {
				return false
			}

			/*
				El ORDEN cuenta como criterio activo SOLO para decidir que este filtro viaja al
				backend: sin el, la columna no se ordenaria. NO cuenta para decidir si el usuario
				"filtro" algo -- para eso esta filter_has_value_criteria(), abajo.

				La diferencia no es cosmetica: ordenar una columna prendia el cartel de
				"N filtrados" sin que nadie filtrara nada, y hacia que "Exportar Excel" creyera
				que habia filtros y encolara la tabla ENTERA en silencio, porque el backend no
				recibia ningun WHERE.
			*/
			if (filter.ordenar_de !== null && filter.ordenar_de !== '' && typeof filter.ordenar_de !== 'undefined') {
				return true
			}

			return this.filter_has_value_criteria(filter)
		},
		/**
		 * Igual que filter_has_active_values pero SIN el criterio de orden: dice si el usuario
		 * puso un criterio de VALOR (un texto, un rango, un select, en blanco / no en blanco).
		 *
		 * Es la que hay que usar para decidir si el listado esta filtrado: si el flag o la
		 * exportacion miraran el orden, ordenar una columna contaria como filtrar.
		 *
		 * @param {Object} filter
		 * @returns {boolean}
		 */
		filter_has_value_criteria(filter) {
			if (!filter) {
				return false
			}

			if (typeof filter.en_blanco !== 'undefined' && filter.en_blanco) {
				return true
			}
			if (typeof filter.no_en_blanco !== 'undefined' && filter.no_en_blanco) {
				return true
			}

			if (typeof filter.value !== 'undefined' && filter.value !== '' && filter.value !== null) {
				if (filter.type === 'select' || filter.type === 'search') {
					return filter.value !== 0
				}
				if (filter.type === 'boolean') {
					return filter.value !== -1
				}
				return true
			}

			let type = filter.type

			if (type === 'select' || type === 'search') {
				return filter.igual_que !== 0 && filter.igual_que !== '' && filter.igual_que !== null && typeof filter.igual_que !== 'undefined'
			}

			if (type === 'checkbox') {
				return typeof filter.checkbox !== 'undefined' && filter.checkbox !== -1
			}

			if (type === 'date') {
				return (typeof filter.menor_que !== 'undefined' && filter.menor_que !== '')
					|| (typeof filter.igual_que !== 'undefined' && filter.igual_que !== '')
					|| (typeof filter.mayor_que !== 'undefined' && filter.mayor_que !== '')
			}

			if (type === 'number') {
				return (typeof filter.menor_que !== 'undefined' && filter.menor_que !== '')
					|| (typeof filter.igual_que !== 'undefined' && filter.igual_que !== '' && filter.igual_que !== null)
					|| (typeof filter.mayor_que !== 'undefined' && filter.mayor_que !== '')
			}

			return (typeof filter.que_contenga !== 'undefined' && filter.que_contenga !== '')
				|| (typeof filter.igual_que !== 'undefined' && filter.igual_que !== '')
		},
		/**
		 * Devuelve solo los filtros con criterio de VALOR, listos para backend.
		 *
		 * Mira filter_has_value_criteria y NO filter_has_active_values: si contara el orden, en un
		 * listado recien abierto y ordenado por una columna esto devolveria un filtro, los
		 * consumidores creerian que hay filtros activos, y en vez del toast "No hay filtros activos
		 * para exportar" encolarian un export de la tabla ENTERA -- sin ningun WHERE del lado del
		 * backend. En un catalogo grande eso es un archivo enorme que nadie pidio.
		 *
		 * @param {Array} filters
		 * @returns {Array}
		 */
		get_active_filters_for_export(filters) {
			let active_filters = []

			if (!filters || !filters.length) {
				return active_filters
			}

			filters.forEach(filter => {
				if (!this.filter_has_value_criteria(filter)) {
					return
				}
				active_filters.push(filter)
			})

			return active_filters
		},
		limpiar_filtro(filter, limpiar_en_blanco = true) {

			if (
				filter.type == 'search'
				|| filter.type == 'select'
				) {

				filter.igual_que = 0
			} else {
				filter.igual_que = ''
				filter.igual_que = ''
				filter.mayor_que = ''
				filter.menor_que = ''
				filter.que_contenga = ''
				filter.checkbox = -1
			}

			if (limpiar_en_blanco) {
				filter.en_blanco = 0
				filter.no_en_blanco = 0
			}

			return filter 
		}
	}
}