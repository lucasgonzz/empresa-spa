<template>
	<div>
		<nav-component></nav-component>

		<!--
			Aviso de "conectá tu cuenta" arriba de las solapas que no son "Cuenta" (misión
			mercado-libre-integracion, 27/10/2026). Se muestra recién cuando la consulta de la
			cuenta volvió y dijo que no está conectada: mientras tanto no se muestra nada, para
			no hacer parpadear el aviso en un comercio que sí está conectado.
		-->
		<aviso-sin-conexion
		v-if="view != 'cuenta' && cuenta_mercado_libre && !mercado_libre_conectado"></aviso-sin-conexion>

		<cuenta></cuenta>
		<orders></orders>
		<sync-to-meli-article></sync-to-meli-article>
		<sync-from-meli-article></sync-from-meli-article>
		<sync-from-meli-order></sync-from-meli-order>
	</div>
</template>
<script>
import mercado_libre_conexion from '@/mixins/mercado_libre_conexion'

export default {
	mixins: [mercado_libre_conexion],
	components: {
		NavComponent: () => import('@/components/mercado-libre/components/Nav'),
		AvisoSinConexion: () => import('@/components/mercado-libre/components/AvisoSinConexion'),
		Cuenta: () => import('@/components/mercado-libre/cuenta/Index'),
		Orders: () => import('@/components/mercado-libre/components/Orders'),
		SyncToMeliArticle: () => import('@/components/mercado-libre/components/SyncToMeliArticle'),
		SyncFromMeliArticle: () => import('@/components/mercado-libre/components/SyncFromMeliArticle'),
		SyncFromMeliOrder: () => import('@/components/mercado-libre/components/SyncFromMeliOrder'),
	},
	created() {
		/*
			`/mercado-libre` a secas (sin solapa en la URL) no mostraba ninguna solapa, solo el
			aviso de conexión: se lleva a "Cuenta", que es la solapa por defecto del módulo. Con
			`replace` para que "atrás" no vuelva a la URL vacía. La solapa "Cuenta" consulta la cuenta
			sola al mostrarse, así que acá no hace falta la consulta de fondo.
		*/
		if (!this.view) {
			this.$router.replace({ name: 'mercado_libre', params: { view: 'cuenta' } })
			.catch(() => {})
			return
		}

		/*
			Consulta de fondo (sin indicador global) para saber si la cuenta está conectada y
			decidir el aviso de las otras solapas. La solapa "Cuenta" hace su propia consulta, con
			indicador, cuando se abre: si se entra directo a ella no se consulta dos veces.
		*/
		if (this.view != 'cuenta') {
			this.cargar_cuenta_mercado_libre(false)
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'

.sync-meli-success
	td
		background: $green !important

.sync-meli-primary
	td
		background: $blue !important

.sync-meli-warning
	td
		background: $yellow !important

.sync-meli-danger
	td
		background: $red !important
</style>
