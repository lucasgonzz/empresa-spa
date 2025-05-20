export default {
	methods: {
		async print_iva_pagado() {
			return this.$api.get('/afip/get-importes/'+this.sale_to_print.id)
			.then(res => {
            	this.content.push(`TRANSPARENCIA FISCAL AL CONSUMIDOR LEY 27743\n`);
            	this.content.push(`Iva contenido: ${this.price(res.data.importes.gravado)}\n`);
            	this.linea()
            	// this.qr('https://google.com.ar')
            	this.qr(res.data.afip_qr_link)
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