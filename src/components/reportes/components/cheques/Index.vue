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
		Buscador: () => import('@/components/reportes/components/cheques/Buscador'),
		ListaCheques: () => import('@/components/reportes/components/cheques/ListaCheques'),
	},
}
</script>