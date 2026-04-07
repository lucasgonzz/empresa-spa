import __base_store from '@/store/__base_store'
import moment from 'moment'

/**
 * Store de charts (modelo `chart`).
 * Construido desde el factory común.
 *
 * Nota: mantiene el comportamiento original de fechas por defecto.
 */
export default __base_store({
	state: {
		model_name: 'chart',
		from_dates: true,
		from_date: moment().subtract(1, 'months').format('YYYY-MM-DD'),
		until_date: moment().format('YYYY-MM-DD'),
	},
})

