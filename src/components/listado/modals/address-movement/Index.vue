<template>
<b-modal
hide-footer
title="Movimiento de deposito"
id="address-movement">

		<b-form-group
		label="Cantidad">
			<b-form-input
			placeholder="Ingerse la cantidad de stock para mover"
			v-model="amount_"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Deposito ORIGEN">
			<b-form-select
			v-model="from_address_id"
			:options="getOptions({key: 'from_address_id', text: 'Deposito', store: 'address'})"></b-form-select>
		</b-form-group>

		<b-form-group
		label="Deposito DESTINO">
			<b-form-select
			v-model="to_address_id"
			:options="getOptions({key: 'to_address_id', text: 'Deposito', store: 'address'})"></b-form-select>
		</b-form-group>

		<b-form-group
		label="Observaciones">
			<b-form-textarea
			v-model="observations"
			placeholder="Ingerse alguna observacion..."></b-form-textarea>
		</b-form-group>

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
		model() {
			return this.$store.state.article.model 
		},
	},
	data() {
		return {
			amount_: '',
			from_address_id: 0,
			to_address_id: 0,
			observations: '',
			loading: false,
		}
	},
	methods: {
		save() {
			this.loading = true 
			this.$api.post('stock-movement', {
				model_id: this.model.id,
				amount: this.amount_,
				observations: this.observations,
				from_address_id: this.from_address_id,
				to_address_id: this.to_address_id,
			})
			.then(res => {
				this.loading = false
				this.$toast.success('Movimiento guardado')
				this.$bvModal.hide('address-movement') 
				this.$bvModal.hide('article') 
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error(err)
				console.log(err)
			})
		}
	}
}
</script>