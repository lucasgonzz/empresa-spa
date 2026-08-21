/**
 * Icono y modificador de clase de cada tipo de renglon del desglose del precio.
 *
 * Los `tipo` los manda el backend ya clasificados (DesglosePrecioHelper::tipos() en empresa-api).
 * Hasta esta mision el front tenia que adivinar de que hablaba cada renglon leyendo el texto
 * -- decidia que un renglon era titulo con `des === des.toUpperCase()`, heuristica que ya fallo con
 * las listas de nombre acentuado (hallazgo 20260805) --. Ahora la clasificacion viaja en el dato.
 *
 * 🔴 POR_DEFECTO no es decoracion defensiva: es lo que hace que agregar un tipo nuevo en el backend
 * no rompa la pantalla de las cuentas que todavia no recargaron el bundle. Un tipo desconocido se
 * dibuja neutro, con el texto completo igual de legible.
 *
 * Los modificadores que no tienen regla propia en _desglose_precio.sass (unidades, redondeo) caen
 * en el acento neutro que la clase base ya declara. Esta bien asi: son pasos del calculo que no
 * pertenecen a ninguna familia de plata.
 */
export const POR_DEFECTO = {
	icono: 'bi-info-circle',
	modificador: 'nota',
}

export const TIPOS = {
	costo:         { icono: 'bi-box-seam',        modificador: 'costo' },
	margen:        { icono: 'bi-graph-up-arrow',  modificador: 'margen' },
	iva:           { icono: 'bi-receipt',         modificador: 'iva' },
	descuento:     { icono: 'bi-tag',             modificador: 'descuento' },
	recargo:       { icono: 'bi-plus-circle',     modificador: 'recargo' },
	// Mismo color que el recargo --es de la misma familia: algo que la lista aplica sobre el
	// precio-- pero con el icono al reves, porque RESTA. Los price_type_surchages se llaman
	// "recargos" en el modelo y el codigo les hace -=; el icono es lo primero que entra por el
	// ojo, asi que es el que tiene que decir el signo.
	deduccion:     { icono: 'bi-dash-circle',     modificador: 'recargo' },
	impuesto:      { icono: 'bi-bank',            modificador: 'impuesto' },
	cotizacion:    { icono: 'bi-currency-dollar', modificador: 'cotizacion' },
	unidades:      { icono: 'bi-boxes',           modificador: 'unidades' },
	redondeo:      { icono: 'bi-arrow-repeat',    modificador: 'redondeo' },
	precio_manual: { icono: 'bi-pencil-square',   modificador: 'manual' },
	nota:          { icono: 'bi-info-circle',     modificador: 'nota' },
	total:         { icono: 'bi-check2-circle',   modificador: 'total' },
}

/**
 * Icono y modificador de un tipo. Nunca devuelve undefined.
 *
 * @param {String} tipo
 * @returns {{icono: String, modificador: String}}
 */
export function estilo_de(tipo) {
	if (tipo && TIPOS[tipo]) {
		return TIPOS[tipo]
	}
	return POR_DEFECTO
}
