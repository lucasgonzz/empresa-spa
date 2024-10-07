<template>
	<div>
		<b-button
		@click.stop="show_sale"
		v-if="movimiento_caja.sale">
			Venta N° {{ movimiento_caja.sale.num }}
		</b-button>
		<span
		v-else>
			{{ concepto }}
		</span>
	</div>
</template>
<script>
export default {
	props: {
		movimiento_caja: Object,
	},
	computed: {
		concepto() {
			return this.$store.state.concepto_movimiento_caja.models.find(model => model.id == this.movimiento_caja.concepto_movimiento_caja_id).name
		},
	},
	methods: {
		show_sale() {
			let model_name = 'sale'

			// this.setModel(this.movimiento_caja.sale, 'sale', [], true, false) 

	        this.$store.commit('auth/setMessage', 'Cargando '+this.singular(model_name))
	        this.$store.commit('auth/setLoading', true)
	        this.$api.get(this.routeString(model_name)+'/'+this.movimiento_caja.sale_id)
	        .then(res => {
	            this.setModel(res.data.model, model_name)
	        })
	        .catch(err => {
	            console.log(err)
	        })
		}
	}
}
</script>