<template>
	<div>
		<table-component
		:properties="properties"
		:models="models_to_show"
		:set_model_on_row_selected="false"
		model_name="article_variant">

			<template
			v-for="address in addresses"
			v-slot:[get_address_slot(address)]="props">

				<div class="j-center align-center">
					<b-form-input
					type="number"
					:id="input_id(props, address)"
					@keyup="update_variant_stock(props.model)"
					@click="update_variant_stock(props.model)"
					v-model="props.model['address_'+address.id]"></b-form-input>

					<b-form-checkbox
					class="m-l-10"
					variant="primary"
					:value="1"
					:unchecked-value="0"
					@change="update_variant_stock(props.model)"
					v-model="props.model['address_'+address.id+'_on_display']">En Exhibicion</b-form-checkbox>


					<!-- <b-badge
					class="m-l-5"
					variant="primary"
					v-if="props.model['address_'+address.id+'_on_display']">En Exhibicion</b-badge> -->
				</div>
			</template>

		</table-component>

		<btn-save></btn-save>

	</div>
</template>
<script>
export default {
	components: {
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
		BtnSave: () => import('@/components/listado/modals/article-variants/variant-stock/BtnSave'),
	},
	computed: {
		properties() {
			let props = []

			props.push({
				text: 'Variante',
				key:'variant'
			})

			this.addresses.forEach(address => {

				props.push({
					text: address.street,
					key: 'address_'+address.id 
				})
			})

			return props
		},
		models_to_show() {
			let models = []

			if (typeof this.article != 'undefined') {
				
				this.article.article_variants.forEach(variant => {

					if (!variant.oculta) {
						let model = {}

						model.id = variant.id
						model.variant = variant.variant_description

						variant.addresses.forEach(variant_address => {

							model['address_'+variant_address.id] = variant_address.pivot.amount 
							model['address_'+variant_address.id+'_on_display'] = variant_address.pivot.on_display 
						})

						models.push(model)
					}
				})
			}


			return models 
		},
		article() {
			return this.$store.state.article.model 
		},
		addresses() {
			return this.$store.state.address.models
		},
		variants_to_update() {
			return this.$store.state.article.edit_variants_stock.variants_to_update
		},
	},
	methods: {
		input_id(props, address) {
			return props.model.variant.replaceAll(' ', '_')+'-'+address.id
		},
		get_address_slot(address) {

			return 'table-prop-address_'+address.id
			
			// this.article.article_variants.forEach(variant => {
			// 	let address_id = field.key.substring(8)

			// 	console.log('address_id: '+address_id)

			// 	let variant_address = variant.addresses.find(address => address.id == address_id)
			// })
		},
		update_variant_stock(variant) {
			console.log('update_variant_stock')
			console.log(variant)

			let article_variant = {
				id: variant.id,
				addresses: [],
			}

			let addresses_map = {}

			Object.keys(variant).forEach(key => {
				if (key !== 'id' && key !== 'variant') {
					// Detectar si es una key de 'on_display'
					if (key.includes('_on_display')) {
						let address_id = key.split('_')[1] // address_5_on_display → 5
						if (!addresses_map[address_id]) {
							addresses_map[address_id] = {}
						}
						addresses_map[address_id].on_display = variant[key] ? 1 : 0
					} else if (key.startsWith('address_')) {
						let address_id = key.split('_')[1] // address_5 → 5
						if (!addresses_map[address_id]) {
							addresses_map[address_id] = {}
						}
						addresses_map[address_id].amount = parseInt(variant[key]) || 0
					}
				}
			})

			// Convertir el mapa en array
			Object.keys(addresses_map).forEach(address_id => {
				article_variant.addresses.push({
					id: address_id,
					amount: addresses_map[address_id].amount || 0,
					on_display: addresses_map[address_id].on_display || 0,
				})
			})

			console.log(article_variant)

			this.agregar_para_actualizar(article_variant)
		},
		// update_variant_stock(variant) {
		// 	console.log('update_variant_stock')
		// 	console.log(variant)

		// 	let article_variant = {
		// 		id: variant.id,
		// 		addresses: [],
		// 	}



		// 	Object.keys(variant).forEach(key => {

		// 		console.log('key: '+key)
				
		// 		if (key != 'id' && key != 'variant') {


		// 			// if (key.contains('_on_display')) {

		// 			// } else {

		// 			// }

		// 			let address_id = key.substring(8) 
		// 			let amount = variant[key]

		// 			article_variant.addresses.push({
		// 				id: address_id,
		// 				amount: amount
		// 			})

		// 		}

		// 	})

		// 	console.log(article_variant)

		// 	this.agregar_para_actualizar(article_variant)
		// },
		agregar_para_actualizar(article_variant) {

			let index = this.variants_to_update.findIndex(variant => variant.id == article_variant.id)

			if (index != -1) {

				this.variants_to_update[index] = article_variant
			} else {

				this.variants_to_update.push(article_variant)
			}

			console.log('variants_to_update:')
			console.log(this.variants_to_update)
		}
	}
}
</script>