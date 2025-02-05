<template>
	<b-col
	v-if="hasExtencion('check_sales') 
	&& !guardar_como_presupuesto
	&& !ya_esta_terminada"
	cols="12"
	class="col-total check-sale">
		<!-- <p
		class="w-100 text-center">
			Estado actual: {{ status }}
		</p> -->
		<div class="cont-checkbox">
			<b-form-checkbox
			:disabled="disabled_to_check"
			@change="setValue('to_check')"
			:value="1"
			size="lg"
			:unchecked-value="0"
			v-model="to_check">
				Para chequear
			</b-form-checkbox>

			<b-form-checkbox
			:disabled="disabled_checked"
			@change="setValue('checked')"
			size="lg"
			:value="1"
			:unchecked-value="0"
			v-model="checked">
				Chequeada
			</b-form-checkbox>

			<b-form-checkbox
			:disabled="disabled_confirmed"
			@change="setValue('confirmed')"
			size="lg"
			:value="1"
			:unchecked-value="0"
			v-model="confirmed">
				Cofirmada
			</b-form-checkbox>
		</div>
	</b-col>
</template>
<script>
import previus_sales from '@/mixins/vender/previus_sale/index'
export default {
	mixins: [previus_sales],
	computed: {
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		ya_esta_terminada() {
			if (this.previus_sale && this.previus_sale.id) {

				if (this.previus_sale.terminada) {
					return true
				}
			}
			return false 
		},
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		disabled_to_check() {
			if (this.confirmed || (this.to_check && typeof this.previus_sale.id != 'undefined')) {
				return true 
			}
			return false
		},
		disabled_checked() {
			if (this.confirmed || (typeof this.previus_sale.id == 'undefined' || this.checked)) {
				return true 
			}
			return false
		},
		disabled_confirmed() {
			if (this.checked == 0 || (this.previus_sale && this.previus_sale.to_check)) {
				return true 
			}
			return false
		},
		status() {
			if (this.to_check) {
				return 'Para checkear'
			}
			if (this.checked) {
				return 'Checkeada'
			}
			if (this.confirmed) {
				return 'Confirmada'
			}
		},
		to_check: {
			get() {
				return this.$store.state.vender.to_check
			},
			set(value) {
				this.$store.commit('vender/setToCheck', value)
			}
		},
		checked: {
			get() {
				return this.$store.state.vender.checked
			},
			set(value) {
				this.$store.commit('vender/setChecked', value)
			}
		},
		confirmed: {
			get() {
				return this.$store.state.vender.confirmed
			},
			set(value) {
				this.$store.commit('vender/setConfirmed', value)
			}
		},
	},
	methods: {
		setValue(value) {
			if (value == 'to_check') {
				this.checked = 0
				this.confirmed = 0
			}
			if (value == 'checked') {
				this.to_check = 0
				this.confirmed = 0
			}
			if (value == 'confirmed') {
				this.to_check = 0
				this.checked = 0
			}
		}
	}
}
</script>
<style lang="sass">
.check-sale
	margin: 25px 0
	.cont-checkbox
		background: #FFF
		border: 2px solid #DDDDDD
		padding: 25px
		border-radius: 10px
		width: 100%
		display: flex 
		flex-direction: row !important
		justify-content: center 
		align-items: center 
	.custom-control
		margin-right: 35px
</style>