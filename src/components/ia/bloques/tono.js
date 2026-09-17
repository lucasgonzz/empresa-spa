/**
 * Mixin de los bloques del informe que colorean por `tono` (cifras, lista,
 * artículos). El validador del backend (§1.4) solo acepta ok | alerta | neutro;
 * cualquier otra cosa (o nada) se pinta como neutro, nunca rompe.
 */
const TONOS_VALIDOS = ['ok', 'alerta', 'neutro']

export default {
	methods: {
		tono_de(item) {
			if (item && TONOS_VALIDOS.indexOf(item.tono) != -1) {
				return item.tono
			}
			return 'neutro'
		},
	},
}
