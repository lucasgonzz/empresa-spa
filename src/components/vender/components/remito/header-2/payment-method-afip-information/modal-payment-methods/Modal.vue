<template>
	<b-modal 
		id="payment-method-modal" 
		title="Métodos de pago" 
		hide-footer>
	
		<!-- Total a repartir -->
	<label class="total-a-repartir">Total a repartir: ${{ total_a_repartir }}</label>
		<!-- Lista de métodos de pago -->
	<b-form-group
		v-for="(payment_method, index) in payment_methods"
		:key="payment_method.id"
		:label="payment_method.name">
			<div class="d-flex">
				<b-form-input
					v-model="metodos_de_pago_seleccionados[payment_method.id]"
					@input="updateTotal(index)"
					placeholder="Ingrese el monto">
				</b-form-input>
				<b-button 
					variant="outline-primary" 
					class="ml-2 p-2 btn-total" 
					size="sm"
					@click="agregarTotal(index, payment_method.id)">
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
	
	</b-modal>
</template>
	
<script>
export default {
	mounted() {
		this.total_a_repartir = this.total_vender;
	},
	computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},
		total_vender() {
			return this.$store.state.vender.total;
		},
	},
	data() {
		return {
			total_a_repartir: 0,
			metodos_de_pago_seleccionados: [],
		}
	},
	methods: {
			updateTotal(index) {
				this.total_a_repartir -= this.metodos_de_pago_seleccionados[index].value;
			},
			
		guardarMetodosPago() {		
				console.log(this.metodos_de_pago_seleccionados)
			}
		}
	}
	
</script>
	
<style>
	.total-a-repartir{
		font-size: 20px;
	}
	.btn-total {
		white-space: nowrap;
	}
</style>  