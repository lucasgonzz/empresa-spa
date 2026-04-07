import __base_store from '@/store/__base_store'

/**
 * Store de tags (modelo `tag`) construido desde el factory común.
 * Mantiene el módulo `tag` registrado en `src/store/index.js` y permite override total.
 */
export default __base_store({
	/**
	 * Estado propio del modelo `tag`.
	 * Solo se declara lo que difiere del default del base o lo que queremos fijar explícitamente.
	 */
	state: {
		model_name: 'tag',
		route_prefix: '',
		from_dates: false,
		use_per_page: false,
	},
})

