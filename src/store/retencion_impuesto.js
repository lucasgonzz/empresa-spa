import __base_store from '@/store/__base_store'

/**
 * Store de impuestos de retención (modelo `retencion_impuesto`) construido desde el factory común.
 * Misión retenciones-abm-impuestos (8/10/2026). Se descarga al iniciar sesión
 * (mixins/call_methods.js, entra por recursos-iniciales) porque el selector de impuesto del cobro
 * con retención (RetencionInfo.vue) lo lee en cualquier cobro. Ganancias, IVA e Ingresos Brutos no
 * están acá: son fijos en el componente.
 */
export default __base_store({
	state: {
		model_name: 'retencion_impuesto',
		/*
			Sin cartel global de error para este listado. Con una API que todavia no conoce el recurso
			(la SPA y la API de un cliente no se actualizan en el mismo instante), recursos-iniciales lo
			devuelve en `no_soportados`, la SPA lo pide suelto, recibe un 404 y, sin esto, sacaba un toast
			rojo generico en CADA arranque. Sin el listado el selector del cobro sigue con los tres
			impuestos de siempre. Mismo criterio que store/balanza.js. Se traduce a
			`skip_global_error_event` en __base_store::_getModels.
		*/
		omitir_cartel_de_conexion_en_listado: true,
	},
})
