<template>
<b-modal v-if="client" id="current-acounts-nota-credito" title="Nota Credito" hide-footer>
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
    <b-form-group>
    	<b-button
        block
    	variant="primary"
    	@click="notaCredito">
    		<btn-loader
    		:loader="loading"
    		text="Registrar nota de credito"></btn-loader>
    	</b-button>
    </b-form-group>
</b-modal>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'

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
        	return `Ingrese el monto de la nota de credito para ${this.client.name}`
        },
    },
    methods: {
    	notaCredito() {
    		this.loading = true
    		this.$api.post('/clients/nota-credito', {
    			client_id:   this.client.id,
    			form:        this.form,
    		})
    		.then(res => {
                this.$store.dispatch('current_acount/getModels')
    			this.loading = false
    			this.$toast.success('Nota de credito registrada correctamente')
                this.$bvModal.hide('current-acounts-nota-credito')
                this.clear()
                this.updateClient(this.client)
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
