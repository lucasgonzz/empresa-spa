<template>

	<div
	v-if="view == 'mercado-libre'">
		<h4>
	    	Atributos
		</h4>

		<div class="cont-attributes">
			
			<attribute
			v-for="attribute in meli_category.meli_attributes"
			:attribute="attribute"></attribute>	
		</div>
	</div>

</template>
<script>
export default {
	components: {
        Attribute: () => import('@/components/listado/modals/mercado-libre/Attribute'),
	},
	computed: {
		meli_category() {
			return this.$store.state.meli.meli_category
		}
	},
}
</script>