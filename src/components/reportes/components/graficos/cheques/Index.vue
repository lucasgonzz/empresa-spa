<template>
	<div
	v-if="view == 'cheques'">

		<buscador></buscador>

		<lista-cheques></lista-cheques>	

	</div>
</template>
<script>
export default {
	components: {
		Buscador: () => import('@/components/reportes/components/graficos/cheques/Buscador'),
		ListaCheques: () => import('@/components/reportes/components/graficos/cheques/ListaCheques'),
	},
}
</script>