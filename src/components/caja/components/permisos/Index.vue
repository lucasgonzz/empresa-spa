<template>
	<!--
		Orquestador de los permisos de la caja (misión cajas-permisos-claros, 24/11/2026). Entra por el slot
		`prop_extras` de ModelForm (ver Caja.vue), que dibuja algo DEBAJO de un campo sin reemplazarlo: no se
		toca common-vue. Sólo layout y registro de sub-componentes:

		- Debajo de «Quiénes la USAN en Vender» (`users`): el renglón de estado de esa lista.
		- Debajo de «Quiénes la VEN en Tesorería» (`treasury_users`): el renglón de estado (con la herencia
		  explícita y el atajo de sucursal) y la tabla «Quién ve y quién usa esta caja».
	-->
	<div
	v-if="es_lista_de_permisos"
	class="permisos-caja">

		<estado-lista
		:prop="prop"
		:model="model"></estado-lista>

		<resumen-permisos
		v-if="prop.key == 'treasury_users'"
		:model="model"></resumen-permisos>

	</div>
</template>
<script>
export default {
	components: {
		EstadoLista: () => import('@/components/caja/components/permisos/EstadoLista'),
		ResumenPermisos: () => import('@/components/caja/components/permisos/ResumenPermisos'),
	},
	props: {
		// Campo del formulario que está dibujando ModelForm (el scope `prop` del slot).
		prop: {
			type: Object,
			required: true,
		},
		// La caja que se está editando, con las listas tal como se van cargando (sin guardar).
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * El slot `prop_extras` se invoca por CADA campo del formulario: sólo las dos listas de empleados
		 * llevan algo debajo.
		 *
		 * @returns {boolean}
		 */
		es_lista_de_permisos() {
			return this.prop.key == 'users' || this.prop.key == 'treasury_users'
		},
	},
}
</script>
<style lang="sass">
.permisos-caja
	margin-top: 6px
	margin-bottom: 10px
</style>
