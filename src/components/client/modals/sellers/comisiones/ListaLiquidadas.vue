<template>
	<div class="comision-lista">

		<div
		v-if="!liquidadas.length"
		class="comision-lista__vacio">
			Todavía no hay comisiones para este vendedor
		</div>

		<item
		v-for="liquidada in liquidadas"
		:key="'liquidada-'+liquidada.id"
		:item="liquidada"
		:es_pendiente="false"></item>

	</div>
</template>
<script>
import Item from '@/components/client/modals/sellers/comisiones/Item'
export default {
	components: {
		Item,
	},
	computed: {
		liquidadas() {
			return this.$store.state.seller_commission.liquidadas
		},
	},
}
</script>
<style scoped lang="sass">
.comision-lista
	&__vacio
		text-align: center
		color: #94a3b8
		padding: 32px 0
		font-size: 0.9rem
</style>
