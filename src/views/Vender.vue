<template>
<div id="vender">
	<new-article></new-article>

	<articles-loading-advise></articles-loading-advise>

	<nav-component></nav-component>
 
	<client></client>	
	<remito></remito>	
	<btn-save></btn-save>	

</div> 
</template>
<script>
export default {
	components: {  
		NewArticle: () => import('@/components/vender/modals/NewArticle'),
		
		// Componentes
		ArticlesLoadingAdvise: () => import('@/components/common/ArticlesLoadingAdvise'),
		NavComponent: () => import('@/components/vender/components/NavComponent'),
		Client: () => import('@/components/vender/components/client/Index'),
		Remito: () => import('@/components/vender/components/remito/Index'),
		BtnSave: () => import('@/components/vender/components/BtnSave'),
	},
	// computed: {
	// 	items() {
	// 		return this.$store.state.vender.items
	// 	}
	// },
	// beforeRouteLeave(to, from, next) {
	// 	if (this.items.length) {
	// 		let leave = window.confirm('Conservar esta venta con sus articulos')
	// 		if (leave) {
	// 			next()
	// 		} else {
	// 			// this.clearVender()
	// 			next()
	// 		}
	// 	} else {
	// 		next()
	// 	}
	// },
}
</script>
<style scoped lang="sass">

// .list 
// 	width: 98%
// 	position: absolute
// 	z-index: 500
// 	max-height: 200px
// 	overflow-y: scroll

// .article-name 
// 	font-size: 1rem
// 	padding: 10px

// .list-group-border 
// 	border: 1px solid rgba(51, 51,51, .6)
// 	border-radius: 0.25rem 0.25rem 0 0

// .p-price-mobile 
// 	font-size: 1.5rem

// .btn-movil 
// 	padding: 8px 16px


// .col-relative 
// 	position: relative
// 	padding: 0px


// .col-total
// 	display: flex
// 	flex-direction: column
// 	justify-content: flex-start
// 	@media screen and (min-width: 768px)
// 		p 
// 			text-align: left
</style>