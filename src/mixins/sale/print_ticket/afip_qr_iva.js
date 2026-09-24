export default {
	methods: {
		async print_iva_pagado() {
			return this.$api.get('/afip/get-importes/'+this.sale_to_print.id)
			.then(res => {
            	this.content.push(`TRANSPARENCIA FISCAL AL CONSUMIDOR LEY 27743\n`);
            	this.content.push(`Iva contenido: ${this.price(res.data.importes.gravado)}\n`);
            	this.print_leyenda_isib_caba(res.data.leyenda_isib_caba)
            	this.linea()
            	// this.qr('https://google.com.ar')
            	this.qr(res.data.afip_qr_link)
			})
		},
		// Leyenda ISIB CABA (Res. 169/AGIP/2026). La arma el backend (LeyendaIsibCabaHelper) y viaja
		// en get-importes: un renglon por parte, [] si el comprobante no la lleva. Con una API
		// vieja la clave no viene y no se imprime nada.
		//
		// 🔴 Va SIN tilde ("ALICUOTA"): reset_impresora() manda ESC t 2, que en Epson y sus clones
		// es la tabla PC850, y contenido_a_base64() manda Latin-1. La Í de Latin-1 (0xCD) en PC850
		// es "═": el renglon legal saldria "AL═CUOTA". Sin tilde se lee igual en cualquier tabla.
		print_leyenda_isib_caba(partes) {
			if (!partes || !partes.length) {
				return
			}
			let self = this
			partes.forEach(parte => {
				let sin_tildes = parte.normalize('NFD').replace(/[̀-ͯ]/g, '')
				self.wrapText(sin_tildes, self.TICKET_WIDTH).forEach(renglon => {
					self.content.push(renglon + '\n')
				})
			})
		},
		qr(link) {

			// Tamaño de los puntos del QR (entre 1 y 16)
			var dots = '\x05'; // 9 es un tamaño mediano

			// Cálculo del largo del contenido para la impresora
			var qrLength = link.length + 3;
			var size1 = String.fromCharCode(qrLength % 256);
			var size0 = String.fromCharCode(Math.floor(qrLength / 256));

			// Construcción del comando ESC/POS para imprimir QR
			this.content.push('\x0A')

			// === COMANDOS PARA IMPRIMIR EL QR ===
			this.content.push('\x1D' + '\x28' + '\x6B' + '\x04' + '\x00' + '\x31' + '\x41' + '\x32' + '\x00') // Modelo 2
			this.content.push('\x1D' + '\x28' + '\x6B' + '\x03' + '\x00' + '\x31' + '\x43' + dots)            // Tamaño del punto
			this.content.push('\x1D' + '\x28' + '\x6B' + '\x03' + '\x00' + '\x31' + '\x45' + '\x30')          // Nivel de corrección
			this.content.push('\x1D' + '\x28' + '\x6B' + size1 + size0 + '\x31' + '\x50' + '\x30' + link)       // Datos QR
			this.content.push('\x1D' + '\x28' + '\x6B' + '\x03' + '\x00' + '\x31' + '\x51' + '\x30')          // Imprimir QR
			this.content.push('\x1D' + '\x28' + '\x6B' + '\x03' + '\x00' + '\x31' + '\x52' + '\x30')          // Tamaño info

			this.content.push('\x0A')
			this.content.push('\x0A')

            this.content.push("\n");
		}
	}
}