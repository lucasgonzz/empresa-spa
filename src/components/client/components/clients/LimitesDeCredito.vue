<template>
<div class="limites-de-credito">
	<p
	v-if="!model.credit_accounts || !model.credit_accounts.length"
	class="limites-de-credito__vacio">
		Este cliente todavía no tiene cuenta corriente. Se crea sola al fijarle un límite o al
		registrarle el primer movimiento.
	</p>

	<div
	v-for="credit_account in filas"
	:key="credit_account.moneda_id"
	class="limites-de-credito__fila">
		<span class="limites-de-credito__moneda">{{ credit_account.moneda ? credit_account.moneda.name : moneda_nombre(credit_account.moneda_id) }}</span>

		<b-form-input
		type="number"
		min="0"
		step="0.01"
		v-model="limites[credit_account.moneda_id]"
		placeholder="Sin límite"
		class="limites-de-credito__input"></b-form-input>

		<b-button
		size="sm"
		variant="primary"
		:disabled="guardando_moneda_id === credit_account.moneda_id"
		@click="guardar(credit_account)">
			Guardar
		</b-button>
	</div>

	<p class="limites-de-credito__ayuda">Vacío = sin límite.</p>
</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	data() {
		return {
			limites: {},
			guardando_moneda_id: null,
		}
	},
	computed: {
		/*
			Misma regla que BtnCurrentAcounts.show(): un negocio sin la extension ventas_en_dolares
			ve una sola fila (Peso) y nunca se entera de que existe la de dolares.
		*/
		filas() {
			let credit_accounts = (this.model && this.model.credit_accounts) ? this.model.credit_accounts : []
			let visibles = credit_accounts.filter(credit_account => this.mostrar(credit_account))

			/*
				Cliente viejo sin credit_accounts todavia: se ofrece igual la fila de Peso. El
				endpoint crea la cuenta sola (CreditAccountHelper::crear_credit_accounts()) al
				guardar el primer limite, asi que no hace falta esperar a que exista.
			*/
			if (!visibles.length) {
				return [{ moneda_id: 1, limite_credito: null, moneda: { name: 'Peso' } }]
			}

			return visibles
		},
	},
	watch: {
		// immediate: true cubre tambien la inicializacion al montar, asi que no hace falta
		// repetir la llamada en created().
		model: {
			immediate: true,
			handler() {
				this.inicializar_limites()
			},
		},
	},
	methods: {
		mostrar(credit_account) {
			return credit_account.moneda_id == 1 || this.hasExtencion('ventas_en_dolares')
		},
		moneda_nombre(moneda_id) {
			return moneda_id == 2 ? 'Dolar' : 'Peso'
		},
		inicializar_limites() {
			// Las dos monedas se declaran de entrada (aunque no haya credit_account todavia) para
			// que Vue las trackee como reactivas desde el vamos: v-model escribe sobre estas claves.
			let credit_accounts = (this.model && this.model.credit_accounts) ? this.model.credit_accounts : []
			let limites = { 1: null, 2: null }
			credit_accounts.forEach(credit_account => {
				limites[credit_account.moneda_id] = credit_account.limite_credito
			})
			this.limites = limites
		},
		guardar(credit_account) {
			let self = this
			self.guardando_moneda_id = credit_account.moneda_id
			self.$api.post('credit-account/limite-credito', {
				model_name: 'client',
				model_id: self.model.id,
				moneda_id: credit_account.moneda_id,
				limite_credito: self.limites[credit_account.moneda_id],
			})
			.then(function (res) {
				self.guardando_moneda_id = null
				self.$store.commit('client/add', res.data.model)
				self.$toast.success('Límite de crédito guardado')
			})
			.catch(function (err) {
				self.guardando_moneda_id = null
				console.log(err)
				self.$toast.error('No se pudo guardar el límite de crédito')
			})
		},
	},
}
</script>
<style scoped lang="sass">
// Sin hexadecimales: tokens de color, igual criterio que el resto de los modales/formularios del
// sistema (los modales de bootstrap-vue cuelgan de body, fuera de #app, y un hex rompe modo oscuro).
.limites-de-credito
	display: flex
	flex-direction: column
	gap: 10px

	&__vacio
		color: var(--color-text-secondary)
		margin-bottom: 5px

	&__fila
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 10px

	&__moneda
		min-width: 60px
		font-weight: 600
		color: var(--color-text-primary)

	&__input
		max-width: 180px
		flex: 1 1 120px

	&__ayuda
		color: var(--color-text-secondary)
		font-size: 0.8125rem
		margin-bottom: 0
</style>
