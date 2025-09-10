<template>
<b-modal 
v-if="from_model" 
id="current-acounts-nota-credito" 
title="Nota Credito" 
hide-footer>
    <b-form-group>
        <b-form-input
        type="number"
        min="0"
        @keydown.enter="notaCredito"
        :placeholder="placeholder"
        v-model="form.nota_credito"></b-form-input>
    </b-form-group>
    <b-form-group>
        <b-form-textarea
        type="text"
        @keydown.enter="notaCredito"
        placeholder="Ingrese una descripcion"
        v-model="form.description"></b-form-textarea>
    </b-form-group>
	<btn-loader
    @clicked="notaCredito"
	:loader="loading"
	text="Registrar nota de credito"></btn-loader>
</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

import clients from '@/mixins/clients'
import current_acounts from '@/mixins/current_acounts'
export default {
	name: 'CurrentAcountNotaCredito',
    mixins: [clients, current_acounts],
    components: {
        BtnLoader
    },
    data() {
        return {
            form: {
        	   nota_credito: '',
               description: '',
            },
        	loading: false,
        }
    },
    computed: {
        placeholder() {
        	return `Ingrese el monto de la nota de credito para ${this.from_model.name}`
        },
    },
    methods: {
    	notaCredito() {
    		this.loading = true
    		this.$api.post('/current-acount/nota-credito', {
                credit_account_id   : this.from_credit_account.id,
                model_id            : this.from_model.id,
    			model_name          : this.from_model_name,
    			form                : this.form,
    		})
    		.then(res => {
                this.$store.dispatch('current_acount/getModels')
    			this.loading = false
    			this.$toast.success('Nota de credito registrada')
                this.$bvModal.hide('current-acounts-nota-credito')
                this.clear()
                // this.updateClient(this.client)
    		})
    		.catch(err => {
    			this.loading = false
    			console.log(err)
    			this.$toast.error('Error al registrar nota de credito')
    		})
    	},
        clear() {
            this.form.nota_credito = ''
            this.form.description = ''
        }
    }
}
</script>
<style lang="sass">
</style>
