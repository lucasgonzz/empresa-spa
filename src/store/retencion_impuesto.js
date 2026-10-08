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
	},
})
