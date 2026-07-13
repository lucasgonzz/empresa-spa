<template>
	<div
	v-if="can('sale.index.total')"
	class="cont-total-ventas">
		<div>
			<div
			class="j-start align-start"
			v-if="!loading">

				<div
				class="cont-totales">
					
					<div
					class="j-start align-center">
						<p
						class="total-ventas">
							Total {{ price(total) }} 
						</p>
						<p
						class="m-l-10 m-b-0"
						v-if="total_selected_payment_method > 0">
							({{ price(total_selected_payment_method) }} {{ selected_payment_method }})
						</p> 

						<p
						class="text-left d-none d-lg-block m-b-0 m-md-l-10"
						v-if="is_admin">
							| Costos <strong>{{ price(total_cost) }}</strong>
						</p> 

						<p
						class="text-left d-none d-lg-block m-b-0 m-md-l-10"
						v-if="is_admin">
							| Ganancia <strong>{{ price(total_ganancia) }}</strong>
						</p> 
					</div>
					<div
					class="f-columns align-start">


						<p
						class="m-0"
						v-if="total_cuenta_corriente_pesos > -1">
							Total C/C: {{ price(total_cuenta_corriente_pesos) }}
						</p>
					</div>

					<div
					class="j-start align-center m-t-15"
					v-if="hasExtencion('ventas_en_dolares')">
						<p
						class="total-ventas">
							Total USD {{ price(total_usd) }}
						</p>

						<p
						class="text-left m-b-0 m-md-l-10"
						v-if="is_admin">
							| Costos <strong>{{ price(total_cost_usd) }}</strong>
						</p> 

						<p
						class="text-left m-b-0 m-md-l-10"
						v-if="is_admin">
							| Ganancia <strong>{{ price(total_ganancia_usd) }}</strong>
						</p> 
					</div>
					<div
					class="f-columns align-start">
						<p
						class="m-0"
						v-if="total_cuenta_corriente_dolar > -1">
							Total C/C: usd {{ price(total_cuenta_corriente_dolar) }}
						</p>
					</div>
				</div>

				<b-button
				v-if="is_admin"
				@click="export_excel"
				class="m-l-10"
				variant="outline-success"
				size="sm">
					<i class="icon-download"></i>
					Excel
				</b-button>
				<b-button
				v-if="is_admin"
				@click="export_breakdown_excel"
				class="m-l-10"
				variant="outline-success"
				size="sm">
					<i class="icon-download"></i>
					Excel full
				</b-button>
			</div>
			<b-skeleton 
			v-else
			type="button"
			width="200px" 
			class="m-b-20"></b-skeleton>
		</div>
		<div>
			<p 
			v-if="!loading"
			class="cantidad-ventas">
				{{ cantidad_ventas }} ventas	
			</p>
			<b-skeleton 
			v-else
			type="button"
			width="200px" 
			class="m-b-20"></b-skeleton>
		</div>
	</div>
</template>
<script>
import sale from '@/mixins/sale'
export default {
	mixins: [sale],
	computed: {
		loading() {
			return this.$store.state.sale.loading  
		},
		selected_payment_method_id() {
			return this.$store.state.sale.payment_method_show_option
		},
		selected_payment_method() {
			let payment_method = this.$store.state.current_acount_payment_method.models.find(p => p.id == this.selected_payment_method_id)
			if (typeof payment_method != 'undefined') {
				return payment_method.name 
			}
			return ''
		},
		total_selected_payment_method() {
			let total = 0
			if (this.selected_payment_method_id != 'Todos') {
				this.sales_to_show.forEach(sale => {
					let payment_method = sale.current_acount_payment_methods.find(p => p.id == this.selected_payment_method_id)
					if (typeof payment_method != 'undefined') {
						total += Number(payment_method.pivot.amount)
					}
				})
			}
			return total 
		},
		total_cuenta_corriente_pesos() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (
					model.client_id
					&& !model.omitir_en_cuenta_corriente
					&& model.moneda_id == 1
				) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total 
		},	
		total_cuenta_corriente_dolar() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (
					model.client_id
					&& !model.omitir_en_cuenta_corriente
					&& model.moneda_id == 2
				) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total 
		},	
		total() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 1) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total 
		},
		total_cost() {
			/* Acumulador de costos para ventas en pesos. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 1) {
					total += Number(model.total_cost)
				}
			})
			return total 
		},
		total_ganancia() {
			/* Acumulador de ganancia persistida para ventas en pesos. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 1) {
					/* Se usa el campo persistido por backend y no un calculo local. */
					total += Number(model.ganancia)
				}
			})
			return total
		},
		total_usd() {
			/* Acumulador de total de ventas en dolares. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total 
		},
		total_cost_usd() {
			/* Acumulador de costos para ventas en dolares. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					total += Number(model.total_cost)
				}
			})
			return total 
		},
		total_ganancia_usd() {
			/* Acumulador de ganancia persistida para ventas en dolares. */
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					/* Se usa el campo persistido por backend y no un calculo local. */
					total += Number(model.ganancia)
				}
			})
			return total
		},
		cantidad_ventas() {
			let total = 0
			this.sales_to_show.forEach(model => {
				total++
			})
			return total 
		},
		from_date() {
			return this.$store.state.sale.from_date
		},
		until_date() {
			return this.$store.state.sale.until_date
		},
	},
	methods: {
		export_excel() {
			this.download_sales_excel('sales/excel/export', 'ventas')
		},
		export_breakdown_excel() {
			this.download_sales_excel('sales/excel/breakdown-export', 'ventas_desglosado')
		},
		/**
		 * Arma el cuerpo del POST con el estado completo del filtro que ve la pantalla.
		 * @returns {Object}
		 */
		build_export_body() {
			let state = this.$store.state.sale
			let scope = this.resolve_view_scope()
			return {
				is_filtered: state.is_filtered,
				filters: state.filters,
				from_date: this.from_date,
				until_date: this.until_date,
				ventas_cobradas_show_option: state.ventas_cobradas_show_option,
				afip_ticket_show_option: state.afip_ticket_show_option,
				payment_method_show_option: state.payment_method_show_option,
				address_id: scope.address_id,
				employee_id: scope.employee_id,
				only_owner: scope.only_owner,
			}
		},
		/**
		 * Resuelve la pestaña actual (sucursal/empleado) igual que sales_to_show (mixins/sale.js).
		 * @returns {{address_id: (number|null), employee_id: (number|null), only_owner: boolean}}
		 */
		resolve_view_scope() {
			// Id de sucursal resuelto por nombre de calle (street), null si es "todas".
			let address_id = null
			// Id de empleado resuelto por nombre, null si es "todos" o si es el caso "dueño".
			let employee_id = null
			// True cuando la sub_view es una pestaña de empleado pero ninguna venta tiene employee_id (caso dueño).
			let only_owner = false

			if (this.view != 'todas') {
				let address = this.addresses.find(model => {
					return model.street.toLowerCase() == this.view.replaceAll('-', ' ').toLowerCase()
				})
				if (typeof address != 'undefined') {
					address_id = address.id
				}
			}

			if (this.sub_view != 'todos') {
				let employee = this.employees.find(model => {
					return model.name.toLowerCase() == this.sub_view.replaceAll('-', ' ').toLowerCase()
				})
				if (typeof employee == 'undefined') {
					// Caso "dueño": ventas sin empleado asignado.
					only_owner = true
				} else {
					employee_id = employee.id
				}
			}

			return { address_id, employee_id, only_owner }
		},
		/**
		 * POST autenticado al endpoint de export; descarga el .xlsx desde la respuesta (blob).
		 * @param {string} endpoint 'sales/excel/export' | 'sales/excel/breakdown-export'
		 * @param {string} filename_prefix Prefijo del nombre del archivo.
		 * @returns {void}
		 */
		download_sales_excel(endpoint, filename_prefix) {
			this.$api.post(endpoint, this.build_export_body(), { responseType: 'blob' })
				.then(res => {
					// Se arma un link temporal para disparar la descarga del blob recibido.
					let url = window.URL.createObjectURL(new Blob([res.data]))
					let a = document.createElement('a')
					a.href = url
					let now = new Date()
					let stamp = ('0' + now.getDate()).slice(-2)
						+ '-' + ('0' + (now.getMonth() + 1)).slice(-2)
						+ '-' + String(now.getFullYear()).slice(-2)
					a.download = filename_prefix + '_' + stamp + '.xlsx'
					document.body.appendChild(a)
					a.click()
					a.remove()
					window.URL.revokeObjectURL(url)
				})
				.catch(() => {
					this.$toast.error('No se pudo generar el Excel', { duration: 4000 })
				})
		},
	}
}
</script>
<style lang="sass">
.cont-total-ventas
	// display: flex
	// flex-direction: row 
	// justify-content: space-between
	// align-items: center

	.cont-totales
		display: flex 
		flex-direction: column
	.total-ventas 
		margin-bottom: 0
		font-size: 1.5em 
		font-weight: bold 
		text-align: left
	.cantidad-ventas 
		margin-bottom: 0
		font-size: 25px 
		font-weight: bold 
		text-align: right
</style>
	