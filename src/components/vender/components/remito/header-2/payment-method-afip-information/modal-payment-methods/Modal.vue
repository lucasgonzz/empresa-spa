	<template>
		<b-modal id="payment-method-modal" title="Métodos de pago" hide-footer>
		<!-- Total a repartir -->
		<label class="total-a-repartir">Total a repartir: ${{ total_a_repartir }}</label>
		<!-- Lista de métodos de pago -->
		<b-form-group
			v-for="(payment_method, index) in payment_methods"
			:key="payment_method.id"
			:label="payment_method.name">
			<div class="d-flex">
			<b-form-input
				type="number"
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
		</b-modal>
	</template>
	
	<script>
	export default {
		data() {
		return {
			total_a_repartir: 0,
			metodos_de_pago_seleccionados: [],
		};
		},
		computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models;
		},
		total_vender() {
			return this.$store.state.vender.total;
		},
		total_inputs() {
			let total = 0;
			for (const key in this.metodos_de_pago_seleccionados) {
				
				const value = this.metodos_de_pago_seleccionados[key] >= this.total_a_repartir ? this.total_a_repartir : this.metodos_de_pago_seleccionados[key];
				
				total += isNaN(parseFloat(value)) ? 0 : parseFloat(value);
			}
			return total;
			},


		},
		watch: {
		metodos_de_pago_seleccionados: {
			deep: true,
			handler() {
				console.log(this.metodos_de_pago_seleccionados);
				console.log('el total es ' + this.total_inputs);
				this.total_a_repartir = this.total_vender - this.total_inputs;
			},
		},
		},
		mounted() {
		this.total_a_repartir = this.total_vender;
		},
		methods: {
		
		agregarTotal(payment_method_id) {
			if (this.total_a_repartir !== 0) {
			this.$set(this.metodos_de_pago_seleccionados, payment_method_id, this.total_a_repartir);
			this.total_a_repartir = 0;
			}
		},
		guardarMetodosPago() {
			const resultado = [];
			for (const [key, value] of Object.entries(this.metodos_de_pago_seleccionados)) {
			if (value !== 0 && value !=='') {
				resultado.push({ id: key, monto: value });
			}
			}
			console.log(resultado);
		},
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
	