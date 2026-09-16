<template>
	<!--
		El modal de cuenta corriente del chat. `componente_del_modal` es null hasta el primer
		clic en una mención de cliente: `common/current-acounts/Index.vue` arrastra su propia
		batería de sub-modales (pagos, notas de crédito y débito, saldo inicial, detalle de
		cheques, el modal de venta...), y bajarla en cada carga de página para una función que
		mucha gente no va a usar no se justifica. Mismo criterio que el header del sidebar de
		WhatsApp, que lo importa lazy.
	-->
	<component
	v-if="componente_del_modal"
	:is="componente_del_modal"
	:modal_id="modal_id"></component>
</template>

<script>
import { MODAL_CUENTA_CORRIENTE_DEL_CHAT } from '@/store/ai_chat'

/**
 * El puente entre el clic en el nombre de un cliente adentro del chat y su cuenta corriente
 * (misión agente-ia-mano-derecha, C3, 16/9/2026).
 *
 * 🔴 LA TRABA QUE RESUELVE, Y POR QUÉ VIVE ACÁ. El destino no es una ruta: es el
 * `<b-modal>` de `common/current-acounts/Index.vue`, y ese modal **solo existe si la vista
 * actual lo montó**. Lo montan Clientes, Ventas, Vender, Listado, Presupuestos y una docena
 * más — pero el chat se abre desde CUALQUIER pantalla. Parado en Caja no hay ningún
 * `#current-acounts` en el documento y `$bvModal.show()` no le habla a nadie.
 *
 * Por eso el modal lo monta el chat, colgado del botón flotante (`FloatingButton.vue`), que
 * es el único componente que está montado siempre que la extensión `asistente_ia` esté
 * prendida — y que cubre de una vez los DOS contenedores de la conversación: el panel
 * flotante y el sidebar del informe del mostrador, que dibujan el mismo `MessageBubble`.
 *
 * 🔴 Y con un `modal_id` PROPIO, nunca 'current-acounts'. Si el chat se abre encima de una
 * pantalla que ya montó el suyo, quedarían dos `<b-modal>` con el mismo id y `$bvModal.show()`
 * les dispara el evento a las dos juntas: se abren los dos, uno arriba del otro. Es el mismo
 * problema que ya documentan `BtnCurrentAcounts.vue:51-59` y el header del sidebar de
 * WhatsApp (que usa `whatsapp-current-acounts`).
 *
 * ⚠️ Lo que NO se resuelve acá, y está bien que no: nadie limpia `current_acount.from_model`
 * al cerrar el modal (medido el 15/9/2026, documentado en `store/ai_chat.js`). Este
 * componente lo PISA en cada apertura, que es lo que importa; que quede cargado después de
 * cerrar es un comportamiento viejo del store compartido y arreglarlo desde acá tocaría las
 * veinticinco pantallas que lo usan.
 */
export default {
	name: 'CuentaCorrienteDeMencion',
	data() {
		return {
			// Las opciones YA RESUELTAS de current-acounts/Index.vue. Ver `abrir()`: se
			// guarda el módulo en vez de dejarle el import a un componente asíncrono para
			// poder mostrar el modal en el $nextTick siguiente con certeza.
			componente_del_modal: null,
			// true mientras viaja el pedido del cliente (evita que dos clics seguidos
			// disparen dos aperturas).
			abriendo: false,
			modal_id: MODAL_CUENTA_CORRIENTE_DEL_CHAT,
		}
	},
	computed: {
		/**
		 * El pedido que deja el clic en una mención: { client_id, nombre, token }.
		 *
		 * @returns {Object|null}
		 */
		pedido() {
			return this.$store.state.ai_chat.mencion_cuenta_corriente
		},
	},
	watch: {
		/**
		 * Cada pedido nuevo abre la cuenta. El watcher mira el objeto entero y no el
		 * `client_id`: el `token` que sube en cada clic es lo que hace que tocar DOS VECES
		 * la misma mención vuelva a abrir el modal después de haberlo cerrado.
		 */
		pedido(valor) {
			if (!valor || !valor.client_id) {
				return
			}
			this.abrir(valor.client_id)
		},
	},
	methods: {
		/**
		 * Trae el cliente con sus cuentas y abre el modal.
		 *
		 * 🔴 El chunk del modal y el pedido del cliente van EN PARALELO y se espera a los
		 * dos, en vez de dejarle el import a un `components: { X: () => import(...) }`. Con
		 * el componente asincrónico, entre que se prende el `v-if` y que el `<b-modal>`
		 * existe de verdad hay un viaje a la red por el chunk, y `$bvModal.show()` --que es
		 * un evento de raíz que se emite UNA vez-- se perdería si el chunk todavía no bajó:
		 * el primer clic no abriría nada, y el segundo sí. Con el módulo ya resuelto en
		 * `componente_del_modal`, el render del `$nextTick` es sincrónico y el modal está
		 * escuchando cuando se le habla.
		 *
		 * @param {Number} client_id
		 * @returns {void}
		 */
		abrir(client_id) {
			if (this.abriendo) {
				return
			}
			this.abriendo = true
			let self = this
			Promise.all([
				import('@/components/common/current-acounts/Index'),
				this.$store.dispatch('ai_chat/fetchClienteParaCuentaCorriente', client_id),
			])
				.then(function (resultados) {
					self.abriendo = false
					let modulo = resultados[0]
					let cliente = resultados[1]
					if (!cliente || !cliente.id) {
						self.$toast.error('No pudimos abrir la cuenta corriente de este cliente')
						return
					}
					let cuenta = self.cuenta_a_abrir(cliente)
					if (!cuenta) {
						self.$toast.error('Este cliente no tiene cuenta corriente')
						return
					}
					self.componente_del_modal = modulo.default || modulo

					// La misma secuencia de BtnCurrentAcounts.vue:96-102, que es la única
					// forma en que este modal sabe de qué cuenta habla.
					self.$store.commit('current_acount/setFromModelName', 'client')
					self.$store.commit('current_acount/setFromModel', cliente)
					self.$store.commit('current_acount/set_from_credit_account', cuenta)
					self.$store.dispatch('current_acount/getModels')

					self.$nextTick(function () {
						self.$bvModal.show(self.modal_id)
					})
				})
				.catch(function (err) {
					self.abriendo = false
					console.log(err)
					self.$toast.error('No pudimos abrir la cuenta corriente de este cliente')
				})
		},
		/**
		 * Cuál de las cuentas del cliente se abre.
		 *
		 * 🔴 Se busca la de PESOS, y `moneda_id` 0 cuenta como pesos igual que el 1
		 * (`RecolectorBase::MONEDAS_PESOS = [0, 1]` en empresa-api, commit 8ddbac31): en
		 * producción hay `credit_accounts` con 0 por altas viejas donde no se eligió moneda,
		 * y filtrar por `== 1` deja a esos clientes sin cuenta corriente. Es un defecto real
		 * que ya costó caro el 15/9/2026.
		 *
		 * La de dólares solo se ofrece con la extensión `ventas_en_dolares`
		 * (`BtnCurrentAcounts.vue:93-95`), y eso lo resuelve el API: por el contrato, sin la
		 * extensión la cuenta en dólares ni siquiera viaja. Acá el orden ya la deja segunda,
		 * así que solo se abriría si el cliente NO tuviera cuenta en pesos — y en ese caso
		 * mostrar la única que tiene es mejor que decirle que no tiene ninguna.
		 *
		 * @param {Object} cliente
		 * @returns {Object|null}
		 */
		cuenta_a_abrir(cliente) {
			let cuentas = Array.isArray(cliente.credit_accounts) ? cliente.credit_accounts : []
			if (!cuentas.length) {
				return null
			}
			let pesos = cuentas.find(function (cuenta) {
				return cuenta.moneda_id == 0 || cuenta.moneda_id == 1
			})
			return pesos || cuentas[0]
		},
	},
}
</script>

<style lang="sass">
// 🔴 SIN ESTO EL MODAL SE ABRE DETRÁS DEL CHAT. Medido el 16/9/2026 en el panel flotante: el
// modal quedaba tapado por el panel desde el que se lo abrió, y lo único que se veía era un
// telón gris asomando por los costados.
//
// BootstrapVue le pone al div externo de cada modal (`safeId('__BV_modal_outer_')`) un
// z-index INLINE que mide UNA sola vez sobre un `div.modal-backdrop` de prueba
// (getBaseZIndex, modal/helpers/modal-manager.js). Con el CSS de Bootstrap eso da **1040**
// --medido, valor inline exacto--, y el modal entero queda en 1040/1050, por debajo del
// overlay del panel del chat (1055) y muy por debajo del overlay del informe del mostrador
// (1062), que son los dos únicos lugares desde donde se abre este modal.
//
// ⚠️ El encabezado de `InformeAbierto.vue:253-290` menciona que en la práctica ese número da
// 1095/1105 por un efecto lateral del CSS del chat de soporte, que pisa
// `body > .modal-backdrop:last-of-type` y también le matchea al div de prueba. Acá NO dio
// eso: dio 1040. Que dependa de qué hojas ya se cargaron cuando se mide es justamente el
// motivo por el que el escalón va fijo y no se confía en el default.
//
// El escalón completo, con lo que agregó esta misión:
//
//      botón del chat 1054 < panel del chat 1055 < video de la demo 1060
//      < overlay del informe 1062 < ficha del hover 1063 < recordatorio de cobro 1064
//      < ESTE MODAL 1065 < toasts 1066
//
// 1065 le gana a todo lo que puede haber debajo y queda ABAJO de los toasts, que tienen que
// leerse aunque el modal esté abierto --y acá importa de verdad: adentro de este modal se
// registran pagos, y el aviso de que salió (o de que no) es un toast--.
//
// El `!important` le gana al inline, que es una declaración normal. El id es el que arma
// bootstrap-vue a partir del `modal_id` del template: si cambia uno, cambia el otro.
#asistente-ia-current-acounts___BV_modal_outer_
	z-index: 1065 !important
</style>
