<template>
<b-modal id="saldo-inicial-client" title="Saldo inicial" hide-footer>
	<b-form-group>
		<b-form-input
		type="number"
		v-model="saldo_inicial"
		:placeholder="'Ingrese el saldo inicial para '+client.name"
		@keydown.enter="saldoInicial"></b-form-input>
	</b-form-group>
	<b-form-group>
		<b-form-radio
		v-model="is_for_debe"
		:value="true">
			Ingresar en el debe
		</b-form-radio>
		<b-form-radio
		v-model="is_for_debe"
		:value="false">
			Ingresar en el haber
		</b-form-radio>
	</b-form-group>
	<b-form-group>
		<b-button
		@click="saldoInicial"
		block
		variant="primary">
			<btn-loader
			text="Agregar"
			:loader="loading"></btn-loader>
		</b-button>
	</b-form-group>
</b-modal>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'

import clients from '@/mixins/clients'
import current_acounts from '@/mixins/current_acounts'
export default {
	name: 'SaldoInicialClient',
	mixins: [clients, current_acounts],
	components: {
		BtnLoader,
	},
	data() {
		return {
			saldo_inicial: '',
			is_for_debe: true,
			loading: false,
		}
	},
	methods: {
		saldoInicial() {
			if (this.check()) {
				this.loading = true
				this.$api.post('/clients/saldo-inicial', {
					client_id	 : this.client.id,
					is_for_debe  : this.is_for_debe,
					saldo_inicial: this.saldo_inicial,
				})
				.then(res => {
					this.loading = false
					this.$toast.success('Saldo inicial agregado')
					this.$bvModal.hide('saldo-inicial-client')
					this.clear()
					this.$store.dispatch('current_acount/getModels')
					this.updateClient(this.client)
				})
				.catch(err => {
					console.log(err)
					this.loading = false
				})
			}
		},
		check() {
			if (this.saldo_inicial == '') {
				this.$toast.error('Ingrese el saldo')
				return false
			}
			return true
		},
		clear() {
			this.saldo_inicial = ''
			this.is_for_debe = true
		}
	}
}
</script>