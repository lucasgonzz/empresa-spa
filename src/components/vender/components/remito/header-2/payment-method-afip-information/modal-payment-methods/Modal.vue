<template>
	<b-modal id="payment-method-modal" title="Métodos de pago" hide-footer>
		
		<!-- Total a repartir -->
		<p class="total-a-repartir">
			Total a repartir: {{ price(total_a_repartir) }}
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? 'text-success' : ''"
		class="total-a-repartir">
			Total repartido: {{ price(total_repartido) }}
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? '' : 'text-danger'"
		class="total-a-repartir">
			Sobrante para repartir: {{price(sobrante_a_repartir)}}
		</p>

		<hr>
		
		<!-- Lista de métodos de pago -->
		<b-form-group
		v-for="(payment_method, index) in payment_methods"
		:key="payment_method.id"
		:label="payment_method.name+' ('+ price(metodos_de_pago_seleccionados[payment_method.id]) +')'">
			<div class="d-flex">
				<b-form-input
					type="number"
					@keyup="set_total_repartido(payment_method.id)"
					@change="set_total_repartido(payment_method.id)"
					:min="0"
					v-model.number="metodos_de_pago_seleccionados[payment_method.id]"
					placeholder="Ingrese el monto">
				</b-form-input>
				<b-button	
					variant="outline-primary"
					class="ml-2 p-2 btn-total"
					size="sm"
					@click="agregarTotal(payment_method.id)"
					:disabled="total_a_repartir === 0">
					Agregar total
				</b-button>
			</div>
			<hr>
		</b-form-group>

		<!-- Botón para guardar -->
		<b-button
			@click="guardarMetodosPago"
			block
			variant="primary">
			Guardar
		</b-button>
		<b-button
			@click="cancelar"
			block
			variant="danger">
			Cancelar
		</b-button>

	</b-modal>
</template>
<script>
import vender_current_acount_payment_methods from '@/mixins/vender_current_acount_payment_methods'
export default {
	mixins: [vender_current_acount_payment_methods],
	data() {
		return {
			// total_a_repartir: 0,
			// total_repartido: 0,
			// metodos_de_pago_seleccionados: [],
		};
	},
	computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models;
		},
		total_vender() {
			return this.$store.state.vender.total;
		},
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},
	},
	watch: {
        total_vender() {
        	this.total_a_repartir = this.total_vender
        	
        	if (this.index_previus_sale == 0) {
        		this.metodos_de_pago_seleccionados = []
        		this.total_repartido = 0
        	} else {
        		this.set_total_desde_previus_sale()
        	}
        },
    },
	methods: {
		set_total_repartido(payment_method_id) {


			/* 
				Si es undefined, es porque se llamo desde la liea 104
				Entonces sigue de largo y setea	total_repartido con get_suma_de_metodos_de_pagos
			*/
			if (typeof payment_method_id != 'undefined') {

				let nuevo_total_repartido = this.get_suma_de_metodos_de_pagos()

				if (nuevo_total_repartido > this.total_a_repartir) {

					this.$set(this.metodos_de_pago_seleccionados, payment_method_id, '')

					this.$toast.error('Con este monto estas superando el TOTAL A REPARTIR')

					this.set_total_repartido()

					return false
				}

			}

			this.total_repartido = this.get_suma_de_metodos_de_pagos()

		},

		get_suma_de_metodos_de_pagos() {
			let total_repartido = 0

			this.metodos_de_pago_seleccionados.forEach(monto_metodos_de_pago_seleccionado => {
				total_repartido += Number(monto_metodos_de_pago_seleccionado)
			})

			return total_repartido
		},

		
		agregarTotal(payment_method_id) {
			if (this.total_repartido < this.total_a_repartir) {

				let monto_previo = this.metodos_de_pago_seleccionados[payment_method_id]

				if (typeof monto_previo == 'undefined') {
					monto_previo = 0
				} else {
					monto_previo = Number(monto_previo)
				}

				this.metodos_de_pago_seleccionados[payment_method_id] = this.total_a_repartir - (this.total_repartido - monto_previo)

				this.set_total_repartido();
			}
		},

		cancelar() {
			this.$store.commit('vender/setCurrentAcountPaymentMethodId', 3)
			this.$bvModal.hide('payment-method-modal')
		}

	},
};
</script>
	
<style>
.total-a-repartir {
	font-size: 20px;
}
.btn-total {
	white-space: nowrap;
}
</style>
	