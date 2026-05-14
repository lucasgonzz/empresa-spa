import __base_store from '@/store/__base_store'

/**
 * Store del catálogo `platform` (solo lectura vía `GET /api/platform` para el ABM de conectores).
 */
export default __base_store({
	state: {
		model_name: 'platform',
	},
})
