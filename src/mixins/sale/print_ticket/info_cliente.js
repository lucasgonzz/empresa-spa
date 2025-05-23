export default {
	methods: {
		info_cliente() {
			if (this.sale_to_print.client) {

            	this.letra_grande()

				this.content.push("Cliente: "+this.sale_to_print.client.name+'\n')

				if (this.sale_to_print.client.address) {
					this.content.push("Direccion: "+this.sale_to_print.client.address+'\n')
				}

            	this.letra_normal()
				this.linea()
			}
		},
	},
}