<template>
	<!--
		El modal de "Nuevo cliente" del sistema —el formulario genérico de siempre, el mismo que se abre
		desde Clientes— precargado con los datos del comprador de la tienda, para verificarlos o
		completarlos y crear el cliente. Al guardar, el orquestador (./Index.vue) lo vincula al
		comprador.

		Se monta suelto (sin el `view-component` que lo envuelve en Clientes) y con `modal_id` propio,
		igual que hace whatsapp/conversation/Header.vue: así no choca con otro `<b-modal id="client">`
		que pudiera estar montado en la misma página, porque dos `<b-modal>` con el mismo id se abren
		los dos juntos con un solo `$bvModal.show()`.

		El `v-if="montado"` lo mantiene sin dibujar hasta la primera vez que se pide: la mayoría de las
		veces quien vincula elige un cliente que ya existe, y no hace falta armar el formulario.
	-->
	<model-index
	v-if="montado"
	model_name="client"
	:modal_id="ID_MODAL"
	:show_btn_pdf="false"
	:show_btn_delete="false"
	check_permissions
	@modelSaved="al_guardar">
		<!-- Deja claro que este cliente nuevo es el que se va a vincular, y con quién. -->
		<template #model_modal_header>
			<div
			class="vincular-crear-aviso"
			data-testid="vincular-comprador-aviso-crear">
				<i class="bi bi-link-45deg"></i>
				<span class="vincular-crear-aviso__texto">
					Al guardar, este cliente queda vinculado a «{{ nombre_del_comprador }}» de la tienda.
				</span>
			</div>
		</template>
	</model-index>
</template>
<script>
// Import estático a propósito: `model/Index.vue` ya lo carga la propia pantalla (el `view-component`
// de Pedidos y el de Clientes lo importan), así que webpack lo reutiliza y no suma nada. Uno
// diferido dejaría una carrera: el `$bvModal.show()` de más abajo se perdería si el modal todavía
// no existiera.
import ModelIndex from '@/common-vue/components/model/Index'
import nombre_completo from '@/components/online/components/vincular-comprador/nombre_completo'

/** Id propio del b-modal del cliente nuevo (nunca 'client' a secas: ver el template). */
const ID_MODAL = 'vincular-comprador-crear-cliente'

/**
 * Espera antes de mostrar el modal.
 *
 * El mixin global `setModel()` comitea el modelo al store dentro de un `setTimeout(30)`: si el
 * modal se mostrara antes, el formulario se dibujaría un instante con el cliente anterior (o
 * vacío) y recién después saltaría a los datos del comprador.
 */
const ESPERA_DEL_STORE_MS = 80

/**
 * Cliente nuevo desde el modal de vincular (misión vincular-comprador-desde-pedidos, 24/9/2026).
 *
 * No hace el vínculo: cuando el cliente se guardó, oculta su modal y avisa `cliente-creado` con el
 * cliente que devolvió la API. Quien tiene el comprador y sabe vincular (./Index.vue) hace el
 * resto, y así hay un solo camino de vinculación para "elegí uno existente" y "creá uno nuevo".
 */
export default {
	components: {
		ModelIndex,
	},
	data() {
		return {
			/** true desde la primera vez que se pide; recién ahí se dibuja el formulario. */
			montado: false,
			/** Comprador de la tienda con el que se abrió (para el aviso y para la precarga). */
			comprador: null,
			ID_MODAL,
		}
	},
	computed: {
		/**
		 * Nombre del comprador para el aviso (sin duplicar el apellido).
		 *
		 * @returns {String}
		 */
		nombre_del_comprador() {
			return nombre_completo(this.comprador)
		},
	},
	methods: {
		/**
		 * Abre el formulario de cliente nuevo precargado con los datos del comprador.
		 *
		 * @param {Object} buyer Comprador de la tienda (`name`, `surname`, `email`, `phone`,
		 *                       `address`, `barrio`, `ciudad`).
		 * @returns {void}
		 */
		abrir(buyer) {
			let self = this

			this.comprador = buyer
			this.montado = true

			// Después del render: en la primera apertura el formulario recién se crea con el
			// `montado` de arriba, y el `$bvModal.show()` no llega a un `<b-modal>` que no existe.
			this.$nextTick(function () {
				self.precargar(buyer)

				setTimeout(function () {
					self.$bvModal.show(ID_MODAL)
				}, ESPERA_DEL_STORE_MS)
			})
		},
		/**
		 * Arma un cliente en blanco (con los valores por defecto de `models/client.js`) y le pisa
		 * los datos del comprador: nombre, email, teléfono y dirección.
		 *
		 * `setModel(null, 'client', ...)` es el mismo camino que usa el botón "Nuevo" de Clientes,
		 * así que los selects y las relaciones (`discounts`, `surchages`…) arrancan como siempre. Los
		 * dos `false` del final: no abrir el modal `client` (se abre el propio, por id) ni la vista
		 * previa.
		 *
		 * @param {Object} buyer Comprador de la tienda.
		 * @returns {void}
		 */
		precargar(buyer) {
			this.setModel(null, 'client', [
				{ key: 'name', value: nombre_completo(buyer) },
				{ key: 'email', value: buyer.email ? String(buyer.email).trim() : '' },
				{ key: 'phone', value: buyer.phone ? String(buyer.phone).trim() : '' },
				{ key: 'address', value: this.direccion_del_comprador(buyer) },
			], false, false)
		},
		/**
		 * Dirección para el cliente: la calle, el barrio y la ciudad del comprador (los que tenga,
		 * en ese orden) unidos con coma. El cliente del sistema tiene un solo campo `address`.
		 *
		 * @param {Object} buyer Comprador de la tienda.
		 * @returns {String} Ej.: "Calle 123, Centro, Rosario" ('' si no tiene ninguno).
		 */
		direccion_del_comprador(buyer) {
			/** Los tres datos en el orden en que se leen: calle, barrio, ciudad. */
			let campos = [buyer.address, buyer.barrio, buyer.ciudad]
			/** Los que tienen algo escrito. */
			let partes = []

			campos.forEach(function (campo) {
				let texto = campo ? String(campo).trim() : ''

				if (texto !== '') {
					partes.push(texto)
				}
			})

			return partes.join(', ')
		},
		/**
		 * El formulario guardó el cliente: se oculta el modal y se avisa al orquestador.
		 *
		 * 🔴 El modal se oculta ACÁ, a mano. `closeModal()` de `model/Index.vue` cierra por
		 * `model_name` (`$bvModal.hide('client')`) y NO por `modal_id`: con un id propio, el
		 * "Guardar y cerrar" cerraría un modal que no existe y este quedaría abierto.
		 *
		 * @param {Object} cliente Cliente creado, tal como lo devolvió `POST client`.
		 * @returns {void}
		 */
		al_guardar(cliente) {
			this.$bvModal.hide(ID_MODAL)
			this.$emit('cliente-creado', cliente)
		},
	},
}
</script>
<style lang="sass">
// Aviso de arriba del formulario. Sin `scoped`: el contenido del slot se dibuja adentro del modal,
// que cuelga de <body>, y el prefijo `vincular-crear-aviso` es propio.
.vincular-crear-aviso
	display: flex
	align-items: center
	gap: 10px
	margin-bottom: 16px
	padding: 10px 12px
	border: 1px solid var(--color-border-secondary)
	border-radius: 10px
	background: var(--bg-section)
	color: var(--color-text-primary)
	font-size: 0.875rem
	line-height: 1.35
	text-align: left

	.bi
		flex: 0 0 auto
		font-size: 1.125rem
		line-height: 1
		color: var(--color-primary)

.vincular-crear-aviso__texto
	min-width: 0
	overflow-wrap: anywhere
</style>
