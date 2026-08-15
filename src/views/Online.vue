<template>
	<div>
		<!--
			Misión "chat IA" (15/8/2026): la vista dejó de montar NavComponent (las
			secciones se navegan desde la nav vertical, hijos de "Tienda Online") y
			Messages (el módulo de mensajes quedó OCULTO sin borrarse: los archivos
			de components/online/components/messages/ siguen intactos en disco).
		-->
		<orders></orders>
		<buyers></buyers>
		<cupons></cupons>
	</div>
</template>
<script>
export default {
	components: {
		Orders: () => import('@/components/online/components/orders/Index'),
		Buyers: () => import('@/components/online/components/buyer/Index'),
		Cupons: () => import('@/components/online/components/cupons/Index'),
	}
}
</script>