<template>
	<div
	v-if="show">
		<b-form-select
		class="m-t-10 select-moneda"
		:disabled="disabled"
		v-model="moneda_id"
		@change="set_total"
		:options="getOptions({key: 'moneda_id', text: 'Moneda'}, null, null, false)"></b-form-select>

		<b-input-group
		v-if="!hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')"
		class="m-t-10"
		prepend="USD">
			<b-form-input
			type="number"
			class="input-dolar"
			@keyup.enter="set_venta_dolar"
			v-model="input_dolar_valor"></b-form-input>
		</b-input-group>

	</div>
</template>
<script>
import vender_set_total from '@/mixins/vender_set_total'
export default {
	mixins: [vender_set_total],
	computed: {
		show() {
			return this.user && this.hasExtencion('costo_en_dolares')
		},
		user_dolar() {
			return this.owner.dollar
		},
		valor_dolar: {
			get() {
				return this.$store.state.vender.valor_dolar
			},
			set(value) {
				this.$store.commit('vender/set_valor_dolar', value)
			}
		},
		moneda_id: {
			get() {
				return this.$store.state.vender.moneda_id
			},
			set(value) {
				this.$store.commit('vender/set_moneda_id', value)
			}
		},
		disabled() {
			if (
				this.index_previus_sales > 0
				|| this.budget
			) {
				return true
			}
			return false
		},
		index_previus_sales() {
			return this.$store.state.vender.previus_sales.index
		},
		budget() {
			return this.$store.state.vender.budget
		},
	},
	data() {
	    return {
	        input_dolar_valor: null  // Este será el input editable
	    }
	},
	created() {
		this.iniciar_dolar()
	},
	methods: {
		iniciar_dolar() {

			if (this.user) {

				console.log('iniciar_dolar')

				console.log(this.valor_dolar)
				console.log(this.input_dolar_valor)

				this.input_dolar_valor = this.user_dolar

				if (this.input_dolar_valor === null) {
					this.iniciar_dolar()
					return
				}

				console.log('-----------------------------------')
				console.log('input_dolar_valor:')
				console.log(this.input_dolar_valor)
				console.log('-----------------------------------')

				if (this.valor_dolar === null) {

					console.log('ENTRO a valor_dolar')
				    this.set_venta_dolar()
				}
			} else {
				setTimeout(() => {
					this.iniciar_dolar()
				}, 500)
			}
			
		},
		set_total() {
			this.setTotal()
		},
		set_venta_dolar() {
			this.valor_dolar = this.input_dolar_valor

			if (!this.valor_dolar) {
				this.iniciar_dolar()
			}
			this.setTotal()
		}
	}
}
</script>
<style lang="sass">
.select-moneda, .input-dolar
	font-size: 15px !important
</style>