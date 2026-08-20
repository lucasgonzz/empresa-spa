<template>
	<div>
		<!--
			🔴 El data-testid lleva la moneda ademas del id del modelo, y el `id` de al lado NO.
			Este v-for emite un boton por cada credit_account (pesos y dolares), asi que con la
			extension ventas_en_dolares prendida los dos botones de un mismo proveedor comparten el
			`id` --que en HTML tiene que ser unico y no lo es--. El testid no repite ese error.
		-->
		<b-button
		v-for="credit_account in model.credit_accounts"
		class="m-l-15"
		v-if="show(credit_account)"
		:id="'btn-current-acount-'+model.id"
		:data-testid="'btn-current-acount-'+model.id+'-'+credit_account.moneda_id"
		@click.stop="showCurrentAcounts(credit_account)"
		variant="success">
			C/C {{ credit_account.moneda.name }}
		</b-button> 
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		model: Object,
	},
	methods: { 
		show(credit_account) {
			return credit_account.moneda_id == 1 || this.hasExtencion('ventas_en_dolares')
		},
		showCurrentAcounts(credit_account) {
			this.$store.commit('current_acount/setFromModelName', this.model_name)
			this.$store.commit('current_acount/setFromModel', this.model)
			this.$store.commit('current_acount/set_from_credit_account', credit_account)
			this.$store.dispatch('current_acount/getModels')
			this.$bvModal.show('current-acounts')
		},
	},
}
</script>