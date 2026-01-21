<template>
	<div>
		<div
		v-if="hasExtencion('cerrar_ventas')">
			
			<b-button
			v-if="se_puede_actualizar_venta(sale)"
			size="sm"
			class="m-l-5"
			variant="outline-success"
			@click.stop="cerrar">
				<i class="icon-check"></i>
				Cerrar
			</b-button>

			<b-badge
			v-else-if="sale.client_id"
			class="m-l-5"
			variant="success"
			v-else>
				Cerrada
			</b-badge>
		</div>
	</div>
</template>
<script>
import se_puede_actualizar from '@/mixins/vender/previus_sale/se_puede_actualizar'
export default {
	mixins: [se_puede_actualizar],
	props: {
		sale: Object,
	},
	methods: {
		cerrar() {
			if (confirm('¿Seguro que quiere cerrar esta venta? No podra actualizarla una vez que sea cerrada')) {

				this.$api.put('sale-cerrar-venta/'+this.sale.id)
				.then(res => {
					this.$store.commit('sale/add', res.data.model)
					this.$toast.success('Venta cerrada')

					this.$store.dispatch('current_acount/getModels')
				})
				.catch(err => {
					console.log(err)
				})
			}
		},
	},
}
</script>