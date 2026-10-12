export default {
	methods: {
		check_sale_type() {

			let sale_types = this.$store.state.sale_type.models

			/*
				Con UN solo tipo de venta no hay nada que elegir: SaleType.vue y el elemento
				tipo_de_venta del diseño solo dibujan el selector con dos o mas, asi que si pedimos
				que "lo indiquen" el usuario queda sin poder guardar y sin ningun campo donde
				indicarlo (medido en demo2 el 12/10/2026). Se toma solo.

				Tambien cubre un id que ya no esta entre los tipos (el de una venta editada cuyo
				tipo se borro despues): con uno solo, lo unico valido es ese.
			*/
			if (sale_types.length == 1) {

				if (this.sale_type_id != sale_types[0].id) {
					this.$store.commit('vender/setSaleTypeId', sale_types[0].id)
				}
				return true
			}

			if (sale_types.length && this.sale_type_id == 0) {
				this.$toast.error('Indique el tipo de venta')
				return false 
			} 
			return true
		}
	}
}