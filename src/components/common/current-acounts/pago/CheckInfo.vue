<template>
	<div 
	v-if="payment_method.current_acount_payment_method_id == 1"
	class="check card-moderna p-15 m-t-15">
		<b-form-row>
			<b-col
			cols="12">
				<b-input-group
				prepend="Banco">
					<b-form-input
					:disabled="disabled_inputs"
					v-model="payment_method.bank"
					placeholder="Banco"></b-form-input>
				</b-input-group>
			</b-col>
		</b-form-row>
		<b-form-row>
			<b-col
			cols="12">
		        <b-form-datepicker
		        :disabled="disabled_inputs"
		        placeholder="Fecha de pago"
		        v-model="payment_method.payment_date">
		        </b-form-datepicker>
			</b-col>
		</b-form-row>
		<b-form-row>
			<b-col
			cols="12">
				<b-input-group
				prepend="N°">
			        <b-form-input
			        :disabled="disabled_inputs"
			        placeholder="Numero de cheque"
			        v-model="payment_method.num">
			        </b-form-input>
				</b-input-group>
			</b-col>
		</b-form-row>
	</div>
</template>
<script>
export default {
	props: {
		payment_method: {
			type: Object,
		},
		disabled_inputs: {
			type: Boolean,
			default: false,
		},
	}
}
</script>
<style lang="sass">
.check 
	padding: 15px !important
</style>