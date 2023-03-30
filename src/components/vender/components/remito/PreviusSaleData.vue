<template>
	<b-row
	class="m-b-15 m-t-15"
	v-if="index > 0">
		<b-col
		cols="12"
		class="j-end">
			<div class="btn-group">
				<button 
				v-if="previus_sale.client" 
				class="btn btn-dark">
					<i class="icon-user"></i>
					{{ previus_sale.client.name }}
				</button>
				<button 
				v-if="previus_sale.num" 
				class="btn btn-info">
					<i class="icon-clipboard"></i>
					Rto n° {{ previus_sale.num }}
				</button>
				<button 
				v-if="previus_sale.created_at" 
				class="btn btn-primary">
					{{ since(previus_sale.created_at) }}
				</button>
			</div>
		</b-col>
	</b-row>
</template>
<script>
export default {
	name: 'PreviusSaleData',
	computed: {
		index() {
			return this.$store.state.vender.previus_sales.index
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		total() {
			return this.$store.state.vender.total
		},
	}
}
</script>