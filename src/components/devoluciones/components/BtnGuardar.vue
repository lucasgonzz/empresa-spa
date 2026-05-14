<template>
	<b-button
	class="m-t-15 m-b-25"
	v-if="items.length"
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
		items() {
			return this.$store.state.devoluciones.items 
		},
		descriptions() {
			return this.$store.state.devoluciones.descriptions 
		},
		client() {
			return this.$store.state.devoluciones.client 
		},
		total_devolucion() {
			return this.$store.state.devoluciones.total_devolucion 
		},
		update_unidades_devueltas() {
			return this.$store.state.devoluciones.update_unidades_devueltas 
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

				let items = this.items

				console.log('facturar_nota_credito: '+this.facturar_nota_credito)
				this.$api.post('devoluciones', {
					sale_id: this.sale ? this.sale.id : null,
					total_devolucion: this.total_devolucion,
					items: items,
					client_id: this.client ? this.client.id : null,
					update_unidades_devueltas: this.update_unidades_devueltas,
					regresar_stock: this.regresar_stock,
					generar_current_acount: this.generar_current_acount,
					address_id: this.address_id,
					facturar_nota_credito: this.facturar_nota_credito,
					descriptions: this.descriptions,
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
					this.$toast.error(err)
					this.$toast.error('Ocurrio un error al crear la devolucion')
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

			if (
				this.sale
				&& this.facturar_nota_credito
			) {
				let afip_ticket = this.sale.afip_tickets.find(m => m.id == this.facturar_nota_credito)
				// Tolerancia en pesos: el total de devolución puede exceder al de la factura hasta este monto (p. ej. redondeos).
				let max_total_devolucion_over_invoice = 2
				if (
					typeof afip_ticket != 'undefined' 
					&& Number(this.total_devolucion) > Number(afip_ticket.importe_total) + max_total_devolucion_over_invoice
				) {
					this.$toast.error('El total de la devolucion ('+this.price(this.total_devolucion)+') no puede superar en más de '+this.price(max_total_devolucion_over_invoice)+' al total de la Factura N° '+afip_ticket.cbte_numero+' ('+ this.price(afip_ticket.importe_total) +')')
					ok = false
				} 
			}

			if (
				this.sale
				&& this.sale.afip_tickets.length
				&& !this.facturar_nota_credito
			) {
				return confirm('La venta sobre la cual vas a generar esta nota de credito esta facturada, recomendamos facturar esta nota de credito sobre alugna factura de esta venta. ¿Queres continuar de todas formas y no facturar esta nota de credito?')
			}

			// this.items.forEach(item => {
			// 	if (
			// 		item.is_article
			// 		&& item.article_variants.length
			// 		&& !item.article_variant_id
			// 	) {
			// 		this.$toast.error('Indique variante de '+item.name)
			// 		ok = false
			// 	}
			// })

			return ok
		}
	}
}
</script>