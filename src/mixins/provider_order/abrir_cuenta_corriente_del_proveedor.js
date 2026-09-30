/**
 * Abre la cuenta corriente de un proveedor desde Compras (mision
 * cuenta-corriente-proveedor-en-compras, 30/9/2026).
 *
 * 🔴 POR QUE SE PIDE EL PROVEEDOR AL HACER CLIC Y NO SE USA EL QUE YA VIENE EN LA COMPRA.
 * `ProviderOrder::withAll()` carga `provider` a secas, sin `credit_accounts`. Y el modal de la
 * cuenta corriente (common/current-acounts) no sabe de que proveedor habla por el id: lee
 * `current_acount.from_model` y `from_credit_account`, y pide los movimientos por el id de la
 * CUENTA. Sin `credit_accounts` no hay cuenta que abrir. `GET provider/{id}` si las trae
 * (`Provider::scopeWithAll` → `credit_accounts.moneda`).
 *
 * La secuencia de commits es la misma de `common/BtnCurrentAcounts.showCurrentAcounts()`: es la
 * unica forma en que ese modal sabe de que cuenta habla.
 */
export default {
	data() {
		return {
			// true mientras viaja el pedido del proveedor: evita que dos clics seguidos disparen dos
			// aperturas (y dos GET).
			abriendo_cuenta_corriente: false,
		}
	},
	methods: {
		/**
		 * Trae el proveedor con sus cuentas y abre el modal de la cuenta corriente.
		 *
		 * @param {Number} provider_id
		 * @param {Number|null} moneda_id Moneda de la compra desde la que se hizo el clic. Si el
		 * proveedor tiene una cuenta en esa moneda se abre esa; si no, la de pesos.
		 * @returns {void}
		 */
		abrir_cuenta_corriente_del_proveedor(provider_id, moneda_id) {
			if (!provider_id || this.abriendo_cuenta_corriente) {
				return
			}
			this.abriendo_cuenta_corriente = true
			let self = this
			this.$api.get('provider/'+provider_id)
			.then(function (res) {
				self.abriendo_cuenta_corriente = false
				let provider = res.data.model
				let cuenta = self.cuenta_corriente_a_abrir(provider, moneda_id)
				if (!cuenta) {
					self.$toast.error('Este proveedor no tiene cuenta corriente')
					return
				}
				self.$store.commit('current_acount/setFromModelName', 'provider')
				self.$store.commit('current_acount/setFromModel', provider)
				self.$store.commit('current_acount/set_from_credit_account', cuenta)
				self.$store.dispatch('current_acount/getModels')
				self.$bvModal.show('current-acounts')
			})
			.catch(function (err) {
				self.abriendo_cuenta_corriente = false
				console.log(err)
				self.$toast.error('No pudimos abrir la cuenta corriente del proveedor')
			})
		},
		/**
		 * Cual de las cuentas del proveedor se abre.
		 *
		 * 🔴 `moneda_id` 0 y null cuentan como PESOS igual que el 1: hay `credit_accounts` y compras
		 * viejas con 0 donde no se eligio moneda, y comparar con `== 1` las deja sin cuenta
		 * (RecolectorBase::MONEDAS_PESOS = [0, 1] en empresa-api; mismo criterio que
		 * asistente-ia/CuentaCorrienteDeMencion.vue).
		 *
		 * El orden de preferencia: la cuenta en la moneda de la compra → la de pesos → la primera
		 * que haya.
		 *
		 * 🔴 El API manda SIEMPRE las dos cuentas (pesos y dolares: `crear_credit_accounts` las crea
		 * juntas y `Provider::scopeWithAll` no filtra). El filtro por la extension `ventas_en_dolares`
		 * esta del lado del SPA (`BtnCurrentAcounts.show()`), asi que se repite aca: sin la extension,
		 * una compra vieja con `moneda_id` 2 abriria una cuenta en dolares que la ficha del proveedor
		 * no ofrece.
		 *
		 * @param {Object} provider
		 * @param {Number|null} moneda_id
		 * @returns {Object|null}
		 */
		cuenta_corriente_a_abrir(provider, moneda_id) {
			let cuentas = provider && Array.isArray(provider.credit_accounts) ? provider.credit_accounts : []
			if (!this.hasExtencion('ventas_en_dolares')) {
				cuentas = cuentas.filter(function (cuenta) {
					return (Number(cuenta.moneda_id) || 1) == 1
				})
			}
			if (!cuentas.length) {
				return null
			}
			let moneda_de_la_cuenta = function (cuenta) {
				return Number(cuenta.moneda_id) || 1
			}
			let moneda_buscada = Number(moneda_id) || 1
			let de_la_compra = cuentas.find(function (cuenta) {
				return moneda_de_la_cuenta(cuenta) == moneda_buscada
			})
			if (de_la_compra) {
				return de_la_compra
			}
			let en_pesos = cuentas.find(function (cuenta) {
				return moneda_de_la_cuenta(cuenta) == 1
			})
			return en_pesos || cuentas[0]
		},
	},
}
