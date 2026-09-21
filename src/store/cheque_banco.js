import __base_store from '@/store/__base_store'

/**
 * Store de bancos de cheques (modelo `cheque_banco`) construido desde el factory común.
 * Misión cheques-endoso-y-bancos (21/9/2026). Se descarga al iniciar sesión (mixins/call_methods.js,
 * entra por recursos-iniciales) porque el select de banco del cheque lo lee en cualquier pago.
 */
export default __base_store({
	state: {
		model_name: 'cheque_banco',
	},
})
