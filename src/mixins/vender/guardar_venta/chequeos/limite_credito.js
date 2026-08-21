export default {
	methods: {
		/**
		 * Guarda de UX del límite de crédito del cliente (misión 160).
		 *
		 * La autoridad es el 422 del backend (LimiteCreditoHelper::validar_venta_nueva): esto es
		 * sólo para no hacer el viaje y para que el aviso salga instantáneo. Si acá falta un dato
		 * -por ejemplo el cliente llegó desde un flujo que no cargó credit_accounts- se devuelve
		 * true y decide el back.
		 *
		 * @returns {Boolean} true = seguir guardando. false = abortar, ya se mostró el modal.
		 */
		check_limite_credito() {
			let vender = this.$store.state.vender

			// Sin cliente no hay cuenta corriente: venta de mostrador.
			if (!vender.client) {
				return true
			}

			// Las mismas tres condiciones que mira LimiteCreditoHelper en el back.
			if (vender.omitir_en_cuenta_corriente) {
				return true
			}
			if (!vender.save_current_acount) {
				return true
			}
			if (vender.to_check) {
				return true
			}

			/*
				Espejo de SaleHelper::check_guardad_cuenta_corriente_despues_de_facturar(): con la
				extensión activa, a un cliente SIN la bandera la venta no le entra a la cuenta
				corriente hasta que se factura, así que el saldo todavía no se mueve.
			*/
			if (this.hasExtencion('guardad_cuenta_corriente_despues_de_facturar')
				&& !vender.client.pasar_ventas_a_la_cuenta_corriente_sin_esperar_a_facturar) {
				return true
			}

			let moneda_id = vender.moneda_id ? vender.moneda_id : 1

			if (!vender.client.credit_accounts || !vender.client.credit_accounts.length) {
				return true
			}

			let credit_account = vender.client.credit_accounts.find(ca => ca.moneda_id == moneda_id)

			if (!credit_account
				|| credit_account.limite_credito === null
				|| typeof credit_account.limite_credito == 'undefined') {
				return true
			}

			/*
				Acá se usa el saldo denormalizado de la credit_account, mientras que el back
				recalcula con CurrentAcountHelper::getSaldo(). Pueden diferir por centavos o por
				un movimiento que otro usuario acaba de cargar: por eso esto es una guarda y no
				la validación. El número que se muestra en el modal cuando el aviso viene del 422
				es el del back, que es el bueno.
			*/
			let saldo_actual = Number(credit_account.saldo) || 0
			let total = Number(vender.total) || 0
			let limite = Number(credit_account.limite_credito)
			let saldo_resultante = saldo_actual + total

			if (saldo_resultante <= limite + 0.01) {
				return true
			}

			this.$store.commit('vender/set_limite_credito_excedido', {
				client_id: vender.client.id,
				client_name: vender.client.name,
				credit_account_id: credit_account.id,
				moneda_id: moneda_id,
				moneda_name: credit_account.moneda ? credit_account.moneda.name : '',
				saldo_actual: saldo_actual,
				total_venta: total,
				saldo_resultante: saldo_resultante,
				limite_credito: limite,
				excedente: saldo_resultante - limite,
			})

			this.sonido_error()
			this.$bvModal.show('limite-credito-excedido')

			return false
		},
	}
}
