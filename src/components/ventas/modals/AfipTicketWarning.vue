<template>
<div>
	<model
	:modal_title="'Nuevo '+model_name_spanish"
	:model="model"
	:model_name="model_name"
	:text_delete="text_delete"
	:properties="properties"></model>

	<b-modal
	v-if="sale"
	title="Factura electronica"
	id="afip-ticket-warning"
	hide-footer>
		<p
		class="text-danger text-center">
			<strong>
				Corriga los siguientes errores para poder emitir la factura
			</strong>
		</p>
		<p
		v-if="!sale.client">
			<i class="icon-right"></i>
			La venta no tiene un <strong>cliente</strong> asignado 
		</p>
		<p
		v-if="sale.client && !sale.client.iva_condition_id">
			<i class="icon-right"></i>
			El cliente no tiene una <strong>condicion frente al iva</strong> asignada 
		</p>
		<p
		v-if="sale.client && !sale.client.cuit">
			<i class="icon-right"></i>
			El cliente no tiene un <strong>CUIT</strong> asignado 
		</p>
		<b-button
		v-if="sale.client"
		class="m-t-15"
		@click="setModel(sale.client, 'client')"
		block
		variant="outline-primary">
			Editar cliente
		</b-button>
	</b-modal>
</div>
</template>
<script>
import Model from '@/components/common/model/Index'

import clients from '@/mixins/clients'
import afip_ticket from '@/mixins/afip_ticket'
import display from '@/mixins/display'
export default {
	mixins: [clients, afip_ticket, display],
	components: {
		Model,
	},
	computed: {
		model_name() {
			return 'client'
		},
		model_name_spanish() {
			return 'cliente'
		},
		create_model_name_spanish() {
			return 'Nuevo cliente'
		},
		model() {
			return this.$store.state[this.model_name].model
		},
		delete() {
			return this.$store.state[this.model_name].delete
		},
		text_delete() {
			if (this.delete) {
				return 'el cliente '+this.delete.name
			}
			return ''
		},
		properties() {
			return require(`@/models/${this.model_name}`).default.properties 
		}
	}
}
</script>