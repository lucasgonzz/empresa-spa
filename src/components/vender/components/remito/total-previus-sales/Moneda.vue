<template>
	<div
	class="form-moneda"
	v-if="show">
		<b-input-group prepend="Moneda">
			<b-form-select
			class="select-moneda"
			:disabled="disabled"
			v-model="moneda_id"
			@change="set_total"
			:options="getOptions({key: 'moneda_id', text: 'Moneda'}, null, null, false)"></b-form-select>
		</b-input-group>

		<b-input-group
		v-if="!hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')"
		class="m-t-10"
		prepend="USD">
			<b-form-input
			type="number"
			:disabled="disabled"
			class="input-dolar"
			@keyup="set_valor_dolar"
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
			return this.user && this.hasExtencion('ventas_en_dolares')
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
				this.editando_venta_previa
				|| this.budget
			) {
				return true
			}
			return false
		},
		editando_venta_previa() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa']
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
	watch: {
		/*
			El input es una copia local del valor del store y solo se sincronizaba al montarse
			(iniciar_dolar). Desde que limpiar_vender restaura la cotizacion del dueño al terminar
			cada comprobante, el store cambia sin que este componente se vuelva a montar, y el
			input seguia mostrando la cotizacion de la venta anterior (o la de la venta editada)
			mientras el store --que es lo que viaja en el POST-- ya tenia la del dueño.

			Se compara por valor numerico y no por igualdad a secas para no pisar lo que el
			vendedor esta tipeando: cada keyup manda Number(input) al store, y si el store
			devolviera "1250" sobre un "1250." a medio escribir, le comeria el punto.
		*/
		valor_dolar(valor) {
			if (valor === null || typeof valor === 'undefined') {
				this.iniciar_dolar()
				return
			}

			if (Number(this.input_dolar_valor) !== Number(valor)) {
				this.input_dolar_valor = valor
			}
		},
	},
	methods: {
		iniciar_dolar() {

			console.log('iniciar_dolar')

			if (this.user) {

				if (!this.owner.dollar) {
					console.log('El dueño no tiene dolar configurado')
					return
				}


				console.log(this.valor_dolar)
				console.log(this.input_dolar_valor)

				if (
					this.valor_dolar !== null
					&& typeof this.valor_dolar !== 'undefined'
				) {

					this.input_dolar_valor = this.valor_dolar
				} else {

					this.input_dolar_valor = this.user_dolar
				}


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
				    this.set_valor_dolar()
				}
			} else {
				console.log('No habia user, volviendo a llamar, user:')
				console.log(this.user)
				setTimeout(() => {
					this.iniciar_dolar()
				}, 500)
			}
			
		},
		set_total() {
			this.setTotal()
		},
		set_valor_dolar() {
			this.valor_dolar = Number(this.input_dolar_valor)

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

.form-moneda
	
	.input-group
		
		.input-group-prepend
			height: 36.6px !important
</style>