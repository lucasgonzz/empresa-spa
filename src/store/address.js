import __base_store from '@/store/__base_store'

/**
 * Store de direcciones (modelo `address`) construido desde el factory común.
 *
 * Notas:
 * - Este store no requiere lógica adicional; usa el comportamiento estándar del base.
 * - Cualquier ajuste futuro se puede hacer vía overrides en `state/mutations/actions`.
 */
export default __base_store({
	/** Estado propio del modelo `address`. */
	state: {
		model_name: 'address',
	},
})

