<template>
<b-modal 
id="from-date" 
:title="title" 
hide-footer>
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
    props: {
        model_name: String,
    },
    computed: {
        title() {
            return 'Mostrar '+this.singular(this.model_name)+' por fecha'
        },
        from_date: {
            get() {
                return this.$store.state[this.model_name].from_date
            },
            set(value) {
                this.$store.commit(this.model_name+'/setFromDate', value)
            }
        },
        until_date: {
            get() {
                return this.$store.state[this.model_name].until_date
            },
            set(value) {
                this.$store.commit(this.model_name+'/setUntilDate', value)
            }
        },
    },
	methods: {
		search() {
            this.$store.dispatch(this.model_name+'/getModels')
            this.$bvModal.hide('from-date')
		},
	}
}
</script>