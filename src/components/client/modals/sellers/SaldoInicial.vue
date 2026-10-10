<template>
<b-modal
title="Saldo inicial"
hide-footer
id="seller-commission-saldo-inicial">
	<b-form-group
	label="En el debe (lo que le debés)"
	label-for="seller-commission-saldo-inicial-debe">
		<b-form-input
		id="seller-commission-saldo-inicial-debe"
		v-model="form.debe"
		@keyup.enter="save"
		placeholder="Ingresar en el debe (se le debe al vendedor)"></b-form-input>
	</b-form-group>
	<b-form-group
	label="En el haber (lo que ya le pagaste)"
	label-for="seller-commission-saldo-inicial-haber">
		<b-form-input
		id="seller-commission-saldo-inicial-haber"
		v-model="form.haber"
		@keyup.enter="save"
		placeholder="Ingresar en el haber (se le pagó al vendedor)"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="save"
	text="Guardar"
	:loader="loading"></btn-loader>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			form: {
				debe: '',
				haber: '',
			},
			loading: false,
		}
	},
	computed:{
		selected_model() {
			return this.$store.state.seller_commission.selected_model
		},
		moneda_id() {
			return this.$store.state.seller_commission.moneda_id
		},
	},
	methods: {
		/*
			Un importe es un número mayor a cero. `parseFloat` lee el número del principio del texto,
			igual que el `(float)` con el que la API decide lo mismo: vacío, cero o texto no cuentan.
		*/
		tiene_importe(valor) {
			return parseFloat(valor) > 0
		},
		save() {
			// Enter dos veces seguidas mandaba dos POST: mientras se guarda, no sale otro.
			if (this.loading) {
				return
			}
			// Mismo texto que devuelve la API (SellerCommissionController@saldoInicial).
			if (!this.tiene_importe(this.form.debe) && !this.tiene_importe(this.form.haber)) {
				this.$toast.error('Ingresá el saldo inicial en el debe o en el haber.')
				return
			}
			this.loading = true
			this.$api.post('seller-commission/saldo-inicial', {
				...this.form,
				seller_id: this.selected_model.id,
				moneda_id: this.moneda_id,
			})
			.then(res => {
				this.loading = false
				/*
					El modal "Comisiones de vendedor" lee el vendedor de `selected_model`. La API
					devuelve el vendedor con `seller_commissions_count` ya contando este saldo: al
					ponerlo ahí, el botón "Saldo inicial" se va sin tener que cerrar y abrir
					Comisiones. Es el mismo vendedor (mismo id), así que no se pierde el rango ni el
					filtro que estaban elegidos.
				*/
				this.$store.commit('seller_commission/setSelectedModel', res.data.model)
				this.$store.dispatch('seller_commission/getModels')
				this.$toast.success('Guardado')
				this.$bvModal.hide('seller-commission-saldo-inicial')
				this.form.debe = ''
				this.form.haber = ''
				this.$store.commit('seller/add', res.data.model)
			})
			.catch(err => {
				this.loading = false
				let mensaje = 'Error al guardar'
				if (err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				this.$toast.error(mensaje)
			})
		}
	}
}
</script>