<template>
	<b-button
	:disabled="budget.budget_status_id == 2"
	variant="primary"
	id="btn_actualizar_en_vender"
	@click="update">
		Actualizar en VENDER
	</b-button>
</template>
<script>
import previus_sale from '@/mixins/vender/previus_sale/index'
export default {
	mixins: [previus_sale],
	computed: {
		budget() {
			return this.$store.state.budget.model 
		},
	},
	methods: {
		update() {
			console.log('this.budget')
			console.log(this.budget)
            this.$store.commit('vender/setBudget', this.budget)
			this.set_datos_para_actualizar_en_vender(this.budget)
            this.$store.commit('vender/setToCheck', 0)
            this.$store.commit('vender/setChecked', 0)
            this.$store.commit('vender/setConfirmed', 0)
            this.$store.commit('vender/setGuardarComoPresupuesto', 1)
            this.$router.push({name: 'vender', params: {view: 'remito'}})
		}
	}
}
</script>