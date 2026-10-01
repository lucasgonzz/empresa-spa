import __base_store from '@/store/__base_store'

/**
 * Store de los Diseños de etiquetas de gondola (mision disenos-etiquetas-gondola, 29/9/2026).
 *
 * Se descarga al iniciar sesion (src/mixins/call_methods.js, via recursos-iniciales) porque el menu
 * de Listado -> "Documentos PDF" arma una opcion por diseño sin pedir nada. Lo escribe la solapa del
 * ABM (components/abm/disenos-de-etiquetas/).
 */
export default __base_store({
	state: {
		model_name: 'article_ticket_design',
		/*
			Sin cartel global de error para este listado: con una API todavia sin el endpoint (la SPA y
			la API de un cliente no se actualizan en el mismo instante) el store queda vacio y el menu
			de Listado imprime la etiqueta de siempre. Un cartel rojo en cada carga no le diria nada
			util a nadie. Mismo criterio que store/vender_layout.js.
		*/
		omitir_cartel_de_conexion_en_listado: true,
	},
})
