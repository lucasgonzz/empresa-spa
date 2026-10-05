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
			// Doble Enter o doble clic mientras se guarda: el segundo no sale.
			if (this.loading) {
				return
			}
			if (this.check()) {
				let self = this
				this.loading = true
				this.$api.post('/current-acount/saldo-inicial', {
					// La cuenta de la moneda que esta abierta. Hasta el 5/10/2026 no se mandaba y la
					// API creaba el movimiento sin cuenta: no aparecia en ninguna (ver saldoInicial()
					// en CurrentAcountController).
					credit_account_id	: this.from_credit_account.id,
					model_name	 : this.from_model_name,
					model_id	 : this.from_model.id,
					is_for_debe  : this.is_for_debe,
					saldo_inicial: this.saldo_inicial,
				})
				.then(res => {
					self.loading = false
					self.$toast.success('Saldo inicial registrado')
					self.$bvModal.hide('saldo-inicial')
					self.clear()
					self.$store.dispatch('current_acount/getModels')
					// La franja "Saldo actual" lee la cuenta guardada al abrir el modal: se le pasa el
					// saldo nuevo para que no siga diciendo $0 al lado del saldo inicial recien cargado.
					if (res.data.credit_account && self.from_credit_account.id == res.data.credit_account.id) {
						self.$store.commit('current_acount/set_from_credit_account', Object.assign({}, self.from_credit_account, {
							saldo: res.data.credit_account.saldo,
						}))
					}
					// El cliente o proveedor del listado, con su saldo nuevo: lo mismo que hacen el pago
					// y las notas de credito y debito. (Antes llamaba a updateClient con un
					// `this.model_name` que este componente no tiene, asi que no corria nunca.)
					self.loadModel(self.from_model_name, self.from_model.id)
				})
				.catch(err => {
					// El 422 (cuenta con movimientos, monto invalido) lo muestra el aviso global de
					// errores con el mensaje de la API.
					console.log(err)
					self.loading = false
				})
			}
		},
		/**
		 * El monto tiene que ser un numero mayor a 0: si el cliente tiene plata a favor, se elige
		 * "Ingresar en el haber", no se escribe en negativo. La API valida lo mismo.
		 *
		 * @returns {Boolean}
		 */
		check() {
			if (this.saldo_inicial === '' || this.saldo_inicial === null) {
				this.$toast.error('Ingrese el saldo')
				return false
			}
			if (!(Number(this.saldo_inicial) > 0)) {
				this.$toast.error('El saldo inicial tiene que ser mayor a 0. Si tiene plata a favor, ingreselo en el haber.')
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