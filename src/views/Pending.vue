<template> 
<div>
	
	<nav-component></nav-component>

	<pendings></pendings>

	<pendings-completed></pendings-completed>	

</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/pendings/components/nav/Index'),
		Pendings: () => import('@/components/pendings/components/pendings/Index'),
		PendingsCompleted: () => import('@/components/pendings/components/pendings-completed/Index'),
	},
}
</script>