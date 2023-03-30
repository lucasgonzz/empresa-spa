<template>
	<b-form-row>
		<b-col
		cols="10">
			<p>
				<i class="icon-sign-out"></i>
				Enter para cambiar los campos
			</p>
		</b-col>
		<b-col
		class="j-end"
		cols="2">
			<agregar></agregar>
		</b-col>
	</b-form-row>
</template>
<script>
import Agregar from '@/components/ingresar/components/Agregar.vue'
export default {
	name: 'TitleAgregar',
	components: {
		Agregar
	}
}
</script>
<style scoped lang="sass">
p 
	font-weight: bold
	margin-bottom: 0
	height: 100%
	display: flex
	align-items: center
</style>