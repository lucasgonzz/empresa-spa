<template>
<!--
	Modal "Versión del sistema" (misión version-instalada-historial). Orquestador: sólo layout y registro
	de sub-componentes. Al abrirse vuelve a pedir los datos con el indicador global de carga.
-->
<b-modal
id="version-instalada"
title="Versión del sistema"
size="md"
centered
hide-footer
modal-class="version-instalada-modal"
@show="al_abrir">

	<resumen-actual
	:current="current"></resumen-actual>

	<historial-de-versiones
	:history="history"
	:current="current"></historial-de-versiones>

</b-modal>
</template>
<script>
/**
 * Modal con la versión instalada, cuándo se instaló y el historial de actualizaciones.
 */
export default {
	components: {
		ResumenActual: () => import('@/components/version-instalada/ResumenActual'),
		HistorialDeVersiones: () => import('@/components/version-instalada/HistorialDeVersiones'),
	},
	computed: {
		/**
		 * Versión actual guardada en el store.
		 *
		 * @returns {object|null}
		 */
		current() {
			return this.$store.state.installed_version.current
		},
		/**
		 * Historial de versiones guardado en el store.
		 *
		 * @returns {Array}
		 */
		history() {
			return this.$store.state.installed_version.history
		},
	},
	methods: {
		/**
		 * Al abrir el modal refresca los datos mostrando el indicador global de carga.
		 *
		 * @returns {void}
		 */
		al_abrir() {
			this.$store.commit('auth/setMessage', 'Cargando la versión del sistema')
			this.$store.commit('auth/setLoading', true)
			this.$store.dispatch('installed_version/fetch')
			.then(() => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(() => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
	},
}
</script>
