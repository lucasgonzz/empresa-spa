<template>
	<!--
		Botón "Ver en el mapa" debajo de "Direccion de envio" del formulario del pedido (misión
		formas-envio-direcciones-maps, 19/10/2026). Entra por el slot `prop_extras` de ModelForm (ver
		el consumidor en online/components/orders/Index.vue), que agrega algo DEBAJO de un campo sin
		reemplazarlo: no hace falta tocar common-vue.

		Solo en un pedido con envío a domicilio y con alguna dirección para ubicar. Abre el mismo
		modal del mapa que la dirección del modal de envío, con un id propio.
	-->
	<div
	v-if="mostrar"
	class="btn-ver-en-mapa">
		<b-button
		size="sm"
		variant="outline-primary"
		title="Ver la dirección de entrega en el mapa"
		data-testid="btn-ver-en-mapa-del-pedido"
		@click.stop="abrir">
			<i class="bi bi-geo-alt"></i>
			Ver en el mapa
		</b-button>

		<mapa-direccion
		:id="mapa_id"
		:direccion="direccion"></mapa-direccion>
	</div>
</template>
<script>
import MapaDireccion from '@/components/online/components/orders/envio/MapaDireccion'
import { direccion_de_envio_del_pedido } from '@/utils/direccion_de_envio'

export default {
	components: {
		// Import estático, por lo mismo que EnvioModal en EnvioBtn: el botón y su modal van juntos
		MapaDireccion,
	},
	props: {
		// El pedido del formulario (el `model` del scope de `prop_extras`)
		model: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Dirección de entrega del pedido: `envio_direccion` → `envio_destino` → `address` (ver
		 * utils/direccion_de_envio.js). Null si no trae ninguna.
		 */
		direccion() {
			return direccion_de_envio_del_pedido(this.model)
		},
		mostrar() {
			return !!(this.model && Number(this.model.deliver) === 1 && this.direccion)
		},
		// Id propio: el modal de envío de la fila monta otro mapa para el mismo pedido
		mapa_id() {
			return 'mapa-form-pedido-' + (this.model && this.model.id ? this.model.id : 'nuevo')
		},
	},
	methods: {
		/**
		 * Abre el mapa (se apila arriba del formulario del pedido).
		 *
		 * @returns {void}
		 */
		abrir() {
			this.$bvModal.show(this.mapa_id)
		},
	},
}
</script>
<style scoped lang="sass">
.btn-ver-en-mapa
	margin-top: 8px

	// El ícono `bi` no lleva el reset de los `icon-*`, pero el gap con el texto sí lo necesita
	i
		margin-right: 4px
</style>
