/** Verifica la capacidad ANTES de escribir: una sesión puede sobrevivir a una rotación del sistema. */
export function instalar_guardia_cotizaciones(instancia, prefijo = '/api/') {
	if (instancia._guardia_cotizaciones_articulos) return
	instancia._guardia_cotizaciones_articulos = true
	instancia.interceptors.request.use(function (config) {
		let ruta = String(config.url || '')
		let escritura = ['post', 'put', 'patch'].indexOf(String(config.method).toLowerCase()) >= 0
		let datos = config.data
		let contrato = datos && typeof datos === 'object' && JSON.stringify(datos).indexOf('cotizacion_origen') >= 0
		if (!escritura || !contrato || !/(^|\/)(sale|budget)(\/|$)/.test(ruta)) return config
		return instancia.get(prefijo + 'vender/cotizaciones-articulos').then(function (res) {
			if (!res.data.supported) throw new Error('El sistema todavía no puede conservar las cotizaciones por artículo. Volvé a cargarlo antes de guardar.')
			return config
		}).catch(function () {
			throw new Error('No se pudo verificar que el sistema conserve las cotizaciones por artículo. El comprobante no se guardó; volvé a intentar.')
		})
	})
}
