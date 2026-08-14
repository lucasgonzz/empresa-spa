import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
	methods: {
		/**
         * Aplica la lista de precios por defecto (la del presupuesto, la del cliente, o la de
         * mayor posicion) a una venta NUEVA.
         *
         * @param {boolean} force_reset true: es una accion explicita del usuario —sacar el
         *                              cliente a mano en SelectClient— y aplica igual en edicion.
         */
		setPriceType(force_reset = false) {
            /*
                Editando un comprobante guardado, la lista de precios es la que quedo guardada en
                el, aunque el cliente tenga otra asignada. Cambiarsela por atras cambia los precios
                de todas las lineas.
            */
            if (!force_reset && this.editando_venta_previa) {
                return
            }
            console.log('setPriceType')
            console.log('client:')
            console.log(this.client)
            if (
                this.owner.listas_de_precio
                && this.price_types_with_position.length
                && !this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')
            ) {
                let price_type_para_vender 

                if (this.budget 
                	&& this.budget.price_type) {
                	price_type_para_vender = this.budget.price_type
                
                } else if (this.client && this.client.price_type) {
                    price_type_para_vender = this.client.price_type
                    console.log('usando price type del client: '+this.client.price_type.name)
                } else {
                    let last_position = 0
                    this.price_types_with_position.forEach(price_type => {
                        if (price_type.position > last_position) {
                            price_type_para_vender = price_type
                            last_position = price_type.position
                        }
                    })
                }
                this.$store.commit('vender/setPriceType', price_type_para_vender)
            }

		},
	}
}