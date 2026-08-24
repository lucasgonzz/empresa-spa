export default {
	methods: {
		/*
			🔴 Devuelve un valor de DATO, con punto decimal, y asi tiene que quedarse. NO le pongas
			separadores argentinos aca aunque el numero termine mostrandose en pantalla.

			El resultado no se usa solo para mostrar: tambien se compara y se ordena.
			  - esta_en_el_rango() de abajo hace Number(numero) >= Number(range.min)
			  - Index.vue:68 ordena con .sort((a, b) => get_procentaje_de_aumento(a) - ...(b))
			  - Index.vue:92 lo pasa por esta_en_el_rango() para elegir el color de la celda

			Number('12,50') es NaN. Con una coma aca, el filtro por rango deja de filtrar, el orden
			se rompe y las celdas pierden el color, todo en silencio.

			El formateo para la vista se aplica en el UNICO punto donde se muestra:
			Index.vue, computed items(), la clave `porcentaje`.

			Mision del 21/8/2026 — separadores de numeros.
		*/
		get_procentaje_de_aumento(article) {
			let porcentaje = (Number(article.pivot.costo_nuevo) * 100 / Number(article.pivot.costo_actual)) - 100
			return porcentaje.toFixed(2)
		},
		esta_en_el_rango(numero, range) {
			return Number(numero) >= Number(range.min) && (range.max == 100 || Number(numero) <= Number(range.max))
		}
	}
}