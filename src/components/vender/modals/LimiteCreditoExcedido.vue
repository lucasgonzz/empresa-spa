<template>
<b-modal
id="limite-credito-excedido"
data-tour="vender.modal_limite_credito"
title="No se puede guardar la venta"
:no-close-on-backdrop="true"
:no-close-on-esc="true"
hide-footer>
	<p>
		La venta no se puede guardar porque el cliente <b>{{ info.client_name }}</b> superaría su
		límite de crédito en {{ info.moneda_name }}.
	</p>

	<div class="limite-credito-numeros">
		<div class="limite-credito-numeros__fila">
			<span class="limite-credito-numeros__etiqueta">Saldo actual</span>
			<span class="limite-credito-numeros__valor">{{ price(info.saldo_actual) }}</span>
		</div>
		<div class="limite-credito-numeros__fila">
			<span class="limite-credito-numeros__etiqueta">Total de esta venta</span>
			<span class="limite-credito-numeros__valor">{{ price(info.total_venta) }}</span>
		</div>
		<div class="limite-credito-numeros__fila">
			<span class="limite-credito-numeros__etiqueta">Saldo si se guarda</span>
			<span class="limite-credito-numeros__valor limite-credito-numeros__valor--rojo">{{ price(info.saldo_resultante) }}</span>
		</div>
		<div class="limite-credito-numeros__fila">
			<span class="limite-credito-numeros__etiqueta">Límite de crédito</span>
			<span class="limite-credito-numeros__valor">{{ price(info.limite_credito) }}</span>
		</div>
		<div class="limite-credito-numeros__fila">
			<span class="limite-credito-numeros__etiqueta">Se pasa por</span>
			<span class="limite-credito-numeros__valor limite-credito-numeros__valor--rojo">{{ price(info.excedente) }}</span>
		</div>
	</div>

	<div class="limite-credito-acciones">
		<b-button
		v-if="credit_account"
		variant="primary"
		@click="ir_a_cuenta_corriente">
			Ir a la cuenta corriente
		</b-button>
		<b-button
		variant="outline-secondary"
		@click="volver_a_la_venta">
			Volver a la venta
		</b-button>
	</div>

	<p class="limite-credito-nota">
		O pedile al administrador del sistema que le suba el límite de crédito a este cliente.
	</p>
</b-modal>
</template>
<script>
export default {
	computed: {
		info() {
			return this.$store.state.vender.limite_credito_excedido || {}
		},
		credit_account() {
			let client = this.$store.state.vender.client
			if (!client || !client.credit_accounts) {
				return null
			}
			return client.credit_accounts.find(ca => ca.id == this.info.credit_account_id)
		},
	},
	methods: {
		/*
			Misma secuencia exacta que BtnCurrentAcounts.showCurrentAcounts(): el modal
			'current-acounts' ya está montado en views/Vender.vue, así que se abre encima.
		*/
		ir_a_cuenta_corriente() {
			if (!this.credit_account) {
				return
			}
			this.$store.commit('current_acount/setFromModelName', 'client')
			this.$store.commit('current_acount/setFromModel', this.$store.state.vender.client)
			this.$store.commit('current_acount/set_from_credit_account', this.credit_account)
			this.$store.dispatch('current_acount/getModels')
			this.$bvModal.hide('limite-credito-excedido')
			this.$bvModal.show('current-acounts')
		},
		volver_a_la_venta() {
			this.$bvModal.hide('limite-credito-excedido')
		},
	}
}
</script>
<style scoped lang="sass">
// Los modales de bootstrap-vue cuelgan de `body`, fuera de `#app`: por eso todos los colores de acá
// salen de tokens (`var(--color-...)`) y no de hexadecimales. Un hex acá deja el modal blanco en
// modo oscuro (mismo motivo documentado en el encabezado de current-acounts/Index.vue).
.limite-credito-numeros
	display: flex
	flex-direction: column
	gap: 8px
	margin: 15px 0
	padding: 12px 15px
	background: var(--bg-section)
	border-radius: 8px
	border: 1px solid var(--color-border)

	&__fila
		display: flex
		flex-wrap: wrap
		justify-content: space-between
		gap: 8px

	&__etiqueta
		color: var(--color-text-secondary)

	&__valor
		font-weight: 600
		color: var(--color-text-primary)

		&--rojo
			color: var(--btn-peligro-texto)

.limite-credito-acciones
	display: flex
	flex-wrap: wrap
	gap: 10px
	margin-bottom: 15px

.limite-credito-nota
	color: var(--color-text-secondary)
	font-size: 0.875rem
	margin-bottom: 0
</style>
