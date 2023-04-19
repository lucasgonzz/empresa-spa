<template>
<b-modal 
v-if="from_model"
id="saldo-inicial" 
title="Saldo inicial" 
hide-footer>
	<b-form-group>
		<b-form-input
		type="number"
		v-model="saldo_inicial"
		:placeholder="'Ingrese el saldo inicial para '+from_model.name"
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
	<btn-loader
	@clicked="saldoInicial"
	text="Agregar"
	:loader="loading"></btn-loader>
</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

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
				this.$api.post('/current-acount/saldo-inicial', {
					model_name	 : this.from_model_name,
					model_id	 : this.from_model.id,
					is_for_debe  : this.is_for_debe,
					saldo_inicial: this.saldo_inicial,
				})
				.then(res => {
					this.loading = false
					this.$toast.success('Saldo inicial registrado')
					this.$bvModal.hide('saldo-inicial')
					this.clear()
					this.$store.dispatch('current_acount/getModels')
					if (this.model_name == 'client') {
						this.updateClient(this.client)
					}
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