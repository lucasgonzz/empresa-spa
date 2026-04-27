import axios from 'axios'

/**
 * Módulo Vuex para la consolidación de ventas con fines de facturación AFIP.
 *
 * Gestiona:
 *   - La lista de ventas elegibles para consolidar de un cliente.
 *   - La selección de ventas a incluir en la consolidación.
 *   - El estado del proceso (loading, error, resultado).
 *   - Los parámetros de la nueva factura consolidada.
 */
export default {
    namespaced: true,

    state: {
        /** Indica si el modal de consolidación está visible. */
        show_modal: false,

        /** Ventas elegibles del cliente seleccionado para consolidar. */
        ventas_por_consolidar: [],

        /** IDs de las ventas seleccionadas por el usuario para la consolidación. */
        sale_ids_seleccionados: [],

        /** Estado de carga al pedir ventas elegibles o al consolidar. */
        loading: false,

        /** Mensaje de error del último intento de consolidación o carga. */
        error: null,

        /** Parámetros del filtro de búsqueda de ventas a consolidar. */
        client_id: null,
        from_date: null,
        until_date: null,

        /**
         * true si las ventas vienen de la grilla (selección múltiple) y no del flujo Buscar.
         */
        modo_desde_seleccion: false,

        /** Parámetros AFIP para la factura consolidada. */
        afip_information_id: null,
        afip_tipo_comprobante_id: null,
        afip_fecha_emision: null,
        monto_a_facturar: null,
        forma_de_pago: null,
        agrupar_items: false,
    },

    mutations: {
        /**
         * Abre el modal de consolidación limpiando el estado previo.
         * @param {Object} state
         */
        abrirModal(state) {
            state.show_modal = true
            state.ventas_por_consolidar = []
            state.sale_ids_seleccionados = []
            state.error = null
            state.modo_desde_seleccion = false
            state.from_date = null
            state.until_date = null
        },

        /**
         * Cierra el modal y limpia la selección.
         * @param {Object} state
         */
        cerrarModal(state) {
            state.show_modal = false
            state.sale_ids_seleccionados = []
            state.ventas_por_consolidar = []
            state.error = null
            state.modo_desde_seleccion = false
        },

        /**
         * Precarga el modal con ventas tomadas de la selección múltiple de la grilla.
         * @param {Object} state
         * @param {Object} payload
         * @param {number} payload.client_id
         * @param {Array}  payload.ventas  Modelos de venta (como en el listado)
         * @param {Array}  payload.sale_ids
         */
        prepararDesdeVentasSeleccionadas(state, { client_id, ventas, sale_ids }) {
            state.modo_desde_seleccion = true
            state.client_id = client_id
            state.ventas_por_consolidar = ventas.slice()
            state.sale_ids_seleccionados = sale_ids.slice()
            state.from_date = null
            state.until_date = null
            state.error = null
        },

        /**
         * Guarda la lista de ventas elegibles devuelta por la API.
         * @param {Object} state
         * @param {Array}  ventas
         */
        setVentasPorConsolidar(state, ventas) {
            state.ventas_por_consolidar = ventas
        },

        /**
         * Agrega o quita un ID de venta del array de seleccionados.
         * @param {Object} state
         * @param {number} sale_id
         */
        toggleSaleSeleccionado(state, sale_id) {
            const idx = state.sale_ids_seleccionados.indexOf(sale_id)
            if (idx === -1) {
                state.sale_ids_seleccionados.push(sale_id)
            } else {
                state.sale_ids_seleccionados.splice(idx, 1)
            }
        },

        /**
         * Selecciona todas las ventas visibles de una vez.
         * @param {Object} state
         */
        seleccionarTodas(state) {
            state.sale_ids_seleccionados = state.ventas_por_consolidar.map(v => v.id)
        },

        /**
         * Limpia la selección de ventas.
         * @param {Object} state
         */
        deseleccionarTodas(state) {
            state.sale_ids_seleccionados = []
        },

        setLoading(state, value) {
            state.loading = value
        },
        setError(state, value) {
            state.error = value
        },
        setClientId(state, value) {
            state.client_id = value
        },
        setFromDate(state, value) {
            state.from_date = value
        },
        setUntilDate(state, value) {
            state.until_date = value
        },
        setAfipInformationId(state, value) {
            state.afip_information_id = value
        },
        setAfipTipoComprobanteId(state, value) {
            state.afip_tipo_comprobante_id = value
        },
        setAfipFechaEmision(state, value) {
            state.afip_fecha_emision = value
        },
        setMontoAFacturar(state, value) {
            state.monto_a_facturar = value
        },
        setFormaDePago(state, value) {
            state.forma_de_pago = value
        },
        setAgruparItems(state, value) {
            state.agrupar_items = value
        },
    },

    actions: {
        /**
         * Consulta la API para obtener las ventas elegibles a consolidar
         * para el cliente y rango de fechas configurados.
         *
         * @param {Object} context
         */
        async cargarVentasPorConsolidar({ commit, state }) {
            commit('setLoading', true)
            commit('setError', null)
            commit('setVentasPorConsolidar', [])

            try {
                const params = { client_id: state.client_id }
                if (state.from_date) params.from = state.from_date
                if (state.until_date) params.until = state.until_date

                const res = await axios.get('/api/sales/por-consolidar', { params })
                commit('setVentasPorConsolidar', res.data.models)
            } catch (err) {
                console.error('consolidar_facturacion/cargarVentasPorConsolidar error:', err)
                commit('setError', 'No se pudieron cargar las ventas. Intentá de nuevo.')
            } finally {
                commit('setLoading', false)
            }
        },

        /**
         * Envía la solicitud de consolidación a la API y agrega la venta
         * resultante al store de ventas.
         *
         * @param {Object} context
         * @returns {Promise<boolean>} true si la consolidación fue exitosa.
         */
        async consolidar({ commit, state, dispatch }) {
            commit('setLoading', true)
            commit('setError', null)

            try {
                const payload = {
                    client_id:                state.client_id,
                    sale_ids:                 state.sale_ids_seleccionados,
                    afip_information_id:      state.afip_information_id,
                    afip_tipo_comprobante_id: state.afip_tipo_comprobante_id,
                    afip_fecha_emision:       state.afip_fecha_emision,
                    monto_a_facturar:         state.monto_a_facturar,
                    forma_de_pago:            state.forma_de_pago,
                    agrupar_items:            state.agrupar_items,
                }

                const res = await axios.post('/api/sales/consolidar-facturacion', payload)

                /** Agrega la venta consolidada al store de ventas para reflejarla en la UI. */
                commit('sale/add', res.data.model, { root: true })

                /** Recarga las ventas originales para actualizar su estado (consolidacion_facturacion_id). */
                await dispatch('sale/getModels', null, { root: true })

                /** Limpia la selección múltiple en la grilla de ventas. */
                commit('sale/setSelected', [], { root: true })

                commit('cerrarModal')
                return true
            } catch (err) {
                console.error('consolidar_facturacion/consolidar error:', err)
                const mensaje = err.response && err.response.data && err.response.data.message
                    ? err.response.data.message
                    : 'Error al consolidar ventas. Verificá los datos e intentá de nuevo.'
                commit('setError', mensaje)
                return false
            } finally {
                commit('setLoading', false)
            }
        },
    },

    getters: {
        /**
         * Total acumulado de las ventas seleccionadas para mostrar en el resumen del modal.
         * @param {Object} state
         * @returns {number}
         */
        total_seleccionado(state) {
            return state.ventas_por_consolidar
                .filter(v => state.sale_ids_seleccionados.includes(v.id))
                .reduce((acc, v) => acc + parseFloat(v.total || 0), 0)
        },
    },
}
