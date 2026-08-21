<template>
	<b-modal
	id="provider-order-scan-ready-notification"
	size="md"
	hide-footer
	hide-header
	centered
	@hidden="on_hidden">
		<div class="provider-order-scan-ready-modal">

			<div class="provider-order-scan-ready-modal__hero">
				<div
				class="provider-order-scan-ready-modal__hero-icon"
				:class="{ 'provider-order-scan-ready-modal__hero-icon--error': hubo_error }">
					<i :class="icono_hero"></i>
				</div>
				<h4 class="provider-order-scan-ready-modal__hero-title">
					{{ titulo }}
				</h4>
				<span
				v-if="nombre_proveedor"
				class="provider-order-scan-ready-modal__chip"
				:title="nombre_proveedor">
					{{ nombre_proveedor }}
				</span>
			</div>

			<!--
				El aviso no muestra la tabla que leyó la IA, igual que el aviso del
				análisis de Excel: el usuario puede estar en medio de una venta cuando
				esto aparece, y revisar 40 renglones de una factura no es algo que se
				haga de costado. Solo se le dice que está listo y se le ofrece ir a
				verlo cuando pueda.
			-->
			<p class="provider-order-scan-ready-modal__texto">
				{{ texto }}
			</p>

			<!--
				Los dos caminos que pidió Lucas, uno al lado del otro y sin ambigüedad:
				"Revisar ahora" abre la revisión de este escaneo de una, y "Después" lo
				deja pendiente para más tarde. No son dos formas de lo mismo: el de la
				izquierda resuelve el escaneo ahora; el de la derecha lo posterga, y lo
				que lo recupera después es el botón rojo de la fila de esa compra.
			-->
			<div class="buttons j-center">
				<b-button
				v-if="!hubo_error"
				variant="primary"
				class="m-r-15"
				@click="revisar_ahora">
					Revisar ahora
				</b-button>
				<b-button
				:variant="hubo_error ? 'primary' : 'outline-secondary'"
				@click="descartar">
					{{ hubo_error ? 'Entendido' : 'Después' }}
				</b-button>
			</div>

			<p
			v-if="!hubo_error"
			class="provider-order-scan-ready-modal__pie">
				Si elegís «Después», la compra queda con el botón rojo «Revisar escaneo»
				prendido en el listado de compras.
			</p>

		</div>
	</b-modal>
</template>
<script>
/*
 * Aviso de que terminó de correr un escaneo de factura de compra en segundo plano.
 *
 * Llega por broadcast (GlobalNotification con notification_modal
 * 'provider_order_scan_ready') o lo levanta start_methods al iniciar la SPA, cuando el
 * broadcast pasó mientras el usuario no estaba conectado.
 *
 * Molde: ExcelAnalysisReadyModal.vue. Su única responsabilidad es avisar y ofrecer los
 * dos pasos siguientes posibles: revisar el escaneo ahora mismo, o dejarlo para después.
 * Todo lo caro —traer el resultado del escaneo y armar la tabla de revisión— pasa recién
 * si el usuario elige revisarlo.
 *
 * 🔴 Además refresca los pendientes cuando llega el aviso: el botón rojo de la compra
 * se enciende con lo que dice el servidor, y este es el momento en que ese hecho
 * cambió. Sin este refresco, el usuario tendría que recargar la SPA para verlo.
 */
export default {
	computed: {
		/*
		 * Datos del escaneo terminado:
		 * { uuid, provider_order_id, estado, error, cantidad_articulos, provider_nombre }.
		 * A propósito NO trae el `resultado`.
		 */
		provider_order_scan() {
			return this.$store.state.global_notification.provider_order_scan || {}
		},
		hubo_error() {
			return this.provider_order_scan.estado === 'error'
		},
		nombre_proveedor() {
			return this.provider_order_scan.provider_nombre || ''
		},
		cantidad_articulos() {
			return this.provider_order_scan.cantidad_articulos || 0
		},
		icono_hero() {
			if (this.hubo_error) {
				return 'bi bi-exclamation-triangle'
			}
			return 'bi bi-stars'
		},
		titulo() {
			if (this.hubo_error) {
				return 'No se pudo leer la factura'
			}
			return 'Terminó el escaneo de la factura'
		},
		texto() {
			if (this.hubo_error) {
				/* El mensaje del backend suele decir qué pasó con las fotos; si no vino, algo genérico. */
				return this.provider_order_scan.error || 'Volvé a sacar la foto o avisanos si sigue pasando.'
			}

			if (this.cantidad_articulos) {
				return 'Se detectaron ' + this.cantidad_articulos + ' artículos. Revisalos y corregí lo que haga falta antes de cargarlos en la compra.'
			}

			return 'Ya podés revisar lo que leyó la IA antes de cargarlo en la compra.'
		},
	},
	watch: {
		/*
		 * Cuando llega un aviso nuevo se vuelven a pedir los escaneos pendientes: es lo
		 * que enciende el botón rojo de esa compra en el listado. Va acá y no en
		 * broadcast.js, que está copiado entre proyectos y no tiene por qué saber de
		 * este store.
		 */
		provider_order_scan(nuevo) {
			if (nuevo && nuevo.uuid) {
				this.$store.dispatch('provider_order_scan/get_pendientes')
			}
		},
	},
	methods: {
		/*
		 * Abre la revisión de ESTE escaneo, de un clic, sin pasar por buscar la fila en
		 * el listado.
		 *
		 * 🔴 El orden importa y es el mismo del aviso del análisis de Excel: PRIMERO se
		 * deja la orden en el store y DESPUÉS se navega. El modal de revisión es lazy y
		 * vive adentro del listado de compras, así que cuando corre esto casi nunca está
		 * montado: la orden queda esperándolo y la levanta en su created(). Si el usuario
		 * nunca se fue de compras y el modal ya estaba montado, la agarra por su watch.
		 * Al revés —navegar y después dejar la orden— el created() ya pasó y no abre nada.
		 */
		revisar_ahora() {
			const escaneo = this.provider_order_scan

			this.$store.commit('provider_order_scan/set_abrir_en', {
				uuid: escaneo.uuid,
				provider_order_id: escaneo.provider_order_id,
			})

			this.$store.dispatch('provider_order_scan/marcar_visto', escaneo.uuid)
			this.$store.dispatch('provider_order_scan/get_pendientes')

			this.$bvModal.hide('provider-order-scan-ready-notification')

			/*
			 * El catch se come el NavigationDuplicated de cuando el usuario ya estaba
			 * parado en compras, que no es un error sino el caso más común.
			 */
			this.$router.push({ name: 'provider', params: { view: 'compras' } }).catch(() => {})
		},
		/*
		 * "Después" / "Entendido": el usuario ya se enteró, que es todo lo que registra
		 * visto_at. 🔴 Visto NO es gestionado: el botón rojo del listado sigue prendido
		 * hasta que confirme o descarte el escaneo. Esta es la mitad "lo hago después"
		 * de lo que pidió Lucas; la otra mitad es "Revisar ahora".
		 */
		descartar() {
			this.$store.dispatch('provider_order_scan/marcar_visto', this.provider_order_scan.uuid)
			this.$bvModal.hide('provider-order-scan-ready-notification')
		},
		/*
		 * Cerrar con ESC o clic afuera cuenta como descartar: si no marcáramos visto, el
		 * mismo aviso volvería en la próxima carga de la SPA.
		 */
		on_hidden() {
			if (this.provider_order_scan.uuid) {
				this.$store.dispatch('provider_order_scan/marcar_visto', this.provider_order_scan.uuid)
			}
		},
	},
}
</script>
<style lang="sass">
.provider-order-scan-ready-modal
	padding: 8px 4px

	&__hero
		display: flex
		flex-direction: column
		align-items: center
		text-align: center
		gap: 10px
		margin-bottom: 16px

	&__hero-icon
		width: 56px
		height: 56px
		border-radius: 16px
		display: flex
		align-items: center
		justify-content: center
		font-size: 1.6rem
		background: rgba(37, 99, 235, 0.12)
		color: #2563eb

		&--error
			background: rgba(220, 38, 38, 0.12)
			color: #dc2626

	&__hero-title
		margin: 0
		font-weight: 700

	&__chip
		display: inline-block
		padding: 4px 12px
		border-radius: 999px
		background: rgba(100, 116, 139, 0.1)
		color: #475569
		font-size: 0.8rem
		font-weight: 500
		// Mismo motivo que en el aviso del análisis de Excel: una razón social larga
		// dentro de un border-radius de 999px queda deforme si envuelve.
		max-width: 100%
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__texto
		text-align: center
		color: #475569
		margin-bottom: 24px

	// Aclara qué pasa si elige "Después". Va abajo de los botones y no arriba: es la
	// letra chica de una decisión que ya está tomada, no algo que haya que leer antes.
	&__pie
		text-align: center
		color: #64748b
		font-size: 0.78rem
		margin: 16px 0 0 0

html.dark-mode .provider-order-scan-ready-modal
	&__texto,
	&__pie
		color: var(--color-text-secondary)
</style>
