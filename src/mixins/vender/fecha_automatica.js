export default {
	mounted() {
		this.refrescar_fecha_de_venta()
		window.addEventListener('focus', this.refrescar_fecha_de_venta)
		window.addEventListener('pageshow', this.refrescar_fecha_de_venta)
		document.addEventListener('visibilitychange', this.refrescar_fecha_de_venta)
		// El guardado vuelve a comprobar el reloj aunque el navegador suspenda este intervalo.
		this.intervalo_fecha_de_venta = window.setInterval(this.refrescar_fecha_de_venta, 1000)
	},
	beforeDestroy() {
		window.removeEventListener('focus', this.refrescar_fecha_de_venta)
		window.removeEventListener('pageshow', this.refrescar_fecha_de_venta)
		document.removeEventListener('visibilitychange', this.refrescar_fecha_de_venta)
		window.clearInterval(this.intervalo_fecha_de_venta)
	},
	methods: {
		refrescar_fecha_de_venta() {
			this.$store.commit('vender/refrescar_fecha_automatica')
		},
	},
}
