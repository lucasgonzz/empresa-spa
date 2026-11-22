// Aviso de la demanda no satisfecha de Vender (misión demanda-sin-stock-vender).
// Guarda el aviso que muestra AvisoDemandaSinStock.vue tras un freno por stock.
export default {
	namespaced: true,
	state: () => ({
		// null = sin aviso; si no: { ids: [id de unmet_demands], nombres: [string], motivo, combo_nombre }
		aviso: null,
	}),
	mutations: {
		/**
		 * Muestra un aviso nuevo (reemplaza al anterior, si había).
		 *
		 * @param {object} state Estado del módulo.
		 * @param {object} aviso `{ ids, nombres, motivo, combo_nombre }`.
		 */
		set_aviso(state, aviso) {
			state.aviso = aviso
		},
		/**
		 * Quita el aviso (Cancelar, Entendido o vencido).
		 *
		 * @param {object} state Estado del módulo.
		 */
		limpiar_aviso(state) {
			state.aviso = null
		},
	},
}
