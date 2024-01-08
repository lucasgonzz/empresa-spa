<template>
<b-row
class="m-b-15 m-t-20">
	<b-col>
		<b-table 
		class="b-r-1"
		v-if="items.length"
		:items="table_items" 
		head-variant="dark" 
		:fields="fields" 
		responsive 
		hover>
			<template #cell(price)="data">
				<b-input-group
				v-if="can('article.vender.change_price')"
				class="input-price m-b-10">
					<b-form-input
					@keyup="setTotal"
					@click="setTotal" 
					type="number"
					min="0"
					v-model="items[data.index].price_vender"></b-form-input>
				</b-input-group>
				<span>
					{{ price(items[data.index].price_vender) }}
				</span>
			</template>
			<template #cell(amount)="data">
				<b-input-group
				class="input-discount">
					<b-form-input
					:disabled="previus_sale != null && previus_sale.to_check == 1"
					@keyup="setTotal"
					@click="setTotal"
					type="number"
					min="0"
					v-model="items[data.index].amount"></b-form-input>
				</b-input-group>
			</template>
			<template #cell(discount)="data">
				<b-input-group
				class="input-discount"
				prepend="%">
					<b-form-input
					@keyup="setTotal"
					@click="setTotal"
					type="number"
					min="0"
					v-model="items[data.index].discount"></b-form-input>
				</b-input-group>
			</template>

			<template #cell(checked_amount)="data">
				<strong
				class="text-danger p-b-10"
				v-if="items[data.index].checked_amount && items[data.index].checked_amount == items[data.index].amount">
					Se elimino
				</strong>
				<b-input-group
				:class="checked_amount_input_class(items[data.index])"
				class="input-checked-amount">
					<div 
					class="prepend">
						<i class='icon-edit'></i>
					</div>
					<b-form-input
					:disabled="!previus_sale.to_check"
					type="number"
					min="0"
					v-model="items[data.index].checked_amount"></b-form-input> 
				</b-input-group>
			</template>

			<template #cell(returned_amount)="data">
				<b-input-group
				class="input-discount">
					<b-form-input
					@keyup="setReturnedItems(items[data.index])"
					@click="setReturnedItems(items[data.index])"
					type="number"
					min="0"
					v-model="items[data.index].returned_amount"></b-form-input>
				</b-input-group>
			</template>
			<template #cell(delivered_amount)="data">
				<b-input-group
				class="input-discount">
					<b-form-input
					type="number"
					min="0"
					v-model="items[data.index].delivered_amount"></b-form-input>
				</b-input-group>
			</template>
			<template #cell(options)="data">
				<div class="options">
					<b-button 
					@click="removeItem(items[data.index])"
					variant="danger"
					class="btn-options"
					size="sm">
						<i class="icon-trash"></i>
					</b-button>
				</div>
			</template>
		</b-table>
		<div 
		v-else>
			<p
			class="text-with-icon-2">
				<i class="icon-clipboard"></i>
				Remito en blanco
			</p>
		</div>
	</b-col>
</b-row>
</template>
<script>
import vender from '@/mixins/vender'
import previus_sales from '@/mixins/previus_sales'
export default {
	mixins: [vender, previus_sales],
	watch: {
		special_price_id() {
			console.log('watcher de special_price_id')
			this.setArticlesPrice()
			this.$store.commit('vender/setTotal')
		},
	},
	computed: {
		special_price_id() {
			return this.$store.state.vender.special_price_id
		},
		articles() {
			return this.$store.state.vender.articles
		},
		combos() {
			return this.$store.state.vender.combos
		},
		fields() {
			let fields = [
				{ key: 'price', label: 'Precio' },
				{ key: 'name', label: 'Nombre' },
				{ key: 'amount', label: 'Cantidad' },
				{ key: 'discount', label: 'Descuento' },
			]
			if (this.index_previus_sales > 0) {
				if (this.hasExtencion('check_sales') && !this.previus_sale.confirmed && (this.previus_sale.to_check || this.previus_sale.checked)) {
					fields.push(
						{ key: 'checked_amount', label: 'U. chequeadas' },
					)
				}
				if (!this.hasExtencion('check_sales') || (!this.previus_sale.to_check && !this.previus_sale.checked)) {
					fields.push(
						{ key: 'returned_amount', label: 'U. Devueltas' },
					)
				}
				if (this.hasExtencion('acopios')) {
					fields.push(
						{ key: 'delivered_amount', label: 'U. Entregadas' },
					)
				}
			}
			fields = fields.concat([
				{ key: 'total', label: 'Total' },
				{ key: 'options', label: 'Opciones' },
			])
			return fields
		},
		items() {
			return this.$store.state.vender.items
		},
		table_items() {
			let items = []
			let item_to_add
			this.items.forEach(item => {
				item_to_add = {
					id: item.id,
					price: item.price_vender,
					// price: this.price(item.price_vender),
					name: item.name,
					// amount: item.amount,
					total: this.price(this.getTotalItem(item, false)),
				}
				items.push(item_to_add)
			})
			return items
		},
	},
	methods: {
		checked_amount_input_class(item) {
			if (this.previus_sale.checked && item.checked_amount) {
				return 'input-checked-amount-danger'
			}
		},
		setReturnedItems(item) {
			this.checkReturnedItemMaxAmount(item)
			this.setTotal()
			this.addReturnedItem(item)
			this.setNotaCreditoDescription()
		},
		checkReturnedItemMaxAmount(item) {
			if (item.returned_amount > item.amount) {
				this.$toast.error('No se pueden devolver mas unidades de las que se compraron')
				item.returned_amount = item.amount
			} else {
				item.return_to_stock = item.returned_amount
			}
		},
		addReturnedItem(_item) {
			let item = {
				..._item,
			}

			if (item.is_article) {
				let previus_returned_article = this.previus_returned_articles.find(article => {
					return article.id == item.id
				})

				if (typeof previus_returned_article != 'undefined') {
					item.returned_amount -= previus_returned_article.pivot.returned_amount
				}
			} else if (item.is_service) {
				let previus_returned_item = this.previus_returned_services.find(service => {
					return service.id == item.id
				})

				if (typeof previus_returned_item != 'undefined') {
					item.returned_amount -= previus_returned_item.pivot.returned_amount
				}
			}

			this.$store.commit('vender/addReturnedItem', item)
		},
		setNotaCreditoDescription() {
			this.nota_credito_description = ''
			this.returned_items.forEach(item => {
				if (this.nota_credito_description == '') {
					this.nota_credito_description = 'Devolucion de: '+item.returned_amount+' '+item.name 
				} else {
					this.nota_credito_description += ', '+item.returned_amount+' '+item.name 
				}
			})
		},
		setTotal() {
			this.$store.commit('vender/setTotal')
		},
		updatePrice(article) {
			this.$store.commit('vender/setUpdatePrice', article)
			this.$bvModal.show('update-price')
		},
		changeToTotal(article) {
			document.getElementById(`total-${article.id}`).focus()
		},
		up(item) {
			item.amount++
			this.$store.commit('vender/updateItem', item)
			this.$store.commit('vender/setTotal')
		},
		down(item) {
			if (item.amount > 1) {
				item.amount--
				this.$store.commit('vender/updateItem', item)
				this.$store.commit('vender/setTotal')
			} else {
				// toastr.error('No se pueden restar mas unidades')
				this.removeItem(article)
			}
		},
		removeItem(article) {
			this.$store.commit('vender/removeItem', article)
			this.$store.commit('vender/setTotal')
		},
		calculateTotalFromAmount(article) {
			article.calculate_from_total = false
			this.calculateTotal()
		},
		calculateTotalFromTotal(article) {
			article.calculate_from_total = true
			this.calculateTotal()
		},
		calculateTotal() {
			this.$emit('calculateTotal')
		},
		
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'

.input-discount
	width: 110px !important

.td-price 
	position: relative
	font-weight: bold


.ticket-price 
	position: absolute
	font-size: 30px
	color: #E23535
	top: -5px
	left: 0px


.btn-options
	margin-right: 5px
	&:last-child
		margin-right: 0
	@media screen and (max-width: 576px)
		margin-bottom: 5px
		&:last-child
			margin-right: 0
.input-price
	width: 150px

.input-checked-amount
	width: 125px
	.prepend
		width: 40px
		background: #e9ecef
		display: flex 
		align-items: center 
		justify-content: center
		border: 1px solid #ced4da
		border-radius: .25rem 0 0 .25rem

.input-checked-amount-danger
	border: 4px solid darken($red, 10)
	border-radius: .25rem

.options 
	width: 140px
</style>