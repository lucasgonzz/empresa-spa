<template>
	<!--
		v-if/v-else en la raiz: para Vue 2 sigue siendo un unico nodo raiz. El <div class="m-l-10">
		que los envolvia se saco a proposito (grupo 371): el espaciado entre botones ahora lo pone
		el `gap` del contenedor table-buttons/Index.vue.
	-->
	<btn-accion
	v-if="caja.abierta"
	icono="bi bi-lock"
	texto="Cerrar"
	tono="cerrar"
	:loader="loading"
	@clicked="cerrar"></btn-accion>

	<btn-accion
	v-else
	icono="bi bi-unlock"
	texto="Abrir"
	tono="abrir"
	:loader="loading"
	@clicked="abrir"></btn-accion>
</template>
<script>
export default {
	props: {
		caja: Object,
	},
	components: {
		BtnAccion: () => import('@/components/caja/components/table-buttons/BtnAccion'),
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		abrir() {
			this.loading = true

			this.$api.put('abrir-caja/'+this.caja.id)
			.then(res => {

				this.$toast.success('Caja abierta')
				this.$store.commit('caja/add', res.data.model)
				this.loading = false
			})
			.catch(err => {
				this.$toast.error('Error al abrir caja')
				console.log(err)
				this.loading = false
			})
		},
		cerrar() {
			this.loading = true

			this.$api.put('cerrar-caja/'+this.caja.id)
			.then(res => {
				this.$toast.success('Caja cerrada')
				this.$store.commit('caja/add', res.data.model)
				this.loading = false
			})
			.catch(err => {
				this.$toast.error('Error al cerrar caja')
				console.log(err)
				this.loading = false
			})
		},
	}
}
</script>
