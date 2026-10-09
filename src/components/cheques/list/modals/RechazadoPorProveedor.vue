<template>
	<b-modal
	hide-footer
	title="Rechazado por proveedor"
	id="rechazado-por-proveedor">

		<p>
			{{ texto_del_aviso }}
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
 * carga en la misma transacción una nota de débito por ese cheque: desde la 4.3.9 un pago con un
 * cheque rechazado no se puede eliminar, así que sin la nota la deuda no volvía nunca a su cuenta
 * corriente. Si no salió de un pago a un proveedor (un gasto, por ejemplo), solo se marca.
 *
 * Sin campo de motivo a propósito: mientras la API no lo guarde para los emitidos, un texto que se
 * tipea y se pierde es peor que no pedirlo.
 */
export default {
	computed: {
		cheque() {
			return this.$store.state.cheque.model
		},
		/**
		 * Lo que se le avisa antes de marcar. Se decide por PROVEEDOR y no solo por gasto: un cheque
		 * sin `provider_id` (un gasto de antes del 21/9/2026, que no guardaba `expense_id`, o un
		 * emitido que no salió de un pago) tampoco lleva nota de débito.
		 *
		 * El monto de la nota no se repite: en una cuenta en dólares no es el nominal del cheque, y el
		 * monto exacto lo dice el aviso que devuelve la API al marcarlo.
		 *
		 * @returns {String}
		 */
		texto_del_aviso() {
			if (this.cheque.expense_id) {
				return 'Este cheque salió de un gasto. Se marca como rechazado y no se mueve ninguna cuenta corriente.'
			}
			if (!this.cheque.provider_id) {
				return 'Este cheque no está atado a un pago a un proveedor. Se marca como rechazado y no se mueve ninguna cuenta corriente.'
			}
			return 'El proveedor no pudo cobrar '+this.cheque_y_numero+' por '+this.price(this.cheque.amount)+'. '
				+'Se marca como rechazado y se le carga '+this.a_quien_se_le_carga+' una nota de débito por ese cheque: '
				+'la deuda vuelve a su cuenta corriente.'
		},
		/**
		 * "el cheque N° 123", o "el cheque" a secas si no tiene número.
		 *
		 * @returns {String}
		 */
		cheque_y_numero() {
			let numero = this.cheque.numero
			if (numero === null || typeof numero == 'undefined' || String(numero).trim() === '') {
				return 'el cheque'
			}
			return 'el cheque N° '+String(numero).trim()
		},
		/**
		 * "a Juan Pérez", o "al proveedor" si el cheque no trae el nombre (nunca "a el proveedor").
		 *
		 * @returns {String}
		 */
		a_quien_se_le_carga() {
			if (this.cheque.provider && this.cheque.provider.name) {
				return 'a '+this.cheque.provider.name
			}
			return 'al proveedor'
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
				if (res.data.nota_debito) {
					self.refrescar_proveedor(res.data.nota_debito.provider_id)
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
				// Un 422 casi siempre es que el cheque cambió de estado en otra pestaña (o el doble
				// clic): la lista quedó vieja, así que se recarga y el modal se cierra.
				if (self.es_422(err)) {
					self.$store.dispatch('cheque/getModels')
					self.$bvModal.hide('rechazado-por-proveedor')
				}
			})
		},
		/**
		 * Con nota de débito, el saldo del proveedor cambió: se recarga su ficha en el store.
		 *
		 * Es lo mismo que el `loadModel()` de common-vue/mixins/generals.js, pero en silencio: ese
		 * mixin muestra un "Proveedor actualizado" que acá se sumaba al aviso de la nota.
		 *
		 * @param {Number} provider_id
		 * @returns {void}
		 */
		refrescar_proveedor(provider_id) {
			let self = this
			this.$api.get('provider/'+provider_id)
			.then(res => {
				self.$store.commit('provider/add', res.data.model)
			})
			.catch(err => {
				// La nota ya quedó cargada: si falla esto, el proveedor se ve al día en la próxima carga.
				console.log(err)
			})
		},
		/**
		 * @param {Object} err Error de axios.
		 * @returns {Boolean}
		 */
		es_422(err) {
			return !!(err && err.response && err.response.status == 422)
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
			if (this.es_422(err) && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			return 'No se pudo marcar el cheque como rechazado'
		},
	},
}
</script>
