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
		<b-button
		size="sm"
		@click.stop="showErrors"
		variant="danger"
		class="m-l-10"
		v-if="model.afip_errors.length">
			{{ model.afip_errors.length }} errores
		</b-button>
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