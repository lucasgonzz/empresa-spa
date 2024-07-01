<template>
<b-modal
hide-footer
size="lg"
title="Informes de pagos"
id="pagado-por">
	<h4
	class="m-b-15">
		{{ title }}
	</h4>
	<div
	v-if="!loading">
		<b-table
		v-if="models.length"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		head-variant="dark"
		hover 
		responsive
		:fields="fields"
		:items="items"></b-table>
		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay registros
		</p>
	</div>
	<b-skeleton-table
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	v-else
	:rows="5" 
	:columns="4"
	:table-props="{ bordered: true, striped: true }"></b-skeleton-table>
</b-modal>
</template>
<script>
export default {
	computed: {
		title() {
			if (this.debe_id == 0) {
				return 'Este pago aporto a las siguientes deudas'
			}
			return 'Esta venta fue pagada por'
		},
		debe_id() {
			return this.$store.state.pagado_por.debe_id
		},
		loading() {
			return this.$store.state.pagado_por.loading
		},
		models() {
			return this.$store.state.pagado_por.models
		},
		fields() {
			let fields = []
			if (this.debe_id == 0) {
				fields.push({	
					key: 'debe',
					label: 'Venta',
				})
			} else {
				fields.push({	
					key: 'haber',
					label: 'Pago',
				})

			}
			fields = fields.concat([
				{	
					key: 'total_pago',
					label: 'Total del Pago',
				},
				{	
					key: 'fondos_iniciales',
					label: 'Fondos iniciales',
				},
				{	
					key: 'a_cubrir',
					label: 'Remanente a cubrir',
				},
				{	
					key: 'pagado',
					label: 'Aporte del Pago',
				},
				{	
					key: 'nuevos_fondos',
					label: 'Fondos resultantes',
				},
				{	
					key: 'remantente',
					label: 'Nuevo remanente',
				},
				{	
					key: 'created_at',
					label: 'Fecha',
				},
			])
			return fields
		},
		items() {
			let items = []
			this.models.forEach(model => {
				items.push({
					debe: model.debe.detalle,
					haber: model.haber.detalle,
					a_cubrir: this.price(model.a_cubrir),
					fondos_iniciales: this.price(model.fondos_iniciales),
					nuevos_fondos: this.price(model.nuevos_fondos),
					pagado: this.price(model.pagado),
					total_pago: this.price(model.total_pago),
					remantente: this.price(model.remantente),
					created_at: this.getCreatedAt(model),
				})
			})
			return items 
		},
	},
	methods: {
		getCreatedAt(model) {
			if (this.debe_id) {
				return this.date(model.haber.created_at)
			}
			return this.date(model.debe.created_at)
		}
	}
}
</script>