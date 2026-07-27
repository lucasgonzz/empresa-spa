/**
 * Mixin compartido por Estado de Resultados, Flujo de Caja y Posicion Fiscal (grupo 227, tarea 06)
 * para abrir el modal de drill-down de un concepto. Evita repetir la misma logica de "pedir la
 * primera pagina + mostrar el modal" en los 3 componentes.
 */
export default {
	methods: {
		/**
		 * Pide la primera pagina del detalle de un concepto y muestra el modal compartido
		 * (components/reportes/components/detalle-modal/Index.vue, montado una unica vez en
		 * views/Reportes.vue).
		 *
		 * @param {String} concepto - uno de los 13 valores de la whitelist que acepta el backend
		 * en api/reportes/detalle (ventas_brutas, devoluciones, costo_mercaderia_vendida, gastos,
		 * iva_debito, iva_credito, percepciones_iva, percepciones_iibb, retenciones, cobranzas,
		 * pagos_proveedores, liquidaciones_pendientes, cheques_en_cartera).
		 */
		abrirDetalle(concepto) {
			if (!concepto) {
				return
			}
			this.$store.dispatch('reportes/getDetalle', {concepto: concepto, page: 1})
			this.$bvModal.show('reportes-detalle-modal')
		},
	},
}
