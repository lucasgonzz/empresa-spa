<template>
	<div>
		<div 
		v-if="to_show.length"
		class="cheques">
			<div 
			v-for="cheque in to_show"
			class="cheque">
				<p class="numero">
					#{{ cheque.num }}
				</p>
				<p class="banco">
					{{ cheque.bank }}
				</p>
				<p class="cobro">
					Cobro: {{ date(cheque.payment_date) }}
				</p>
			</div>
		</div>
		<div
		class="text-with-icon"
		v-else>
			<i class="icon-eye-slash"></i>
			No hay cheques
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		cheques() {
			return this.$store.state.cheque.models 
		},
		filtered() {
			return this.$store.state.cheque.filtered
		},
		to_show() {
			if (this.filtered.length) {
				return this.filtered
			}
			return this.cheques
		}
	}
}
</script>
<style lang="sass">
.cheques
	display: flex 
	flex-direction: row 
	justify-content: flex-start
	align-items: center

.cheque 
	margin: 10px
	width: 250px
	border-radius: 8px
	border: 2px solid rgba(0, 0, 0, .3)
	background: #FFF

	.numero 
		font-weight: bold 
		font-size: 17px
		text-align: right
		background: rgba(0, 0, 0, .1)
		padding: 5px 10px

	.banco 
		font-size: 24px

	.cobro 
		font-size: cobro

</style>