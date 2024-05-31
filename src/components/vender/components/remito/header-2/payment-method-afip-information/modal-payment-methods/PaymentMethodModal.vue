<template>
    <b-modal id="payment-method-modal" title="Métodos de pago" @hidden="handleHidden" hide-footer>
      <div v-for="(paymentMethodId, index) in paymentMethodIds" :key="index" v-if="index !== 0" class="payment-group">
        <label>{{ getPaymentMethodName(paymentMethodId) }}</label>
        <b-form-input
          v-model="paymentAmounts[index]"
          type="number"
          placeholder="Cantidad a pagar"
          @input="calculateTotal"
        />
      </div>
      <b-button variant="primary" block @click="saveAndExit">Guardar y salir</b-button>
      <p class="total">Total: <strong style="font-size: 1.2rem; font-weight: bold;">${{ total.toFixed(2) }}</strong></p>
    </b-modal>
  </template>
  
  <script>
  import vender from '@/mixins/vender';
  
  export default {
    mixins: [vender],
    data() {
      return {
        paymentMethodIds: this.getOptions({ key: 'current_acount_payment_method_id', text: 'Metodo de pago' })
        .map(option => option.value),
        paymentAmounts: [],
        total: 0,
      };
    },
    methods: {
      getPaymentMethodName(paymentMethodId) {
        return this.getOptions({ key: 'current_acount_payment_method_id', text: 'Metodo de pago' })
        .find(option => option.value === paymentMethodId).text;
      },
      handleHidden() {
        this.paymentAmounts = [];
        this.total = 0;
      },
      calculateTotal() {
        this.total = this.paymentAmounts.reduce((acc, amount) => acc + (parseFloat(amount) || 0), 0);
      },
      saveAndExit() {
        this.$bvModal.hide('payment-method-modal');
      },
    },
  };
  </script>
  
  <style>
  .payment-group {
    margin: 20px;
    padding:0px;

  }
  
  .payment-group label {
    font-weight: bold;
  }
  
  .payment-group b-form-input {
    margin-bottom: 5px;
    padding: 5px;
  }
  </style>
  