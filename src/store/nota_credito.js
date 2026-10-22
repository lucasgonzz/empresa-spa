import __base_store from '@/store/__base_store'

/**
 * Store de notas de crédito (modelo `nota_credito`) construido desde el factory común.
 */
export default __base_store({
	state: {
		model_name: 'nota_credito',
		from_dates: true,
		// "Por fecha" se pide paginado al servidor (22/10/2026): un rango largo no baja todas las
		// notas de crédito de golpe. Ver `paginar_por_fecha` en __base_store.js.
		paginar_por_fecha: true,
	},
})

