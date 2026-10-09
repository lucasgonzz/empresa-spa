<template>
	<b-modal
	hide-footer
	title="Rechazado por proveedor"
	id="rechazado-por-proveedor">

		<p
		v-if="salio_de_un_gasto">
			Este cheque salió de un gasto. Se marca como rechazado y no se mueve ninguna cuenta corriente.
		</p>
		<p
		v-else>
			El proveedor no pudo cobrar el cheque N° {{ cheque.numero }} por {{ monto }}. Se marca como rechazado y se le carga a {{ nombre_del_proveedor }} una nota de débito por {{ monto }}: la deuda vuelve a su cuenta corriente.
		</p>

		<b-button
		@click="rechazar_por_proveedor"
		:disabled="enviando"
		block
		variant="danger">
			Marcar como rechazado
		</b-button>
	</b-modal>
</template>
<script>
/**
 * Modal "Rechazado por proveedor" de Cheques → Emitido.
 *
 * Misión cheques-emitidos-rechazo-proveedor (9/10/2026): marca el emitido como rechazado con
 * `PUT cheque/rechazar-por-proveedor`. Si el cheque salió de un pago a un proveedor, la API le
 * carga en la misma transacción una nota de débito por el monto del cheque: desde la 4.3.9 un pago
 * con un cheque rechazado no se puede eliminar, así que sin la nota la deuda no volvía nunca a su
 * cuenta corriente. Si salió de un gasto, solo se marca (un gasto no tiene cuenta corriente).
 *
 * Sin campo de motivo a propósito: mientras la API no lo guarde para los emitidos, un texto que se
 * tipea y se pierde es peor que no pedirlo.
 */
export default {
	computed: {
		cheque() {
			return this.$store.state.cheque.model
		},
		salio_de_un_gasto() {
			return !!this.cheque.expense_id
		},
		monto() {
			return this.price(this.cheque.amount)
		},
		nombre_del_proveedor() {
			if (this.cheque.provider && this.cheque.provider.name) {
				return this.cheque.provider.name
			}
			return 'el proveedor'
		},
	},
	data() {
		return {
			enviando: false,
		}
	},
	methods: {
		rechazar_por_proveedor() {
			if (this.enviando) {
				return
			}

			let self = this
			this.enviando = true
			this.$store.commit('auth/setMessage', 'Marcando cheque como rechazado')
			this.$store.commit('auth/setLoading', true)
			// `skip_global_error_event`: el 422 trae un texto para el comerciante y lo muestra el catch,
			// una sola vez (sin la bandera, el interceptor de main.js lo sacaba además como warning).
			this.$api.put('cheque/rechazar-por-proveedor', {
				cheque_id: this.cheque.id,
			}, {
				skip_global_error_event: true,
			})
			.then(res => {
				self.enviando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.dispatch('cheque/getModels')
				// Con nota de débito, el saldo del proveedor cambió: se recarga su ficha en el store.
				if (res.data.nota_debito) {
					self.loadModel('provider', res.data.nota_debito.provider_id)
				}
				self.$toast.success(res.data.mensaje || 'Cheque marcado como rechazado')
				self.$bvModal.hide('rechazado-por-proveedor')
			})
			.catch(err => {
				console.log(err)
				self.enviando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.error(self.mensaje_de_error(err), {
					duration: 10000,
				})
			})
		},
		/**
		 * El 422 de la API trae en `message` por qué no se marcó (cheque ajeno, no emitido, ya
		 * pagado o rechazado). Cualquier otra respuesta (un 404/405 de una API sin el endpoint, un
		 * 500) cae al texto genérico, para no mostrar un mensaje técnico en inglés.
		 *
		 * @param {Object} err Error de axios.
		 * @returns {String}
		 */
		mensaje_de_error(err) {
			if (err && err.response && err.response.status == 422 && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			return 'No se pudo marcar el cheque como rechazado'
		},
	},
}
</script>
