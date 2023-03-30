<template>
	<b-form-group
	v-if="deposits.length"
	label="Depositos">
		<b-input-group
		v-for="deposit in deposits"
		:key="deposit.id"
		class="m-b-10"
		:prepend="deposit.name">
			<b-form-input
			:placeholder="'Ingrese '+deposit.name"
			v-model="article.deposits[deposit.id]"
			autocomplete="off"></b-form-input>
		</b-input-group>
	</b-form-group>
</template>
<script>
export default {
	props: ['article'],
	computed: {
		deposits() {
			return this.$store.state.deposit.models 
		},
	}
}
</script>