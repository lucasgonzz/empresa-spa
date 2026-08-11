import start_methods from '@/mixins/start_methods'
import vender_set_total from '@/mixins/vender_set_total'
import set_price_type from '@/mixins/vender/price_types'
import set_employee_vender from '@/mixins/set_employee_vender'
/*
	Los dos defaults que limpiar_vender tiene que volver a aplicar por su cuenta. Se
	importan aca, y no se asume que los tenga el componente que llama, justamente porque
	limpiar_vender lo llaman lugares muy distintos: el boton Limpiar, guardar una venta,
	cancelar la edicion de una venta previa y guardar un presupuesto.
*/
import omitir_en_cuenta_corriente from '@/mixins/vender/omitir_en_cuenta_corriente'
import default_articles from '@/mixins/vender/default_articles'
export default {
	mixins: [start_methods, vender_set_total, set_price_type, set_employee_vender, omitir_en_cuenta_corriente, default_articles],
	computed: {
		discounts() {
			return this.$store.state.discount.models
		},
		surchages() {
			return this.$store.state.surchage.models
		},
	},
	methods: {
		/*
			Ojo: limpiar_vender NO debe tocar vender/ultima_venta_sesion.
			Ese campo tiene que sobrevivir a limpiar la venta y a salir del modulo,
			para que el footer siga ofreciendo imprimir o mandar el comprobante de
			la ultima venta hecha en la sesion. Se limpia solo al refrescar la pagina.
		*/
		limpiar_vender() {
			console.log('limpiar_vender')
			
			this.$store.commit('vender/previus_sales/setIndex', 0)
			this.$store.commit('vender/previus_sales/setPreviusSale', {})
			this.$store.commit('vender/setToCheck', 0)
			this.$store.commit('vender/setChecked', 0)
			this.$store.commit('vender/setConfirmed', 0)
			this.$store.commit('vender/setItems', [])

			this.$store.commit('vender/set_descuento', null)
			this.$store.commit('vender/setDiscountsId', [])
			this.$store.commit('vender/setSurchagesId', [])

			this.$store.commit('vender/setClient', null)
			this.$store.commit('vender/setReturnedItems', [])
			this.$store.commit('vender/setSaveNotaCredito', 0)
			this.$store.commit('vender/setNotaCreditoDescription', '')
			// this.$store.commit('vender/setTotal')
			this.$store.commit('vender/setObservations', '')
			this.$store.commit('vender/setObservationsOcultas', '')
			this.$store.commit('vender/setGuardarComoPresupuesto', 0)
			this.$store.commit('vender/setBudget', null)
			this.$store.commit('vender/setPriceType', null)
			this.$store.commit('vender/set_numero_orden_de_compra', '')
			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)

			this.$store.commit('vender/set_dias_alerta_venta_no_cobrada_personalizado', null)
			
			this.$store.commit('vender/setSelectedPaymentMethods', [])

			this.$store.commit('vender/set_modal_payment_methods', [])

			this.$store.commit('vender/setDiscountsInServices', 0)
			this.$store.commit('vender/setSurchagesInServices', 0)

			this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
			
			this.$store.commit('vender/setSellerId', 0)

			this.$store.commit('vender/set_fecha_entrega', null)

			this.$store.commit('vender/set_moneda_id', 1)

			this.$store.commit('vender/set_sale_status_id', 0)

			// Al limpiar vender, discount_stock vuelve al valor por defecto (true)
			this.$store.commit('vender/set_discount_stock', 1)
			// Al limpiar vender, iva_aplicado vuelve al valor por defecto (true)
			this.$store.commit('vender/set_iva_aplicado', 1)

			this.$store.commit('vender/clearPendingAttachments')
			this.$store.commit('vender/setSaleAttachments', [])

			// this.$store.commit('vender/set_caja_id', 0)
			
			// this.$store.commit('vender/set_afip_tipo_comprobante_id', 0)

			this.setTotal()

			// this.checkAddressCookie()

			this.limpiar_descuentos()

			this.limpiar_recargos()

			this.limpiar_cuotas()

			this.setEmployeeVender()

			this.setPriceType()

			/*
				Los defaults se aplican ACA y no solo en el created() de la vista.

				Los commits de arriba dejaron la venta nueva con omitir_en_cuenta_corriente
				en 0 y sin los articulos por defecto. Antes eso se curaba solo: el operador
				salia del modulo, volvia, y el created() re-aplicaba todo. Con la bandera ya
				no: en cuanto el operador toca cualquier cosa (escanear un articulo, elegir
				un cliente) la bandera se prende y el created() no vuelve a aplicar nada.

				El caso que hace que esto importe: un comercio con siempre_omitir_en_cuenta_
				corriente terminaria registrando la venta en la cuenta corriente del cliente
				contra su propia configuracion, sin que nada avise.

				Los dos metodos son idempotentes — set_default_articles chequea
				ya_esta_en_los_articulos_para_vender antes de agregar — asi que no molesta
				que los llamadores que ya los invocan (guardar_venta) los repitan.

				NO se re-aplica la caja por defecto: limpiar_vender nunca la toco (su
				set_caja_id esta comentado mas arriba) y set_caja_por_defecto depende de
				computeds que no todos los llamadores tienen.
			*/
			this.set_omitir_en_cuenta_corriente()
			this.set_default_articles()

			/*
				Va ultima a proposito: setPriceType() y el resto de los commits de arriba
				prenden la bandera. Si el apagado no fuera lo ultimo, la venta nueva quedaria
				marcada como ya inicializada y no recibiria sus valores por defecto al volver
				a entrar al modulo.
			*/
			this.$store.commit('vender/set_venta_en_curso_inicializada', false)
		},
		limpiar_descuentos() {

			this.discounts.forEach(discount => {
				if (discount.deleted_at) {
					this.$store.commit('discount/setDelete', discount)
					this.$store.commit('discount/delete')
				} else if (discount.updated_percentage) {
					discount.percentage = discount.updated_percentage
					discount.updated_percentage = null
				}
			})

		},
		limpiar_recargos() {

			this.surchages.forEach(surchage => {
				if (surchage.deleted_at) {
					this.$store.commit('surchage/setDelete', surchage)
					this.$store.commit('surchage/delete')
				} else if (surchage.updated_percentage) {
					surchage.percentage = surchage.updated_percentage
					surchage.updated_percentage = null
				}
			})

		},
		limpiar_cuotas() {
			this.$store.commit('vender/set_cuota_id', 0)
			this.$store.commit('vender/set_cantidad_cuotas', null)
			this.$store.commit('vender/set_cuota_descuento', null)
			this.$store.commit('vender/set_cuota_recargo', null)
		},
	}
}