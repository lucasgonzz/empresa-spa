<template>
	<b-form-input
	:min="0"
	@keyup="check_amount"
	v-model="production_movement.amount"
	type="number"></b-form-input>
</template>
<script>
export default {
	computed: {
		production_movement() {
			return this.$store.state.production_movement.model 
		},
		estado_desde() {
			return this.$store.state.production_movement.order_production_status_desde
		}
	},
	methods: {
		/*
			chequear que las cantidades no sean mayores que las que hay en el "estado_desde"
			estado_desde es el estado desde el cual se van obtener para mover las cantidades a producir
		*/
        check_amount() {

            let cantidad_a_guardar = Number(this.production_movement.amount)
            let cantidad_actual_en_estado_anterior = Number(this.estado_desde.current_amount)

            if (cantidad_a_guardar > cantidad_actual_en_estado_anterior) {
                this.$toast.error('No puede pasar mas de '+cantidad_actual_en_estado_anterior+' unidades, que son las que hay en el estado '+this.estado_desde.order_production_status.name, {
                	duration: 10000
                })
                this.production_movement.amount = cantidad_actual_en_estado_anterior
            }
        },
	}
}
</script>