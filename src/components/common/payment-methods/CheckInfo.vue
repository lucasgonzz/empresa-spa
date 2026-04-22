<template>
	<div 
	v-if="is_cheque"
	class="check card-moderna p-15 m-t-15 s-2 b-r-1">

		<b-form-row
		v-for="prop in props">
			<b-col
			cols="12">
				<b-input-group
				:prepend="prop.type != 'checkbox' ? prop.text : ''">
					<b-form-checkbox
						:value="1"
						:unchecked-value="0"
                        @change="emit_change(prop.key, $event ? 1 : 0)"
						v-if="prop.type == 'checkbox'"
					>
						{{ prop.text }}
					</b-form-checkbox>

			        <b-form-input
				        v-else
				        :disabled="disabled_inputs"
				        :placeholder="prop.text"
				        :type="prop.type"
                        :value="payment_method[prop.key]"
                        @input="emit_change(prop.key, $event)"
				    >
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
	},
	computed: {
		is_cheque(){
			let payment_method_model = this.$store.state.current_acount_payment_method.models.find(p => p.id == this.payment_method.current_acount_payment_method_id)

			console.log('is cheque')
			console.log(payment_method_model)

			if (typeof payment_method_model != 'undefined') {
				if (payment_method_model.type && payment_method_model.type.slug == 'cheque') {
					return true
				}
			}
			return false
		},
		props() {
			return [
				{
					text: 'Numero de cheque',
					key: 'numero',
					type: 'text',
				},
				{
					text: 'Banco',
					key: 'banco',
					type: 'text',
				},
				{
					text: 'Fecha de emision',
					key: 'fecha_emision',
					type: 'date',
				},
				{
					text: 'Fecha de pago',
					key: 'fecha_pago',
					type: 'date',
				},
				{
					text: 'Es un echeq',
					key: 'es_echeq',
					type: 'checkbox',
				},
				{
					text: 'Notas',
					key: 'notes',
					type: 'text',
				},
			]
		}
	},
    methods: {
        emit_change(key, value) {
            this.$emit('field_change', { key: key, value: value })
        }
    }
}
</script>
<style lang="sass">
.check 
	[class^='col-']
		margin-bottom: 10px !important

</style>