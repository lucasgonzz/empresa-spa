import cajas from '@/mixins/vender/guardar_venta/chequeos/cajas'
import article_variants from '@/mixins/vender/guardar_venta/chequeos/article_variants'
import payment_methods from '@/mixins/vender/guardar_venta/chequeos/payment_methods'
import default_articles from '@/mixins/vender/guardar_venta/chequeos/default_articles'
import asignar_venta_a_cliente from '@/mixins/vender/guardar_venta/chequeos/asignar_venta_a_cliente'
import sale_type from '@/mixins/vender/guardar_venta/chequeos/sale_type'
import sucursal from '@/mixins/vender/guardar_venta/chequeos/sucursal'
import afip from '@/mixins/vender/guardar_venta/chequeos/afip'
export default {
	mixins: [
		cajas, 
		article_variants, 
		payment_methods, 
		default_articles, 
		asignar_venta_a_cliente,
		sale_type, 
		sucursal, 
		afip
	],
	methods: {

		checkear_vender() {

			if (!this.check_article_variants()) {
				return false
			}

			if (!this.check_cajas()) {
				return false
			}

			if (!this.check_payment_methods()) {
				return false
			}

			if (!this.check_guardar_ventas_con_cliente()) {
				return false
			}

			this.checkDefaultArticles()

			if (!this.items.length) {
				this.$toast.error('Ingrese al menos un articulo o servicio')
				return false 
			}

			if (!this.check_sale_type()) {
				return false 
			}

			if (!this.check_sucursal()) {
				return false
			}

			if (!this.check_afip()) {
				return false
			}

			return true 
		},
	}
}