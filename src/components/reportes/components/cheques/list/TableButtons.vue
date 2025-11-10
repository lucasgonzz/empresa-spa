<template>
	<div
	class="j-center">
		<div
		v-if="sub_view == 'recibido'">
			<b-button
			@click.stop="cobrar"
			v-if="puede_cobrar"
			variant="success">
				Cobrar
			</b-button>
			<b-button
			@click.stop="rechazar"
			v-if="puede_rechazar"
			class="m-l-10"
			variant="danger">
				Rechazar
			</b-button>
			<b-button
			@click.stop="endosar"
			v-if="puede_endozar"
			class="m-l-10"
			variant="primary">
				Endosar
			</b-button>
		</div>
		<div
		v-if="sub_view == 'emitido'">
			<b-button
			v-if="puede_cobrar_por_proveedor"
			@click.stop="pagar"
			variant="success">
				Pagar cheque
			</b-button>
			<b-button
			v-if="puede_cobrar_por_proveedor"
			class="m-l-10"
			variant="danger">
				Rechazado por proveedor
			</b-button>
		</div>

		<b-button
		@click="eliminar"
		class="m-l-10"
		variant="danger">
			<i class="icon-trash"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		cheque: Object,
	},
	computed: {
		puede_cobrar() {
			return this.sub_sub_view == 'disponibles-para-cobrar'
					|| this.sub_sub_view == 'pronto-a-vencerse'
		},
		puede_rechazar() {
			return this.sub_sub_view == 'disponibles-para-cobrar'
					|| this.sub_sub_view == 'pronto-a-vencerse'
					|| this.sub_sub_view == 'vencidos'
		},
		puede_endozar() {
			return this.sub_sub_view == 'pendientes'
					|| this.sub_sub_view == 'disponibles-para-cobrar'
					|| this.sub_sub_view == 'pronto-a-vencerse'
		},


		puede_cobrar_por_proveedor() {
			return this.sub_sub_view == 'disponibles-para-cobrar'
					|| this.sub_sub_view == 'pronto-a-vencerse'
					|| this.sub_sub_view == 'vencido'
		},
	},
	methods: {
		eliminar() {
			if (confirm('¿Seguro que quiere eliminar este cheque? No se modificara la cuenta corriente')) {
				this.$api.delete('cheque/'+this.cheque.id)
				.then(() => {
					this.$store.dispatch('cheque/getModels')
					this.$toast.success('Cheque eliminado')
				})
				.catch(err => {
					this.$toast.error(err)
				})
			}
		},
		pagar() {
			this.$store.commit('cheque/setModel', {
				model: this.cheque,
				properties: []
			})

			this.$bvModal.show('pagar-cheque')
		},
		cobrar() {
			this.$store.commit('cheque/setModel', {
				model: this.cheque,
				properties: []
			})

			this.$bvModal.show('cobrar-cheque')
		},
		endosar() {
			this.$store.commit('cheque/setModel', {
				model: this.cheque,
				properties: []
			})

			this.$bvModal.show('endosar-cheque')
		},
		rechazar() {
			this.$store.commit('cheque/setModel', {
				model: this.cheque,
				properties: []
			})

			this.$bvModal.show('rechazar-cheque')
		},
 	}
}
</script>	