export default {
	methods: {
		info_cliente() {
			if (this.sale_to_print.client) {
				this.content.push("Cliente: "+this.sale_to_print.client.name+'\n')
				this.linea()
			}
		},
	},
}