export default {
    methods: {
        createClient() {
            this.$store.commit('clients/setModel', null)
            this.$bvModal.show('client')
        },
        editClient(client) {
            this.$store.commit('clients/setModel', client)
            this.$bvModal.show('client')
        },
        updateClient(client) {
            this.$api.get('client/'+client.id)
            .then(res => {
                this.$store.commit('client/add', res.data.model)
            })
            .catch(err => {
                console.log(err)
            })
        },
        showCurrentAcounts(sale, is_client = false) {
            if (sale.client || is_client) {
                this.$store.commit('current_acount/setFromModelName', 'client')
                if (is_client) {
                    this.$store.commit('current_acount/setFromModel', sale)
                } else if (sale.client) {
                    this.$store.commit('current_acount/setFromModel', sale.client)
                } else if (sale.buyer && sale.buyer.comercio_city_client) {
                    this.$store.commit('current_acount/setFromModel', sale.buyer.comercio_city_client)
                }
                this.$store.dispatch('current_acount/getModels')
                this.$store.commit('current_acount/setSelected', [])
                this.$bvModal.show('current-acounts')
            } 
        },
    }
}