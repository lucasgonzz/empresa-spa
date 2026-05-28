<template>
	<div
	class="j-start"
	v-if="sale.client">
		<b-button
		@click.stop="show_current_acount">
			{{ sale.client.name }}
		</b-button>

		<whatsapp-btn
		:sale="sale"></whatsapp-btn>
	</div>
</template>
<script>
export default {
	components: {
		WhatsappBtn: () => import('@/common-vue/sale-print-buttons/WhatsappBtn'),
	},
	props: {
		sale: Object,
		from_budget: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		show_current_acount() {
			this.showClientCurrentAcount(this.sale)
		},
	}
}
</script>