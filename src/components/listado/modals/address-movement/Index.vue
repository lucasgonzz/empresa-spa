<template>
<b-modal
hide-footer
title="Movimiento de deposito"
id="address-movement">

		<!-- Variante -->
		<b-form-group
		v-if="use_article_variants"
		label="Variante">
			<b-form-select
			:options="article_variant_options"
			v-model="article_variant_id"></b-form-select>
		</b-form-group>



		<b-form-group
		label="Deposito ORIGEN">
			<b-form-select
			id="from_address_id"
			v-model="from_address_id"
			:options="from_address_options"></b-form-select>
		</b-form-group>

		<b-form-group
		label="Deposito DESTINO">
			<b-form-select
			id="to_address_id"
			v-model="to_address_id"
			:options="to_address_options"></b-form-select>
		</b-form-group>



		<!-- Cantidad -->
		<b-form-group
		label="Cantidad">
			<b-form-input
			id="amount"
			placeholder="Ingerse la cantidad de stock para mover"
			v-model="amount_"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Observaciones">
			<b-form-textarea
			v-model="observations"
			placeholder="Ingerse alguna observacion..."></b-form-textarea>
		</b-form-group>

		<btn-loader
		@clicked="save"
		dusk="btn_guardar_movimiento_deposito"
		:loader="loading"
		text="Guardar"></btn-loader>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
		is_model_selected() {
			return typeof this.model.article_variants != 'undefined'
		},

		store_addresses() {
			return this.$store.state.address.models 
		},
		addresses() {
			return this.model.addresses
		},
		use_article_variants() {
			if (this.is_model_selected) {
				return this.model.article_variants.length
			}
			return false
		},
		article_variant_options() {
			if (this.is_model_selected) {

				let options = [{
					value: 0,
					text: 'Seleccione Variante'
				}]

				this.model.article_variants.forEach(article_variant => {
					options.push({
						value: article_variant.id,
						text: article_variant.variant_description
					})
				})

				return options
			}
		},

		from_address_options() {

			if (this.is_model_selected) {

				let options = [{
					value: 0,
					text: 'Seleccione direccion'
				}]

				if (this.use_article_variants) {

					if (this.article_variant_id) {

						if (typeof this.selected_variant != 'undefined') {

							this.selected_variant.addresses.forEach(variant_address => {

								options.push({
									value: variant_address.id,
									text: variant_address.street+' '+this.address_variant_amount(variant_address)
								})
							})
						}
					}
				} else {

					this.addresses.forEach(address => {

						options.push({
							value: address.id,
							text: address.street+' '+this.address_variant_amount(address)
						})
					})
				}

				return options
			}
		},

		to_address_options() {

			if (this.is_model_selected) {
				
				let options

				if (this.use_article_variants) {

					if (this.article_variant_id) {

						if (typeof this.selected_variant != 'undefined') {

							options = this.get_from_addresses_options()

							// this.store_addresses.forEach(address => {

							// 	if (!this.is_from_address(address)) {

							// 		let cantidad_actual = this.get_cantidad_actual(address)

							// 		options.push({
							// 			value: address.id,
							// 			text: address.street+' '+cantidad_actual
							// 		})
							// 	}
							// })
						}
					}
				} else {
					options = this.get_from_addresses_options()

					// this.addresses.forEach(address => {

					// 	if (!this.is_from_address(address)) {

					// 		options.push({
					// 			value: address.id,
					// 			text: address.street+' '+this.address_variant_amount(address)
					// 		})
					// 	}

					// })
				}

				return options
			}
		},

		selected_variant() {
			return this.model.article_variants.find(article_variant => {
				return article_variant.id == this.article_variant_id
			})
		},
	},
	data() {
		return {
			amount_: '',
			article_variant_id: 0,
			from_address_id: 0,
			to_address_id: 0,
			observations: '',
			loading: false,
		}
	},
	methods: {
		get_from_addresses_options() {
			let options = [{
				value: 0,
				text: 'Seleccione direccion'
			}]

			this.store_addresses.forEach(address => {

				if (!this.is_from_address(address)) {

					let cantidad_actual = this.get_cantidad_actual(address)

					options.push({
						value: address.id,
						text: address.street+' '+cantidad_actual
					})
				}
			})

			return options 
		},
		is_from_address(address) {

			return address.id == this.from_address_id
		},
		get_cantidad_actual(address) {

			let cantidad_actual = 0

			let address_actual 

			if (this.use_article_variants) {

				address_actual = this.selected_variant.addresses.find(address_variant => {
					return address_variant.id == address.id 
				})
			} else {

				address_actual = this.addresses.find(article_address => {
					return article_address.id == address.id 
				})

			}


			if (typeof address_actual != 'undefined') {

				cantidad_actual = address_actual.pivot.amount 
			}

			return '('+cantidad_actual+')'
		},	
		address_variant_amount(variant_address) {
			return '('+variant_address.pivot.amount+')'
		},
		save() {
			if (this.check()) {

				this.loading = true 
				this.$api.post('stock-movement', {
					model_id: this.model.id,
					amount: this.amount_,
					observations: this.observations,
					from_address_id: this.from_address_id,
					to_address_id: this.to_address_id,
					article_variant_id: this.article_variant_id,
					concepto_stock_movement_name: 'Mov manual entre depositos',
				})
				.then(res => {

					this.loadModel('article', this.model.id)
					.then(() => {

						this.loading = false
						this.$toast.success('Movimiento guardado')
						this.$bvModal.hide('address-movement') 
						this.$bvModal.hide('article')

						this.clear() 
					})

				})
				.catch(err => {
					this.loading = false 
					this.$toast.error(err)
					console.log(err)
				})
			}
		},

		clear() {

			this.amount_ = ''
			this.article_variant_id = 0
			this.from_address_id = 0
			this.to_address_id = 0
			this.observations = ''
		},

		check() {

			let from_address = this.get_from_address()

			if (typeof from_address == 'undefined') {

				this.$toast.error('Indique el deposito ORIGEN')
				return false
			}

			console.log('check from_address:')
			console.log(from_address)

			let from_address_actual_amount = from_address.pivot.amount

			if (Number(this.amount_) > Number(from_address_actual_amount)) {
				this.$toast.error('La cantidad no puede ser mayor a '+from_address_actual_amount)
				return false
			}
			return true
		},

		get_from_address() {

			if (this.use_article_variants) {

				return this.selected_variant.addresses.find(_address => {

					return _address.id == this.from_address_id
				})
			} else {

				return this.addresses.find(_address => {
					return _address.id == this.from_address_id
				})
			}
		},
	}
}
</script>