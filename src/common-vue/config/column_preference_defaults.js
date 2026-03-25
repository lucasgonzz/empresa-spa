/**
 * Valores por defecto para anchos de columnas (preferencias tabla / búsqueda).
 * Centralizar aquí para ajustar sin buscar números mágicos en varios componentes.
 */
export const column_preference_defaults = {
	/** Ancho estándar cuando no hay preferencia ni table_width en el modelo */
	default_property_width_px: 200,
	/** Ancho para columnas muy angostas (ej. id, número de fila) */
	narrow_property_width_px: 100,
	/** Keys de propiedad que usan narrow_property_width_px si no hay otro ancho definido */
	narrow_property_keys: ['id', 'num'],
}

/**
 * Ancho por defecto en px según la definición del modelo (table_width, lg) y narrow keys.
 * @param {Object} prop property del modelo (key, table_width, …)
 */
export function default_column_width_for_property(prop) {
	if (!prop) {
		return column_preference_defaults.default_property_width_px
	}
	if (
		prop.key
		&& column_preference_defaults.narrow_property_keys.includes(prop.key)
	) {
		if (prop.table_width && Number(prop.table_width) > 0) {
			return Number(prop.table_width)
		}
		if (prop.table_width === 'lg') {
			return 300
		}
		return column_preference_defaults.narrow_property_width_px
	}
	if (prop.table_width && Number(prop.table_width) > 0) {
		return Number(prop.table_width)
	}
	if (prop.table_width === 'lg') {
		return 300
	}
	return column_preference_defaults.default_property_width_px
}

/**
 * Fallback cuando solo tenemos key (ej. filas ya normalizadas sin width).
 * @param {string} key
 */
export function fallback_column_width_px(key) {
	if (key && column_preference_defaults.narrow_property_keys.includes(key)) {
		return column_preference_defaults.narrow_property_width_px
	}
	return column_preference_defaults.default_property_width_px
}
