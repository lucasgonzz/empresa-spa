<template>
<b-modal id="from-date" title="Mostrar ventas por fecha" hide-footer>
    <b-form-group
    label="Fecha">
        <b-form-datepicker
        placeholder="Seleccione una fecha"
        v-model="from_date"></b-form-datepicker>
    </b-form-group>
    <b-form-group
    label="Hasta la fecha">
        <b-form-datepicker
        placeholder="Seleccione fecha limite inclusive"
        v-model="until_date"></b-form-datepicker>
    </b-form-group>
    <b-form-group class="m-b-0">
        <b-button
        block
        variant="primary"
        @click="search">
            Buscar
        </b-button>
    </b-form-group>
</b-modal>
</template>
<script>
export default {
    name: 'FromDate',
    computed: {
        from_date: {
            get() {
                return this.$store.state.sale.from_date
            },
            set(value) {
                this.$store.commit('sale/setFromDate', value)
            }
        },
        until_date: {
            get() {
                return this.$store.state.sale.until_date
            },
            set(value) {
                this.$store.commit('sale/setUntilDate', value)
            }
        },
    },
	methods: {
		search() {
            if (this.until_date == '') {
                this.$store.commit('sale/previus_days/setSelectedDay', this.date_)
            } else {
                this.$store.commit('sale/previus_days/setSelectedDay', '')
            }
            this.$store.dispatch('sale/getModels')
            this.$bvModal.hide('from-date')
		},
	}
}
</script>