export default {
	methods: {
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
			}

			return filter 
		}
	}
}