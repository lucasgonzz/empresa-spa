<template>
	<b-button
	class="m-t-15 m-b-25"
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
		discounts_id() {
			return this.$store.state.devoluciones.discounts_id 
		},
		surchages_id() {
			return this.$store.state.devoluciones.surchages_id 
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
					discounts: this.get_models_by_id('discount', this.discounts_id),
					surchages: this.get_models_by_id('surchage', this.surchages_id),
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
			let ok = true
			if (
				this.regresar_stock
				&& this.addresses.length
				&& !this.address_id
			) {
				this.$toast.error('Indique el deposito destino')
				ok = false
			}

			if (this.total_devolucion == 0) {
				this.$toast.error('Indique unidades devueltas')
				ok = false
			}

			this.articles.forEach(article => {
				if (
					article.article_variants.length
					&& !article.article_variant_id
				) {
					this.$toast.error('Indique variante de '+article.name)
					ok = false
				}
			})

			return ok
		}
	}
}
</script>