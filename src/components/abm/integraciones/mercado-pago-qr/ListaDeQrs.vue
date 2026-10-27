<template>
	<!-- Los QRs creados: cada uno se descarga para imprimir y dejar en su mostrador -->
	<div class="mercado-pago-qr-lista">
		<div class="mercado-pago-qr-lista__encabezado">
			<p class="mercado-pago-qr__label m-b-0">Tus QR</p>
			<b-button
			v-if="puede_crear"
			size="sm"
			variant="primary"
			data-testid="mercado-pago-qr-crear"
			@click="$emit('crear')">
				<i class="bi bi-plus-lg"></i>
				Crear QR
			</b-button>
		</div>

		<p
		v-if="!qrs.length"
		class="mercado-pago-qr-lista__vacio">
			Todavía no creaste ningún QR. Creá uno por cada caja donde cobres (o uno general para todo el
			negocio), imprimilo y dejalo en el mostrador.
		</p>

		<ul
		v-else
		class="mercado-pago-qr-lista__items">
			<li
			v-for="qr in qrs"
			:key="qr.id"
			class="mercado-pago-qr-lista__item"
			:class="{ 'mercado-pago-qr-lista__item--inactivo': !qr.activo }"
			data-testid="mercado-pago-qr-item">
				<img
				v-if="qr.qr_image_url"
				:src="qr.qr_image_url"
				:alt="'Código QR ' + qr.name"
				class="mercado-pago-qr-lista__miniatura">
				<div
				v-else
				class="mercado-pago-qr-lista__miniatura mercado-pago-qr-lista__miniatura--vacia">
					<i class="bi bi-qr-code"></i>
				</div>

				<div class="mercado-pago-qr-lista__texto">
					<strong class="mercado-pago-qr-lista__nombre">{{ qr.name }}</strong>
					<span class="mercado-pago-qr-lista__dato">
						{{ qr.caja_id ? 'Caja: ' + (qr.caja_name || qr.caja_id) : 'General (sin caja)' }}
					</span>
					<span
					v-if="qr.address_id"
					class="mercado-pago-qr-lista__dato">
						Sucursal: {{ qr.address_name || qr.address_id }}
					</span>
					<b-badge
					v-if="!qr.activo"
					variant="warning"
					class="mercado-pago-qr-lista__badge">De otra cuenta de Mercado Pago</b-badge>
				</div>

				<div class="mercado-pago-qr-lista__acciones">
					<b-button
					v-if="qr.qr_template_url || qr.qr_image_url"
					size="sm"
					variant="outline-primary"
					@click="descargar(qr)">
						<i class="bi bi-printer"></i>
						Descargar para imprimir
					</b-button>
					<b-button
					size="sm"
					variant="outline-danger"
					:disabled="eliminando_id == qr.id"
					@click="eliminar(qr)">
						<b-spinner
						v-if="eliminando_id == qr.id"
						small></b-spinner>
						Eliminar
					</b-button>
				</div>
			</li>
		</ul>
	</div>
</template>
<script>
import mercado_pago_qr from '@/mixins/mercado_pago_qr'

/**
 * Lista de QRs del cobro en el mostrador.
 *
 * "Descargar para imprimir" abre en otra pestaña la plantilla que arma Mercado Pago (o la imagen
 * sola si no hay plantilla). "Eliminar" pide confirmación y lo da de baja (también en Mercado
 * Pago). Los QR de otra cuenta de Mercado Pago (se conectó otra cuenta después de crearlos) quedan
 * marcados: ya no cobran.
 */
export default {
	name: 'MercadoPagoQrListaDeQrs',
	mixins: [mercado_pago_qr],
	props: {
		// QRs con la forma `QrCaja` del contrato
		qrs: {
			type: Array,
			default: () => [],
		},
		// Si se muestra el botón "Crear QR" (hace falta Mercado Pago conectado)
		puede_crear: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			// Id del QR que se está eliminando (para el spinner de su botón)
			eliminando_id: null,
		}
	},
	methods: {
		/**
		 * Abre el QR para imprimir en una pestaña nueva.
		 *
		 * @param {Object} qr
		 * @returns {void}
		 */
		descargar(qr) {
			let url = qr.qr_template_url || qr.qr_image_url
			if (url) {
				window.open(url, '_blank', 'noopener')
			}
		},

		/**
		 * Elimina un QR, previa confirmación.
		 *
		 * @param {Object} qr
		 * @returns {void}
		 */
		eliminar(qr) {
			let self = this
			this.$bvModal.msgBoxConfirm(
				'Si eliminás el QR "' + qr.name + '", el que tengas impreso deja de cobrar. ¿Lo eliminamos?',
				{
					title: 'Eliminar QR',
					okTitle: 'Eliminar',
					okVariant: 'danger',
					cancelTitle: 'Cancelar',
				}
			).then(confirmado => {
				if (!confirmado) {
					return
				}

				self.eliminando_id = qr.id
				self.$store.commit('auth/setMessage', 'Eliminando el QR')
				self.$store.commit('auth/setLoading', true)

				self.qr_eliminar_qr(qr.id)
				.then(() => {
					self.eliminando_id = null
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.$toast.success('QR eliminado')
					self.$emit('eliminado', qr.id)
				})
				.catch(err => {
					self.eliminando_id = null
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					console.log(err)
					self.$toast.error(self.qr_mensaje_de_error(err, 'No se pudo eliminar el QR'))
				})
			})
		},
	},
}
</script>
<style lang="sass">
.mercado-pago-qr-card
	.mercado-pago-qr-lista
		margin-top: 20px
		padding-top: 16px
		border-top: 1px solid var(--color-border-secondary)

	.mercado-pago-qr-lista__encabezado
		display: flex
		justify-content: space-between
		align-items: center
		gap: 10px
		margin-bottom: 10px

		.btn
			display: inline-flex
			align-items: center
			gap: 4px

	.mercado-pago-qr-lista__vacio
		margin: 0
		font-size: 13px
		line-height: 1.5
		color: var(--color-text-secondary)

	.mercado-pago-qr-lista__items
		list-style: none
		margin: 0
		padding: 0

	.mercado-pago-qr-lista__item
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 12px
		padding: 10px 0
		border-top: 1px solid var(--color-border-secondary)

		&:first-child
			border-top: 0

	.mercado-pago-qr-lista__item--inactivo
		.mercado-pago-qr-lista__miniatura
			opacity: .5

	// El QR se ve sobre blanco siempre, también en modo oscuro: si no, no se puede escanear
	.mercado-pago-qr-lista__miniatura
		width: 64px
		height: 64px
		flex-shrink: 0
		object-fit: contain
		padding: 4px
		background: #fff
		border: 1px solid var(--color-border)
		border-radius: 8px

	.mercado-pago-qr-lista__miniatura--vacia
		display: flex
		align-items: center
		justify-content: center
		font-size: 28px
		color: #6c757d

	.mercado-pago-qr-lista__texto
		display: flex
		flex-direction: column
		flex: 1
		min-width: 140px
		font-size: 13px
		color: var(--color-text-primary)

	.mercado-pago-qr-lista__nombre
		font-size: 14px

	.mercado-pago-qr-lista__dato
		color: var(--color-text-secondary)

	.mercado-pago-qr-lista__badge
		align-self: flex-start
		margin-top: 4px

	.mercado-pago-qr-lista__acciones
		display: flex
		flex-wrap: wrap
		gap: 6px

		.btn
			display: inline-flex
			align-items: center
			gap: 4px

// En el teléfono los botones de cada QR bajan abajo de la miniatura, a todo el ancho
@media (max-width: 575px)
	.mercado-pago-qr-card
		.mercado-pago-qr-lista__acciones
			width: 100%

			.btn
				flex: 1
				justify-content: center
</style>
