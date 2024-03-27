<template>
	<div>
		<span
		v-if="model.budget">
			Pre N° {{ model.budget.num }}
		</span>
		<span
		v-else-if="model.order_production">
			O Produ N° {{ model.order_production.num }}
		</span>
		<span
		v-else-if="model.order">
			Pedido N° {{ model.order.num }}
		</span>
		<span
		v-else-if="model.afip_ticket">
			<span
			v-if="model.afip_ticket.cae">
				Factura N° {{ model.afip_ticket.cbte_numero }}
			</span>
			<span
			class="text-danger"
			v-else>
				Factura N° {{ model.afip_ticket.cbte_numero }}
			</span>
		</span>
		<strong
		@click.stop="showErrors"
		class="text-danger c-p"
		v-if="model.afip_errors.length">
			{{ model.afip_errors.length }} errores
		</strong>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		showErrors() {
			this.setModel(this.model, 'sale', [], false, false)
			this.$bvModal.show('afip-ticket-errors')
		}
	}
}
</script>