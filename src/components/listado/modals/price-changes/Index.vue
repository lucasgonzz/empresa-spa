<template>
<b-modal
:title="'Cambios de precios de '+article.name"
hide-footer
size="lg"
id="price-changes">
	<div
	v-if="!loading">
		
		<b-table
		v-if="items.length"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		head-variant="dark"
		responsive
		striped
		:fields="fields"
		:items="items"></b-table>

		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay cambios de precios
		</p>
	</div>

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
	mounted() {
		this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
			console.log('SE ABRIO MODAL')
			if (modal_id == 'price-changes') {
				console.log('y era price-changes')
				setTimeout(() => {
					if (!this.loading) {
						this.getPriceChanges() 
					}
				}, 500)
			}
		})
	},
	computed: {
		price_types() {
			return this.$store.state.price_type.models 
		},
		fields() {
			let fields = [
				{
					label: 'Costo',
					key: 'cost',
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

			if (this.price_types.length) {

				this.price_types.forEach(price_type => {
					fields.push({
						label: price_type.name,
						key: 'price_type_'+price_type.id
					})
					console.log('agregando '+price_type.name)
				})

			} else {
				fields.push({
					label: 'Precio',
					key: 'price',
				})
				fields.push({
					label: 'Precio Final',
					key: 'final_price',
				})
			}

			return fields
		},
		items() {
			let items = []

			this.price_changes.forEach(model => {
				let item = {
					cost: this.price(model.cost),
					price: this.price(model.price),
					employee: this.getEmployee(model),
					created_at: this.date(model.created_at),
				}

				if (this.price_types.length) {
					
					this.price_types.forEach(price_type => {
						let relation_price_type = model.price_types.find(p => p.id == price_type.id)

						if (typeof relation_price_type != 'undefined') {
							item['price_type_'+price_type.id] = this.price(relation_price_type.pivot.final_price)
						}
					})

				} else {
					item.final_price = this.price(model.final_price)
				}

				items.push(item)
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