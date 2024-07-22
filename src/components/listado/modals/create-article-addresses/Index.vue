<template>
<b-modal
v-if="article"
title="Crear depositos"
hide-footer
id="create-article-addresses">
	<p>
		Stock actual de {{ article.name }}: {{ article.stock }}
	</p>
	<p>
		Stock restante para repartir: {{ stock_restante }}
	</p>
	<p>
		Ingrese el stock para los siguientes depositos
	</p>
	<b-form-input
	class="m-b-15"
	v-for="address in addresses"
	:placeholder="'Stock para '+address.street"
	type="number"
	v-model="form[address.id]"></b-form-input>

	<btn-loader
	@clicked="save"
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
		article() {
			return this.$store.state.article.model 
		},
		addresses() {
			return this.$store.state.address.models 
		},
		stock_restante() {
			let total = this.article.stock 
			this.addresses.forEach(address => {
				if (typeof this.form[address.id] != 'undefined') {
					total -= Number(this.form[address.id])
				}
			})
			return total
		},
	},
	data() {
		return {
			form: {},
			loading: false,
		}
	},
	methods: {
		async save() {
			if (this.check()) {
				this.loading = true 
				for (var i = this.addresses.length - 1; i >= 0; i--) {
					console.log(this.form[this.addresses[i].id])
					await this.saveAddress(this.addresses[i])
					console.log('se guardo address '+this.addresses[i].street)
				}
				console.log('salio del forEaach')
				this.loadModel('article', this.model.id)
				.then(() => {
					this.loading = false 
					this.$bvModal.hide('create-article-addresses') 
					this.$bvModal.hide('article') 
					this.form = {}
				})
			}
		},
		saveAddress(address) {
			if (typeof this.form[address.id] != 'undefined' && this.form[address.id] != '') {
				return this.$api.post('stock-movement', {
					model_id: this.article.id,
					amount: this.form[address.id],
					concepto: 'Creacion de deposito',
					from_create_article_addresses: true,
					to_address_id: address.id
				})
			}

		},
		check() {
			let total = 0
			this.addresses.forEach(address => {
				if (typeof this.form[address.id] != 'undefined') {
					total += Number(this.form[address.id])
				}
			})
			if (total != this.article.stock) {
				this.$toast.error('Las cantidades repartidas no coinciden con el stock actual del articulo')
				return false
			}
			return true
		}
	}
}
</script>