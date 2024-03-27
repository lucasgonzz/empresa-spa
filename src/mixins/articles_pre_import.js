export default {
	methods: {
		get_procentaje_de_aumento(article) {
			let porcentaje = (Number(article.pivot.costo_nuevo) * 100 / Number(article.pivot.costo_actual)) - 100
			return porcentaje.toFixed(2)
		},
		esta_en_el_rango(numero, range) {
			return Number(numero) >= Number(range.min) && (range.max == 100 || Number(numero) <= Number(range.max))
		}
	}
}