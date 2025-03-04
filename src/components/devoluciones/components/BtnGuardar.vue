<template>
	<b-button
	class="m-t-15"
	v-if="articles.length"
	block
	@click="guardar"
	variant="primary">
		Guardar
	</b-button>
</template>
<script>
import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [limpiar],
	computed: {
		sale() {
			return this.$store.state.devoluciones.sale 
		},
		articles() {
			return this.$store.state.devoluciones.articles 
		},
		client() {
			return this.$store.state.devoluciones.client 
		},
		total_devolucion() {
			return this.$store.state.devoluciones.total_devolucion 
		},
		regresar_stock() {
			return this.$store.state.devoluciones.regresar_stock 
		},
		generar_current_acount() {
			return this.$store.state.devoluciones.generar_current_acount 
		},
		addresses() {
			return this.$store.state.address.models 
		},
		address_id() {
			return this.$store.state.devoluciones.address_id 
		},
		facturar_nota_credito() {
			return this.$store.state.devoluciones.facturar_nota_credito 
		},
	},
	methods: {
		guardar() {
			if (this.check()) {

				this.$store.commit('auth/setMessage', 'Guardando')
				this.$store.commit('auth/setLoading', true)

				let items = this.articles

				console.log('facturar_nota_credito: '+this.facturar_nota_credito)
				this.$api.post('devoluciones', {
					sale_id: this.sale ? this.sale.id : null,
					total_devolucion: this.total_devolucion,
					items: items,
					client_id: this.client ? this.client.id : null,
					regresar_stock: this.regresar_stock,
					generar_current_acount: this.generar_current_acount,
					address_id: this.address_id,
					facturar_nota_credito: this.facturar_nota_credito,
				})
				.then(res => {
					
					this.$store.commit('auth/setLoading', false)

					this.$toast.success('Devolucion creada')

					this.limpiar_devolucion()


				})
				.catch(err => {
					this.$store.commit('auth/setLoading', false)
				})
			}
		},
		check() {
			if (
				this.addresses.length
				&& !this.address_id
			) {
				this.$toast.error('Indique el deposito destino')
				return false
			}

			if (this.total_devolucion == 0) {
				this.$toast.error('Indique unidades devueltas')
				return false
			}
			return true
		}
	}
}
</script>