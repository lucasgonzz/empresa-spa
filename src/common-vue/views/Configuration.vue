<template>
	<div>
		<template v-if="is_admin">
			<nav-component></nav-component>

			<general></general>	
			<custom></custom>	
			<password></password>	
		</template>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/common-vue/components/configuration/Nav'),
		General: () => import('@/common-vue/components/configuration/general/Index'),
		Custom: () => import('@/common-vue/components/configuration/custom/Index'),
		Password: () => import('@/common-vue/components/configuration/password/Index'),
	},
	data() {
		return {
			/* Evita disparar redirect() dos veces (created + watch) y el push cancelado que eso genera */
			redirigido: false,
		}
	},
	created() {
		this.verificarAcceso()
	},
	watch: {
		/*
			Solo el dueño o un empleado con acceso de administrador entra a la configuracion.
			Si el usuario carga despues de montar la vista (auth/me todavia no resolvio),
			estos watch vuelven a evaluar el acceso apenas llega.
		*/
		user() {
			this.verificarAcceso()
		},
		is_admin() {
			this.verificarAcceso()
		},
	},
	methods: {
		verificarAcceso() {
			/* Sin usuario cargado todavia no se puede decidir: se espera al watch */
			if (!this.authenticated || !this.user) {
				return
			}
			if (!this.is_admin && !this.redirigido) {
				this.redirigido = true
				this.redirect()
			}
		},
	},
}
</script>