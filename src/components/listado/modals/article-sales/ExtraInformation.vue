<template>
	<div
	class="j-start align-start">
		<h5>
			Unidades totales vendidas: <strong>{{ cantidad_total }}</strong>
		</h5>

		<div
		v-if="addresses.length">
			<div class="m-l-30">
				<h5>
					Ventas por sucursal
				</h5>
				<p
				class="m-b-5 p-l-10"
				v-for="sucursal in sucursales"
				v-if="sucursal">
					{{ sucursal.street }}: <strong>{{ sucursal.cantidad_ventas }}</strong>
				</p>
			</div>
		</div>

		<div
		v-if="employees.length">
			<div class="m-l-30">
				<h5>
					Ventas por empleado
				</h5>
				<p
				class="m-b-5 p-l-10"
				v-for="empleado in empleados"
				v-if="empleado">
					{{ empleado.name }}: <strong>{{ empleado.cantidad_ventas }}</strong>
				</p>
			</div>
		</div>
	</div>
</template>
<script>
import article_sales from '@/mixins/article_sales'
export default {
	mixins: [article_sales],
	props: {
		results: Array,
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
		cantidad_total() {
			let total = 0
			if (this.results) {
				this.results.forEach(sale => {
					total += this.getArticleAmountInSale(sale, this.model)
				})
			}
			return total
		},
		addresses() {
			return this.$store.state.address.models 
		},
		sucursales() {

			let addresses = []
			this.addresses.forEach(address => {
				addresses[address.id] = {
					...address,
					cantidad_ventas: 0
				}
			})


			if (this.results) {
				this.results.forEach(sale => {
					
					if (sale.address_id) {
						addresses[sale.address_id].cantidad_ventas += this.getArticleAmountInSale(sale, this.model)
					}

				})
			}

			return addresses
		},

		employees() {
			return this.$store.state.employee.models 
		},
		empleados() {

			let employees = []
			this.employees.forEach(employee => {
				employees[employee.id] = {
					...employee,
					cantidad_ventas: 0
				}
			})

			employees[this.owner.id] = {
				...this.owner,
				cantidad_ventas: 0
			}


			if (this.results) {
				this.results.forEach(sale => {
					
					if (sale.employee_id) {
						employees[sale.employee_id].cantidad_ventas += this.getArticleAmountInSale(sale, this.model)
					} else {
						employees[this.owner.id].cantidad_ventas += this.getArticleAmountInSale(sale, this.model)
					}

				})
			}

			return employees
		}
	},
}
</script>