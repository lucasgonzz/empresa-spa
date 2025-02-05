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
				v-if="can('article.vender.change_price') || items[data.index].default_in_vender"
				class="input-price m-b-10">

					<div class="cont-input-price">
						<b-form-input
						placeholder="Personalizado"
						@keyup.enter="add_varios_precios(items[data.index], true)"
						@keyup="callSetTotal" 
						type="number"
						:id="'price-vender-'+items[data.index].id"
						min="0"
						v-model="items[data.index].price_vender_personalizado"></b-form-input>

						<div
						class="varios-precios"
						v-if="items[data.index].varios_precios">
							<div
							v-for="otro_precio in items[data.index].varios_precios"
							class="otro-precio">
								<b-form-input 
								@keyup.enter.stop="calculate_price_vender(items[data.index])"
								v-model="otro_precio.price_vender"
								type="number" />

								<b-form-input 
								class="input-amount"
								v-model="otro_precio.amount"
								:min="1"
								@change="enter_amount(items[data.index])"
								@keyup.enter.prevent="enter_amount(items[data.index])"
								placeholder="Cantidad"
								type="number" />

								<b-button
								size="sm"
								@click="remove_otro_precio(items[data.index], otro_precio)"
								variant="danger">
									<i class="icon-trash"></i>
								</b-button>
							</div>
						</div>
					</div>

				</b-input-group>
				<span
				v-if="items[data.index].calculated_price_vender">
					{{ price(items[data.index].calculated_price_vender) }}
				</span>
				<span
				v-else>
					{{ price(items[data.index].price_vender) }}
				</span>
			</template>


			
			<template #cell(article_variant_id)="data">
				<b-input-group
				v-if="items[data.index].is_article && items[data.index].article_variants.length"
				class="input-discount">
					<b-form-select
					:options="article_variant_options(items[data.index])"
					v-model="items[data.index].article_variant_id"></b-form-select>
				</b-input-group>
			</template>

			
			<template #cell(amount)="data">
				<b-input-group
				class="input-discount">
					<b-form-input
					:disabled="previus_sale != null && previus_sale.to_check == 1"
					@keyup="callSetTotal(true, items[data.index])"
					@click="callSetTotal(true, items[data.index])"
					type="number"
					min="0"
					:dusk="'amount_'+data.index"
					v-model="items[data.index].amount"></b-form-input>
				</b-input-group>
			</template>

			<template #cell(unidades_individuales)="data">
				<b-input-group
				class="unidades-individuales">
					<b-form-input
					type="number"
					min="0"
					@keyup.enter="calcular_precio_por_unidades_individuales(items[data.index])"
					v-model="items[data.index].unidades_individuales"
					placeholder="Div Por"></b-form-input>
					<b-form-input
					type="number"
					min="0"
					@keyup.enter="calcular_precio_por_unidades_individuales(items[data.index])"
					v-model="items[data.index].unidades_individuales_en_esta_venta"
					placeholder="Div En"></b-form-input>
				</b-input-group>
			</template>

			<template #cell(discount)="data">
				<b-input-group
				class="input-discount"
				prepend="%">
					<b-form-input
					@keyup="callSetTotal"
					@click="callSetTotal"
					type="number"
					:placeholder="get_max_discount(items[data.index])"
					min="0"
					v-model="items[data.index].discount"></b-form-input>
				</b-input-group>
			</template>

			<template #cell(price_type_personalizado_id)="data">
				
				<price-type
				:item="items[data.index]"></price-type>
			
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
					@keyup="setCheckedItems(items[data.index])"
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
					v-if="previus_sale === null || !previus_sale.to_check"
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
			dusk="text_remito"
			class="text-with-icon-2">
				<i class="icon-clipboard"></i>
				Remito en blanco
			</p>
		</div>
	</b-col>
</b-row>
</template>
<script>
import vender from '@/mixins/vender/index'
import vender_set_total from '@/mixins/vender_set_total'
import previus_sales from '@/mixins/vender/previus_sale/index'
export default {
	mixins: [vender, vender_set_total, previus_sales],
	components: {
		PriceType: () => import('@/components/vender/components/remito/table-slots/PriceType'),
	},
	watch: {
		special_price_id() {
			this.setArticlesPrice()
			this.setTotal()
			// this.$store.commit('vender/setTotal')
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
			]

			if (this.hasExtencion('article_variants')) {
				fields.push({ 
					key: 'article_variant_id', label: 'Variante'
				})
			}
			
			if (this.can('vender.article_discount')) {
				fields.push({ 
					key: 'discount', label: 'Descuento' 
				})
			}
			
			if (this.hasExtencion('cambiar_price_type_en_vender')
				&& this.price_types.length) {
				fields.push({ 
					key: 'price_type_personalizado_id', label: 'Lista' 
				})
			}

			// if (this.hasExtencion('unidades_individuales_en_articulos')) {
			// 	fields.push(
			// 		{ key: 'unidades_individuales', label: 'U. Individuales' },
			// 	)
			// }
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
		callSetTotal(from_amount_input = false, item = null) {

			if (from_amount_input) {
				item = this.check_price_type_ranges(item)
				this.$store.commit('vender/replceItem', item)
			}
			this.setTotal()
		},

		article_variant_options(item) {
			let options = [{
				value: 0,
				text: 'Variante'
			}]

			item.article_variants.forEach(article_variant => {
				options.push({
					value: article_variant.id,
					text: article_variant.variant_description
				})
			})

			return options
		},

		calcular_precio_por_unidades_individuales(item) {
			let precio = Number(item.price_vender)
			let precio_por_unidad = precio / Number(item.unidades_individuales)
			let precio_de_las_unidades_vendidas = precio_por_unidad * Number(item.unidades_individuales_en_esta_venta)
		},
		get_max_discount(item) {
			if (item.cost && this.hasExtencion('maximo_descuento_posible_por_articulo_en_vender')) {
				var costo = Number(item.cost);
				var precioVenta = Number(item.price_vender);

				// Calcula el porcentaje de ganancia actual
				var porcentajeGanancia = ((precioVenta - costo) / costo) * 100;

				// Calcula el nuevo precio de venta después de aplicar el descuento máximo
				var nuevoPrecioVenta = costo;

				// Calcula el porcentaje de descuento máximo
				var porcentajeDescuentoMaximo = 100 - ((nuevoPrecioVenta / precioVenta) * 100);
				
				return '('+porcentajeDescuentoMaximo.toFixed(2)+')'
			}
			return ''
		},
		add_varios_precios(item, hacer_caso = false) {
			if (hacer_caso) {
				if (typeof item.varios_precios == 'undefined') {
					item.varios_precios = []
				}
				item.varios_precios.unshift({
					price_vender: item.price_vender_personalizado,
					amount: '',
					id: item.varios_precios.length,
					// article_id: item.id,
				})

				this.calculate_price_vender(item)
				item.price_vender_personalizado = ''
			}
		},
		enter_amount(item) {
			this.calculate_price_vender(item)
		},
		calculate_price_vender(item) {
			let calculated_price_vender = 0
			let amount = 1

			item.varios_precios.forEach(otro_precio => {
				if (otro_precio.amount != '') {
					amount = Number(otro_precio.amount)
				} else {
					amount = 1
				}
				calculated_price_vender += (Number(otro_precio.price_vender) * amount)
			})

			item.calculated_price_vender = calculated_price_vender
			this.$store.commit('vender/replceItem', item)

			this.setTotal()
			// this.$store.commit('vender/setTotal')

			setTimeout(() => {
				document.getElementById('price-vender-'+item.id).focus()
			}, 300)
		},
		remove_otro_precio(item, otro_precio) {
			let index = item.varios_precios.findIndex(_otro_precio => {
				return _otro_precio.id == otro_precio.id 
			})

			item.varios_precios.splice(index, 1)
			this.$store.commit('vender/replceItem', item)
			this.calculate_price_vender(item) 
		},
		checked_amount_input_class(item) {

			if (this.previus_sale.checked && (this.es_0(item) || (!this.es_null(item) && !this.es_string_vacio(item) && !this.es_undefined(item)))) {
				return 'input-checked-amount-danger'
			}
		},
		es_0(item) {
			return typeof item.checked_amount == 'number' && item.checked_amount == 0
		},
		es_null(item) {
			return item.checked_amount === null
		},
		es_string_vacio(item) {
			return typeof item.checked_amount == 'string' && item.checked_amount == ''
		},
		es_undefined(item) {
			return typeof item.checked_amount == 'undefined'
		},
		setCheckedItems(item) {
			this.check_checked_item_max_amount(item)
		},
		setReturnedItems(item) {
			this.checkReturnedItemMaxAmount(item)
			this.setTotal()
			this.addReturnedItem(item)
			this.setNotaCreditoDescription()
		},
		check_checked_item_max_amount(item) {
			if (item.checked_amount >= item.amount) {
				this.$toast.error('Solo indique la cantidad de unidades checkeadas, si es menor a la cantidad original')
				item.checked_amount = 0
			} 
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
		// setTotal() {
		// 	this.$store.commit('vender/setTotal')
		// },
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
			this.setTotal()
			// this.$store.commit('vender/setTotal')
		},
		down(item) {
			if (item.amount > 1) {
				item.amount--
				this.$store.commit('vender/updateItem', item)
				this.setTotal()
				// this.$store.commit('vender/setTotal')
			} else {
				// toastr.error('No se pueden restar mas unidades')
				this.removeItem(article)
			}
		},
		removeItem(article) {
			this.$store.commit('vender/removeItem', article)
			this.setTotal()
			// this.$store.commit('vender/setTotal')
			document.getElementById('article-bar-code').focus()
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
	width: 130px !important

.unidades-individuales
	width: 180px !important

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

	.cont-input-price
		display: flex 
		flex-direction: column 

		.varios-precios
			display: flex 
			flex-direction: column

			.otro-precio
				display: flex 
				flex-direction: row
				justify-content: space-between 
				margin-top: 10px

				input 
					width: 150px

				.input-amount					
						margin: 0 10px
						width: 90px




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