import __base_store from '@/store/__base_store'

/**
 * Store de plantillas para el PDF de ofertas de artículos (modelo `article_pdf`).
 */
export default __base_store({
	state: {
		model_name: 'article_pdf',

		// El listado de plantillas de PDF de ofertas decora el menú de "Imprimir"; si no carga
		// (corte de red), el usuario sigue pudiendo vender e imprimir el ticket normal sin
		// enterarse. No hace falta el cartel global de conexión por esto.
		omitir_cartel_de_conexion_en_listado: true,
	},
})
