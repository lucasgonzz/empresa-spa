<template>
	<!--
		Boton "Saldo inicial" de la barra de la cuenta corriente: se ofrece SOLO en una cuenta sin
		movimientos (el saldo inicial es el primer movimiento de la cuenta o no es). La clase de la
		barra (`cc-toolbar__btn`) la pone Nav.vue, que es el que dibuja la barra.
	-->
	<b-button
	v-if="mostrar"
	variant="light"
	title="Cargar el saldo con el que arranca esta cuenta"
	@click="saldoInicial">
		<i class="bi bi-flag"></i>
		Saldo inicial
	</b-button>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'
/**
 * Mision saldo-inicial-cuenta-corriente (5/10/2026).
 *
 * Antes el boton vivia suelto en Nav.vue con `v-if="from_model.current_acounts_count == 0"`, y no
 * aparecia NUNCA: ese conteo no viene en el cliente ni en el proveedor (el `withCount` esta
 * comentado en los dos `scopeWithAll`, porque se corre por cada fila del listado), y
 * `undefined == 0` es falso. Ademas contaba por cliente, sumando pesos y dolares, cuando el saldo
 * inicial va por CUENTA (una por moneda).
 *
 * 🔴 Por que no alcanza con mirar la lista que ya esta cargada. La lista es una VENTANA de la
 * cuenta (los ultimos N movimientos, o un periodo por fechas), asi que "la ventana vino vacia" no
 * es "la cuenta esta vacia". Por eso:
 *   - con filas a la vista, la cuenta tiene movimientos y no se pregunta nada;
 *   - con la lista vacia, se le pregunta a la API (`credit-account/{id}/tiene-movimientos`).
 * El boton sale solo con un `false` CONFIRMADO para la cuenta que esta abierta en ese momento:
 * mientras se pregunta, si la consulta falla o si la respuesta es de otra cuenta, no se ofrece.
 * Ofrecerlo de mas tampoco romperia nada (la API se niega a cargar un saldo inicial en una cuenta
 * con movimientos), pero un boton que aparece y despues dice que no, confunde.
 */
export default {
	name: 'BtnSaldoInicial',
	mixins: [current_acounts],
	data() {
		return {
			// Si la cuenta `cuenta_consultada_id` tiene algun movimiento. null = todavia no se sabe,
			// o la consulta fallo.
			tiene_movimientos: null,
			// La cuenta a la que corresponde `tiene_movimientos`.
			cuenta_consultada_id: null,
		}
	},
	computed: {
		/**
		 * La cuenta corriente abierta en el modal (una por moneda).
		 *
		 * @returns {Number|null}
		 */
		credit_account_id() {
			if (this.from_credit_account && this.from_credit_account.id) {
				return this.from_credit_account.id
			}
			return null
		},
		/**
		 * Cuantos movimientos hay cargados en la lista. Se mira el largo y no el arreglo porque
		 * agregar o borrar una fila (el saldo inicial recien cargado, el ultimo movimiento borrado)
		 * cambia el largo sin cambiar el arreglo.
		 *
		 * @returns {Number}
		 */
		cantidad_cargada() {
			return this.current_acounts ? this.current_acounts.length : 0
		},
		/**
		 * Si la lista de movimientos se esta pidiendo: mientras tanto lo que hay cargado puede ser de
		 * la cuenta anterior.
		 *
		 * @returns {Boolean}
		 */
		cargando() {
			return this.$store.state.current_acount.loading
		},
		/**
		 * @returns {Boolean}
		 */
		mostrar() {
			return this.tiene_movimientos === false
				&& this.credit_account_id !== null
				&& this.cuenta_consultada_id == this.credit_account_id
				&& this.cantidad_cargada == 0
				&& !this.cargando
		},
	},
	watch: {
		credit_account_id() {
			this.actualizar()
		},
		cantidad_cargada() {
			this.actualizar()
		},
	},
	created() {
		this.actualizar()
	},
	methods: {
		/**
		 * Decide si la cuenta abierta tiene movimientos: por la lista si hay filas, por la API si no.
		 *
		 * @returns {void}
		 */
		actualizar() {
			let self = this
			// La cuenta por la que se pregunta: si cuando llega la respuesta ya se abrio otra, se descarta.
			let credit_account_id = this.credit_account_id

			this.cuenta_consultada_id = credit_account_id

			if (credit_account_id === null) {
				this.tiene_movimientos = null
				return
			}

			if (this.cantidad_cargada > 0) {
				this.tiene_movimientos = true
				return
			}

			this.tiene_movimientos = null

			this.$api.get('credit-account/'+credit_account_id+'/tiene-movimientos', {
				// Es una consulta de fondo: si falla, el boton simplemente no aparece. Sin esto el
				// aviso global de errores le tiraria un cartel a quien solo abrio la cuenta.
				skip_global_error_event: true,
			})
			.then(res => {
				if (self.credit_account_id != credit_account_id) {
					return
				}
				// Solo un booleano de verdad: cualquier otra cosa (una pagina de error que llego con
				// 200, una API vieja) se trata como "no se sabe" y el boton no aparece.
				let respuesta = res.data ? res.data.tiene_movimientos : null
				self.tiene_movimientos = (respuesta === true || respuesta === false) ? respuesta : null
			})
			.catch(err => {
				console.log(err)
			})
		},
		saldoInicial() {
			this.$bvModal.show('saldo-inicial')
		},
	},
}
</script>
