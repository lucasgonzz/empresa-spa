<template>
	<div>
		<modal></modal>

		<b-button
		v-if="hasExtencion('forzar_total') && total > 0"
		variant="success"
		size="sm"
		class="m-l-15"
		@click="modal">
			Forzar
		</b-button>
	</div>
</template>	
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components: {
		Modal: () => import('@/components/vender/components/remito/total-previus-sales/forzar-total/Modal')
	},
	methods: {
		modal() {

			this.$store.commit('vender/set_descuento', null)

			this.setTotal()

			this.$bvModal.show('forzar-total')
			setTimeout(() => {
				let input = document.getElementById('precio-final-forzado')

				if (input) {

					input.focus()
				}
			}, 500)
		}
	}
}
</script>
