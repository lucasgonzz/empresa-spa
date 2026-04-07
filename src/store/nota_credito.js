import __base_store from '@/store/__base_store'

/**
 * Store de notas de crédito (modelo `nota_credito`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'nota_credito',
		from_dates: true,
	},
})

