<template>
<b-modal
:title="'Cambios de precios de '+article.name"
hide-footer
size="lg"
id="price-changes">
	<b-table
	v-if="!loading"
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	head-variant="dark"
	responsive
	striped
	:fields="fields"
	:items="items"></b-table>

	<b-skeleton-table
	class="s-2 b-r-1 m-t-15 animate__animated animate__fadeIn"
	v-else
	:rows="10" 
	:columns="5"
	:table-props="{ bordered: true, striped: true }"
	></b-skeleton-table>
</b-modal>
</template>
<script>
export default {
	data() {
		return {
			price_changes: [],
			loading: false,
		}
	},
	created() {
		this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
			console.log('SE ABRIO MODAL')
			if (modal_id == 'price-changes') {
				console.log('y era price-changes')
				this.getPriceChanges() 
			}
		})
	},
	computed: {
		fields() {
			return [
				{
					label: 'Costo',
					key: 'cost',
				},
				{
					label: 'Precio',
					key: 'price',
				},
				{
					label: 'Precio Final',
					key: 'final_price',
				},
				{
					label: 'Empleado',
					key: 'employee',
				},
				{
					label: 'Fecha',
					key: 'created_at',
				},
			]
		},
		items() {
			let items = []
			this.price_changes.forEach(model => {
				items.push({
					cost: this.price(model.cost),
					price: this.price(model.price),
					final_price: this.price(model.final_price),
					employee: this.getEmployee(model),
					created_at: this.date(model.created_at),
				})
			})
			return items 
		},
		article() {
			return this.$store.state.article.model 
		},
	},
	methods: {
		getEmployee(price_change) {
			let employee_id = price_change.employee_id
			if (employee_id) {
				if (employee_id == this.owner.id) {
					return this.owner.name 
				}
				let employee = this.$store.state.employee.models.find(employee => {
					return employee.id == employee_id
				})
				if (typeof employee != 'undefined') {
					return employee.name 
				}
			}
			return null
		},
		getPriceChanges() {
			if (!this.loading) {
				console.log('getPriceChanges')
				this.loading = true 
				this.$api.get('price-change/'+this.article.id)
				.then(res => {
					this.loading = false 
					this.price_changes = res.data.models 
				})
				.catch(err => {
					this.loading = false 
					this.$toast.error(err)
				})
			}
		}
	}
}
</script>