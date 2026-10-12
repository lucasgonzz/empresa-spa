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
		type="number"
		v-model="form.debe"
		@keyup.enter="save"
		placeholder="Se le debe al vendedor"></b-form-input>
	</b-form-group>
	<b-form-group
	label="En el haber (lo que ya le pagaste)"
	label-for="seller-commission-saldo-inicial-haber">
		<b-form-input
		id="seller-commission-saldo-inicial-haber"
		type="number"
		v-model="form.haber"
		@keyup.enter="save"
		placeholder="Se le pagó al vendedor"></b-form-input>
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
			Un importe es un número mayor a cero redondeado a centavos, con el mismo criterio que la
			API (`is_numeric` + `round(…, 2)`): vacío, cero, negativo o texto no cuentan. `Number` y no
			`parseFloat`, que de "50,5" lee 50 y dejaría pasar otro importe.
		*/
		tiene_importe(valor) {
			return Math.round(Number(valor) * 100) / 100 > 0
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
			}, {
				// El error lo muestra el `catch` de abajo: sin esto el aviso global lo repetía.
				skip_global_error_event: true,
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
				/*
					"Ya tiene movimientos": el vendedor que estaba abierto era viejo (por ejemplo, otra
					pestaña le cargó un movimiento). La API manda el vendedor actual: con él el botón
					"Saldo inicial" se va, y el panel se refresca para mostrar lo que ya tiene.
				*/
				if (err.response && err.response.data && err.response.data.model) {
					this.$store.commit('seller_commission/setSelectedModel', err.response.data.model)
					this.$store.commit('seller/add', err.response.data.model)
					this.$store.dispatch('seller_commission/getModels')
					this.$bvModal.hide('seller-commission-saldo-inicial')
				}
			})
		}
	}
}
</script>