import __base_store from '@/store/__base_store'

/**
 * Store de cheques (modelo `check`).
 * Construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'check',
		from_dates: true,
		// Mantiene que por default estén vacías (como el store original).
		from_date: '',
		until_date: '',
	},
})

