<template>
<b-modal
id="afip-details"
title="Detalles de la boleta"
hide-footer>
	<b-list-group
	v-if="!loading">
		<b-list-group-item>
			Importe gravado 
			<span 
			class="float-right">
				{{ price(importes.gravado) }}
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe iva
			<span 
			class="float-right">
				{{ price(importes.iva) }}
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe total
			<span 
			class="float-right">
				{{ price(importes.total) }}
			</span>
		</b-list-group-item>
	</b-list-group>
	<b-list-group
	v-else>
		<b-list-group-item>
			Importe gravado 
			<span 
			class="float-right">
				<b-skeleton width="100px"></b-skeleton>
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe iva
			<span 
			class="float-right">
				<b-skeleton width="100px"></b-skeleton>
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe total
			<span 
			class="float-right">
				<b-skeleton width="100px"></b-skeleton>
			</span>
		</b-list-group-item>
	</b-list-group>
	<b-button
	class="m-t-15"
	@click="boleta"
	variant="primary"
	block>
		<btn-loader
		:loader="loading_boleta"
		text="Generar boleta"></btn-loader>
	</b-button>
</b-modal>
</template>
<script>
import afip from '@/mixins/afip'
import BtnLoader from '@/components/common/BtnLoader'
export default {
	mixins: [afip],
	components: {
		BtnLoader,
	},
	data() {
		return {
			loading_boleta: false,
		}
	},
	computed: {
		sale() {
			return this.$store.state.sale.afip.sale
		},
		importes() {
			return this.$store.state.sale.afip.importes
		},
		loading() {
			return this.$store.state.sale.afip.loading
		},
	},
	methods: {
		boleta() {
			this.loading_boleta = true
			this.$api.post('afip/'+this.sale.id)
			.then(res => {
				this.loading_boleta = false
				this.printAfipTicket(this.sale)
				this.$store.dispatch('sales/getSales')
			})
			.catch(err => {
				this.loading_boleta = false
				console.log(err)
			})
		}
	}
}
</script>