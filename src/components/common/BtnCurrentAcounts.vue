<template>
	<div>
		<b-button
		v-for="credit_account in model.credit_accounts"
		class="m-l-15"
		:id="'btn-current-acount-'+model.id"
		@click.stop="showCurrentAcounts(credit_account)"
		variant="success">
			C/C {{ credit_account.moneda.name }} <span v-if="credit_account.saldo != 0">({{ price(credit_account.saldo) }})</span>
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