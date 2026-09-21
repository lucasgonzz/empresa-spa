<template>
	<component
	v-if="componente_del_modal"
	:is="componente_del_modal"
	model_name="client"
	:modal_id="MODAL_ID"
	:show_btn_pdf="false"></component>
</template>

<script>
/** Id propio del modal — nunca 'client' a secas, ver el comentario de abajo. */
const MODAL_ID = 'mostrador-client'

/**
 * Puente entre el click en el nombre de un cliente del informe (bloques/Clientes.vue,
 * evento `abrir-cliente`) y el modal con sus datos que ya usa el resto del sistema
 * (misión mostrador-fotos-y-modales, 21/9/2026) — DISTINTO del de cuenta corriente
 * (ese ya tiene su propio puente global, asistente-ia/CuentaCorrienteDeMencion.vue, y
 * bloques/Clientes.vue lo reusa directo para el click en la deuda).
 *
 * Mismo mecanismo que AbrirArticuloDesdeInforme.vue (ver su comentario para el porqué
 * completo): el modal genérico `common-vue/components/model/Index.vue` con
 * model_name="client" (id de b-modal: "client") solo existe si la pantalla actual lo
 * montó (normalmente src/views/Client.vue), y el mostrador se abre desde cualquier
 * pantalla — así que este componente lo monta por su cuenta, con un modal_id propio
 * ("mostrador-client") para no colisionar si Client.vue ya tiene el suyo montado.
 *
 * 🔴 Y por `store.commit('client/setModel', ...)`, SINGULAR — no 'clients/setModel'
 * (plural). El modal lee de `$store.state['client'].model`
 * (common-vue/mixins/generals.js:893-895, modelStoreFromName), que es el mismo módulo
 * que usa Tr.vue al clickear una fila en Client.vue (vía el mixin global setModel() de
 * common-vue/mixins/display.js). `mixins/clients.js` (editClient) commitea al módulo
 * 'clients' (plural) para otro caso de uso (el picker de Vender) y no se probó que
 * mantenga sincronizado 'client' (singular): se sigue acá el camino confirmado, no el
 * que además arrastra esa duda.
 *
 * 🔴 Chequeo de dueño del lado del cliente: mismo motivo que
 * AbrirArticuloDesdeInforme.vue (ver su comentario completo) — `GET client/{id}` sale de
 * `Controller::fullModel()`, que busca por id pelado, sin scopear por dueño.
 */
export default {
	name: 'AbrirClienteDesdeInforme',
	data() {
		return {
			componente_del_modal: null,
			abriendo: false,
			MODAL_ID,
		}
	},
	methods: {
		/**
		 * Trae el cliente completo y abre el modal.
		 *
		 * @param {Number} client_id
		 * @returns {void}
		 */
		abrir(client_id) {
			if (!client_id || this.abriendo) {
				return
			}
			this.abriendo = true
			let self = this
			Promise.all([
				import('@/common-vue/components/model/Index'),
				this.$api.get('client/' + client_id),
			])
				.then(function (resultados) {
					self.abriendo = false
					let modulo = resultados[0]
					let cliente = resultados[1].data.model
					if (!cliente || !cliente.id || !self.es_del_dueno(cliente)) {
						self.$toast.error('No pudimos abrir este cliente')
						return
					}
					self.componente_del_modal = modulo.default || modulo
					self.$store.commit('client/setModel', { model: cliente, properties: [] })
					self.$nextTick(function () {
						self.$bvModal.show(MODAL_ID)
					})
				})
				.catch(function (err) {
					self.abriendo = false
					console.log(err)
					self.$toast.error('No pudimos abrir este cliente')
				})
		},
		/**
		 * true si el cliente traído es del dueño de la sesión (ver el comentario de
		 * arriba). Mismo camino que Index.vue para resolver el dueño real cuando quien
		 * está logueado es un empleado.
		 *
		 * @param {Object} cliente
		 * @returns {Boolean}
		 */
		es_del_dueno(cliente) {
			let auth_user = this.$store.state.auth.user
			if (!auth_user) {
				return false
			}
			let owner_id = auth_user.owner ? auth_user.owner.id : auth_user.id
			return !!owner_id && cliente.user_id == owner_id
		},
	},
}
</script>
