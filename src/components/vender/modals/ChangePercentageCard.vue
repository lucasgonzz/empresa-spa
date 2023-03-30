<template>
<b-modal id="change-percentage-card" title="Cambiar porcentaje de tarjeta" hide-footer>
    <div>
        <b-form-group
        label="Nuevo porcentaje de recargo para tarjeta"
        :description="`Porcentaje actual: ${percentage_card}%`"
        label-for="new-percentage-card">
            <b-form-input
            type="number"
            min="0"
            max="100"
            id="new-percentage-card"
            v-model="new_percentage_card"
            @keyup.enter="updatePercentageCard"
            placeholder="Ingrese el nuevo porcentaje de tarjeta"></b-form-input>
        </b-form-group>
        <b-form-group>
            <b-button
            block
            variant="primary"
            @click="updatePercentageCard">
                <btn-loader
                :loader="loading"
                text="Actualizar"></btn-loader>
            </b-button>
        </b-form-group>
    </div>
</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
    name: 'ChangePercentageCard',
    // props: ['percentage_card', 'loading'],
    components: {
        BtnLoader
    },
    computed: {
        percentage_card : {
            set(percentage_card) {
                if (this.user) {
                    this.user.percentage_card = percentage_card
                }
            },
            get() {
                if (this.user) {
                    return this.user.percentage_card
                }
                return null
            }
        },
        user() {
            return this.$store.state.auth.user
        },
    },
    data() {
        return {
            new_percentage_card: '',
            loading: false,
        }
    },
    methods: {
        updatePercentageCard() {
            this.loading = true
            this.$api.put('/users/set-percentage-card', {
                percentage_card: this.new_percentage_card
            })
            .then(() => {
                this.loading = false
                this.percentage_card = this.new_percentage_card
                this.$bvModal.hide('change-percentage-card')
                this.$toast.success('Porcentaje para tarjeta actualizado correctamente')
            })
            .catch(err => {
                this.$toast.error('Error al actualizar, intentelo mas tarde por favor')
                this.loading = false
                console.log(err)
            })
        },
    },
}
</script>