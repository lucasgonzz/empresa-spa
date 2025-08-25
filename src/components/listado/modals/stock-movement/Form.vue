<template>
	<div>
		<b-form-group
		label="Cantidad">
			<b-form-input
			id="stock-movement-amount"
			@keyup.enter="save"
			v-model="amount_"
			placeholder="Ingrese cantidad"></b-form-input>
		</b-form-group>

		<b-form-group
		v-if="amount_ >= 1"
		label="Proveedor">
			<search-component
			ref="search_component"
			:model="article"
			:prop="{key: 'provider_id', text: 'Proveedor', use_store_models: true}"
			id="stock-movement-search-povider"
			@setSelected="setSelectedProvider"
			model_name="provider"
			show_btn_create
			clear_query 
			save_if_not_exist
			auto_select></search-component>
		</b-form-group>



		<!-- Variante -->
		<b-form-group
		v-if="article.article_variants.length"
		label="Variante">
			<b-form-select
			v-model="article_variant_id"
			:options="article_variant_options"></b-form-select>
		</b-form-group>



		<!-- Direcciones -->
		<p
		v-if="addresses.length && (!article.addresses.length && (article.stock || article.stock > 0))"
		>Para indicar el deposito, primero divida el stock global del articulo hacia el o los depositos correspondientes</p>

		<b-form-group
		v-if="addresses.length && (article.addresses.length || article.article_variants.length || (!article.stock || article.stock == 0))"
		label="Deposito DESTINO">
			<b-form-select
			v-model="to_address_id"
			:options="getOptions({key: 'to_address_id', text: 'Deposito', store: 'address'})"></b-form-select>
		</b-form-group>



		<!-- Observaciones -->
		<b-form-group
		label="Observaciones">
			<b-form-textarea
			v-model="observations"
			dusk="stock-movement-observations"
			placeholder="Ingerse alguna observacion..."></b-form-textarea>
		</b-form-group>

		<btn-loader
		dusk="btn_guardar_stock_movement"
		@clicked="save"
		:loader="loading"
		text="Guardar"></btn-loader>
	</div>
</template>
<script>
import { ref } from 'vue'
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		addresses() {
			return this.$store.state.address.models
		},
		providers() {
			return this.$store.state.provider.models
		},
		article_variant_options() {
			let options = [{
				value: 0,
				text: 'Seleccione Variante'
			}]

			this.article.article_variants.forEach(article_variant => {
				options.push({
					value: article_variant.id,
					text: article_variant.variant_description,
				})
			})
			return options
		}
	},
	data() {
		return {
			to_address_id: 0,
			article_variant_id: 0,
			amount_: '',
			observations: '',
			loading: false,
		}
	},
	created() {
		this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
			if (modal_id == 'stock-movement') {
				this.setDefaultAddress() 
			}
		})
	},
	methods: {
		setSelectedProvider(result) {
			this.$set(this.article, 'provider', result.model)
			this.article.provider_id = result.model.id
		},
		save() {
			if (this.check()) {
				this.loading = true 
				this.$api.post('stock-movement', {
					model_id: this.article.id, 
					amount: this.amount_,
					observations: this.observations,
					provider_id: this.article.provider_id,
					to_address_id: this.to_address_id,
					article_variant_id: this.article_variant_id,
				})
				.then(res => {
					this.loading = false 
					this.$toast.success('Movimiento guardado')
					this.$bvModal.hide('stock-movement')

					// this.$bvModal.hide('article') 
					
					this.setTemporalId(res.data.model)
					
					if (!this.article.id) {
						this.article.stock = this.amount_
					}
					if (this.article.id) {

						this.loadModel('article', this.article.id)
						this.article.stock = Number(this.article.stock) + Number(this.amount_)

						// if (this.article.addresses.length) {
						// 	setTimeout(() => {
						// 		let store_article = this.$store.state.article.models.find(_article => {
						// 			return _article.id == this.article.id
						// 		})
						// 		console.log('se va a actualizar addresses con')
						// 		console.log(store_article.addresses)
						// 		this.setModel(store_article, 'article', [], false)
						// 	}, 1500)
						// }
					}
				})
				.catch(err => {
					this.loading = false 
					console.log(err)
				})
			}
		},
		check() {
			if (this.article.addresses.length && this.to_address_id == 0) {
				this.$toast.error('Indique el deposito')
				return false 
			}

			if (this.article.article_variants.length 
				&& !this.article_variant_id) {

				this.$toast.error('Indique la variante')
				return false 
			}

			if (this.article.article_variants.length 
				&& this.article.article_variants[0].addresses.length
				&& this.to_address_id == 0
				) {

				this.$toast.error('Indique el deposito')
				return false 
			}
			return true
		},
		setTemporalId(created_stock_movement) {
			if (!this.article.id) {
				if (!this.article.childrens) {
					this.$set(this.article, 'childrens', [])
				}
				let new_childrens = [{
					model_name: 'stock_movement',
					temporal_id: created_stock_movement.temporal_id
				}]
				this.$set(this.article, 'childrens', this.article.childrens.concat(new_childrens))
				console.log('childrens:')
				console.log(this.article.childrens)
			}
		},
		setDefaultAddress() {
			console.log('setDefaultAddress')
			if (this.to_address_id == 0) {
				let default_address = this.$store.state.address.models.find(model => {
					return model.default_address
				})
				if (typeof default_address != 'undefined') {
					this.to_address_id = null 
					this.to_address_id = default_address.id 
					console.log('to_address_id')
					console.log(this.to_address_id)
				}
			}
		},
	}
}
</script>