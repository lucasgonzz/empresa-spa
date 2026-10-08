<template>
	<!-- Layout inline para VenderActionsBar (sin b-col ni btn-block) -->
	<div
	v-if="items.length && inline_layout"
	class="btn-guardar-inline">

		<vuelto-efectivo v-if="!hide_vuelto"></vuelto-efectivo>

		<btn-loader
		:disabled="loader"
		class="venta-total-box"
		icon="check"
		:text="text_btn"
		:loader="loader"
		:block="false"
		data-testid="btn-guardar-venta"
		dusk="btn_vender"
		@clicked="saveSale">
		</btn-loader>

	</div>

	<!-- Layout original en grilla Bootstrap -->
	<b-col
	v-else-if="items.length"
	cols="12"
	class="j-end align-start"
	lg="6">

		<vuelto-efectivo v-if="!hide_vuelto"></vuelto-efectivo>

		<btn-loader
		:disabled="loader"
		class="venta-total-box"
		icon="check"
		:text="text_btn"
		:loader="loader"
		data-testid="btn-guardar-venta"
		dusk="btn_vender"
		@clicked="saveSale">
		</btn-loader>

	</b-col>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import previus_sales from '@/mixins/vender/previus_sale/index'
import guardar_venta from '@/mixins/vender/guardar_venta/index'
import vender_presupuestos from '@/mixins/vender_presupuestos'
import articulo_pendiente_de_agregar from '@/mixins/vender/articulo_pendiente_de_agregar'
/*
	Explicito aunque guardar_venta ya lo trae por chequeos/index.js: check() lo llama para los
	dos caminos que NO pasan por checkear_vender(), y conviene que la dependencia se lea aca.
*/
import check_price_type from '@/mixins/vender/guardar_venta/chequeos/price_type'
/*
	Explicito aunque previus_sale/index.js ya lo trae (lo usa updateSale() para el aviso de despues de
	guardar): saveSale() le pide la confirmacion de antes de guardar, y la dependencia conviene leerla aca.
*/
import aviso_cambio_de_cuenta, { moneda_de_cuenta_normalizada } from '@/mixins/vender/previus_sale/aviso_cambio_de_cuenta'
export default {
	name: 'ButtonClients',
	components: {
		VueltoEfectivo: () => import('@/components/vender/components/remito/VueltoEfectivo'),
		BtnLoader,
	},
	mixins: [previus_sales, guardar_venta, vender_presupuestos, articulo_pendiente_de_agregar, check_price_type, aviso_cambio_de_cuenta],
	props: {
		/**
		 * Cuando es true, suprime el componente VueltoEfectivo.
		 * Usado por VenderActionsBar para evitar duplicar el vuelto
		 * (que ya se muestra inline en VenderStage2ContextBar).
		 */
		hide_vuelto: {
			type: Boolean,
			default: false,
		},
		/**
		 * Cuando es true, renderiza un div simple en lugar de b-col
		 * y desactiva btn-block para uso en la barra inferior fija.
		 */
		inline_layout: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/*
		 * El atajo para guardar venta está en el mixin keyboard_shortcuts.js (tecla configurable).
		 * que se registra en Vender.vue como listener global centralizado.
		 * Este componente mantiene saveSale() para uso del botón de click.
		 */
		saveSale() {
			if (!this.loader && this.check()) {
				if (this.guardar_como_presupuesto) {
					this.guardar_presupuesto()
				} else if (!this.editando_venta_previa) {
					this.guardar_venta(false)
				} else {
					/*
						Venta guardada: si cambia de cuenta corriente (otro cliente u otra moneda) y
						tenia cobros, primero se confirma, porque lo cobrado queda en la cuenta
						original (decision 1 de Lucas). Sin eso guarda derecho. Ver
						mixins/vender/previus_sale/aviso_cambio_de_cuenta.js.
					*/
					this.cambio_de_cuenta_confirmar_y_guardar(() => {
						this.updateSale()
					})
				}
			}
		},
		check() {
			if (!this.check_articulo_pendiente_de_agregar()) {
				return false
			}

			if (this.guardar_como_presupuesto) {
				if (!this.client) {
					this.$toast.error('Indique un CLIENTE para el Presupuesto')
					return false
				}
			}

			/*
				🔴 La lista de precios se chequea ACA para los dos caminos que no pasan por
				checkear_vender(): el presupuesto (guardar_presupuesto) y la actualizacion de una
				venta guardada (updateSale). La venta nueva lo tiene adentro de checkear_vender().
				Hasta esta mision un presupuesto salia sin lista en una cuenta con listas, y al
				confirmarlo la venta nacia con las lineas a precio base.
			*/
			if (
				(this.guardar_como_presupuesto || this.editando_venta_previa)
				&& !this.check_price_type()
			) {
				return false
			}

			/*
				🔴 La cotizacion del dolar de una VENTA GUARDADA en dolares, igual que en una venta
				nueva (checkear_vender() la chequea en el mismo lugar, despues de la lista). Hasta la
				mision edicion-completa-ventas-presupuestos (8/10/2026) no hacia falta: la moneda y la
				cotizacion de una venta guardada estaban bloqueadas y la API las ignoraba. Ahora la
				venta se puede pasar a dolares y la API rechaza con 422 si queda sin cotizacion: aca se
				corta antes, y si el campo quedo vacio se carga la del sistema y NO se guarda en este
				paso (los renglones convertidos cambian con la cotizacion y el vendedor tiene que
				verlos antes). Ver chequeos/valor_dolar_de_la_venta.js.

				El presupuesto no pasa por aca: su PUT ya devuelve el 422 con el mensaje.

				Una venta que YA estaba en dolares sin cotizacion guardada (2R tiene 44 asi) y sigue
				sin una no se frena: la API la acepta y conserva la cotizacion como estaba (solo
				rechaza al PASAR a dolares), y frenarla aca dejaria sin poder editar esas ventas en un
				comercio que no tiene dolar cargado. Con dolar cargado ni llega: Moneda.vue lo pone en
				el campo al abrirla.
			*/
			let venta_original = this.previus_sale

			let ya_estaba_en_dolares_sin_cotizacion = Boolean(
				venta_original
				&& moneda_de_cuenta_normalizada(venta_original.moneda_id) === 2
				&& !(Number(venta_original.valor_dolar) > 0)
				&& !(Number(this.$store.state.vender.valor_dolar) > 0)
			)

			if (
				this.editando_venta_previa
				&& !this.guardar_como_presupuesto
				&& !ya_estaba_en_dolares_sin_cotizacion
				&& !this.check_valor_dolar_de_la_venta()
			) {
				return false
			}

			/*
				🔴 La sucursal tambien se chequea para el presupuesto, que no pasa por
				checkear_vender(). Hasta esta tanda un presupuesto salia sin sucursal en una
				cuenta que tiene sucursales, y al confirmarlo BudgetHelper::saveSale() le
				arrastraba ese address_id vacio a la venta (medido: presupuesto con address_id
				0): la venta nacia sin sucursal y el stock no se descontaba del deposito que
				correspondia. Es el mismo check_sucursal() de la venta (chequeos/sucursal.js),
				con el aviso nombrando al presupuesto.

				check_sale_type() y check_afip() NO se corren aca a proposito: un presupuesto
				no se factura ni lleva tipo de venta.
			*/
			if (this.guardar_como_presupuesto && !this.check_sucursal('del presupuesto')) {
				return false
			}

			if (typeof this.previus_sale.id != 'undefined' && this.previus_sale.to_check && !this.checked) {
				this.$toast.error('Indique la venta como checkeada')
				return false
			}
			if (typeof this.previus_sale.id != 'undefined' && this.previus_sale.checked && !this.to_check && !this.confirmed) {
				this.$toast.error('Indique la venta para checkear')
				return false
			}

			if (typeof this.previus_sale.id != 'undefined' && !this.checkear_metodos_de_pago_en_previus_sale()) {
				return false
			}

			return true
		},
	},
	computed: {
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		text_btn() {
			if (this.guardar_como_presupuesto) {
				return 'Guardar Presupuesto'
			}
			if (!this.editando_venta_previa) {
				// return 'COBRAR'
				return 'Guardar venta'
			}
			return 'ACTUALIZAR venta'
		},
		save_afip_ticket: {
			get() {
				return this.$store.state.vender.save_afip_ticket
			},
			set(value) {
				this.$store.commit('vender/setSaveAfipTicket', value)
			}
		},
		items() {
			return this.$store.state.vender.items
		},

		updating() {
			return this.$store.state.vender.previus_sales.updating
		},
		updating() {
			return this.$store.state.vender.previus_sales.updating
		},
		editando_venta_previa() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa']
		},
		vendiendo() {
			return this.$store.state.vender.vendiendo
		},
		loader() {
			if (!this.editando_venta_previa) {
				return this.vendiendo
			}
			return this.updating
		}
	}
}
</script>
<style lang="sass">
button.venta-total-box
	width: auto
	height: 80px
	width: 200px
	font-size: 1.4rem
	font-weight: bold

/* Contenedor inline para la barra inferior de acciones */
.btn-guardar-inline
	display: inline-flex
	align-items: center
	width: auto
</style>