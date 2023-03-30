<template>
    <b-card header="Seleccionar un cliente existente" no-body>
        <div>
            <b-form-group>
                <autocomplete 
                :search="search" 
                auto-select
                :get-result-value="getResultValue"
                placeholder="Buscar un cliente..."
                @submit="setClient"></autocomplete>
            </b-form-group>
            <client-info
            v-if="client"
            :client="client"></client-info>
            <b-form-group
            v-show="client">
                <b-button 
                v-if="has_discounts_or_sale_types"
                block
                variant="primary"
                @click.prevent="toDiscounts">
                    Siguiente
                </b-button>
                <b-button
                v-else
                block
                variant="primary"
                class="w-49"
                @click="vender(false)">
                    <btn-loader
                    text="Vender"
                    :loader="vendiendo"></btn-loader>
                </b-button>
            </b-form-group>
            <b-form-group>
                <b-button 
                block
                variant="primary"
                @click="createClient">
                    <i class="icon-plus"></i>
                    Nuevo Cliente
                </b-button>
            </b-form-group>
        </div>
    </b-card>
</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import Autocomplete from '@trevoreyre/autocomplete-vue'
import '@trevoreyre/autocomplete-vue/dist/style.css'
import ClientInfo from '@/components/common/ClientInfo'

import clients from '@/mixins/clients'
import vender from '@/mixins/vender'
export default {
    mixins: [clients, vender],
    components: {
        BtnLoader,
        Autocomplete,
        ClientInfo,
    },
    data() {
        return {
            without_debt: true,
            debt: null,
        }
    },
    computed: {
        clients() {
            return this.$store.state.clients.models
        },
        total() {
            return this.$store.state.vender.total
        },
    },
    watch: {
        without_debt() {
            if (this.without_debt) {
                this.debt = null
            } else {
                this.debt = 0
            }
        }
    },
    methods: {
        toDiscounts() {
            if (this.discounts.length || this.sale_types.length) {
                this.$store.commit('vender/clients/incrementView')
            } else {
                this.vender(false)
            }
        },
        search(input) {
            if (input.length < 1) { return [] }
            return this.clients.filter(client => {
                return client.name.toLowerCase().includes(input.toLowerCase())
            })
        },
        getResultValue(client) {
            let res = client.name
            return res
        },
        setClient(client) {
            this.$store.commit('vender/setClient', client)
            this.$store.commit('clients/current_acounts/setClient', client)
        },
        // vender() {
        //     if (!this.is_provider) {
        //         this.$store.commit('vender/setDebt', this.debt)
        //         this.$store.dispatch('vender/vender', this.dolar_blue)
        //         this.$store.commit('vender/setClient', null)
        //         this.$bvModal.hide('clients')
        //         this.without_debt = true
        //     }
        // },
    }
}
</script>
<style>
.client-name {
    font-size: 1rem;
}
</style>  