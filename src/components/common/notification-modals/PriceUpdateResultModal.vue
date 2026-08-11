<template>
	<b-modal
	id="price-update-result-notification"
	size="md"
	hide-footer
	hide-header
	centered
	@hidden="on_hidden"
	@shown="on_shown">
		<div class="price-update-result-modal">

			<!-- Heroe: que paso y por que. El chip del origen es la mitad del valor de este
			     modal: al usuario le movieron los precios de todo el catalogo y tiene que
			     saber que fue lo que lo disparo. -->
			<div class="price-update-result-modal__hero">
				<div
				class="price-update-result-modal__hero-icon"
				:class="{ 'price-update-result-modal__hero-icon--vacio': sin_cambios }">
					<i :class="icono_hero"></i>
				</div>
				<h4 class="price-update-result-modal__hero-title">
					{{ titulo }}
				</h4>
				<span
				v-if="origen_texto"
				class="price-update-result-modal__chip">
					{{ origen_texto }}
				</span>
			</div>

			<!-- Estado vacio: no es un error, es "se reviso y no cambio nada". -->
			<div
			v-if="sin_cambios"
			class="price-update-result-modal__vacio">
				<p class="price-update-result-modal__vacio-texto">
					Se revisaron los precios y ninguno cambió. Los valores que tenías siguen siendo
					los correctos con la configuración nueva.
				</p>
			</div>

			<template v-else>
				<!-- El numero grande, contando desde 0. -->
				<div class="price-update-result-modal__numero">
					<span class="price-update-result-modal__numero-valor">{{ numero_animado }}</span>
					<span class="price-update-result-modal__numero-label">
						{{ articulos_actualizados === 1 ? 'artículo cambió de precio' : 'artículos cambiaron de precio' }}
					</span>
				</div>

				<div class="price-update-result-modal__proveedores">
					<p class="price-update-result-modal__proveedores-titulo">
						{{ texto_proveedores }}
					</p>

					<p
					v-if="cargando_proveedores"
					class="price-update-result-modal__aviso">
						Cargando los proveedores...
					</p>

					<p
					v-else-if="error_proveedores"
					class="price-update-result-modal__error">
						No se pudo cargar la lista de proveedores. Los precios igual se actualizaron.
					</p>

					<ul
					v-else-if="proveedores.length"
					class="price-update-result-modal__lista">
						<li
						v-for="nombre in proveedores"
						:key="nombre"
						class="price-update-result-modal__item"
						:title="nombre">
							{{ nombre }}
						</li>
					</ul>
				</div>
			</template>

			<div class="price-update-result-modal__acciones">
				<b-button
				variant="primary"
				@click="aceptar">
					Aceptar
				</b-button>
			</div>
		</div>
	</b-modal>
</template>
<script>
import global_notification_functions from '@/mixins/global_notification_functions'

/**
 * Modal de resultado del recálculo de precios.
 *
 * Hermano del de resultado de importación: mismo mecanismo (notification_modal en el
 * broadcast → id de b-modal) y misma nomenclatura BEM. Muestra cuántos artículos cambiaron
 * de precio, de cuántos proveedores, y los nombres de esos proveedores — sin conteos por
 * proveedor y sin categorías (decisión de Lucas, 11/8/2026).
 */
export default {
	mixins: [global_notification_functions],
	data() {
		return {
			/** Valor que se ve mientras corre la animación de conteo. */
			numero_animado: 0,
			/** id del requestAnimationFrame en curso, para poder cancelarlo al cerrar. */
			animacion_id: null,
			cargando_proveedores: false,
			error_proveedores: false,
			/** Nombres traídos del endpoint. */
			proveedores: [],
			/**
			 * Corrida que pidió la lista que está en vuelo.
			 *
			 * Sin esto, cerrar el modal mientras carga y abrirlo de nuevo con otra corrida
			 * mostraba los proveedores de la corrida anterior: el .then de la respuesta vieja
			 * llegaba después y escribía igual.
			 */
			run_id_pedido: null,
		}
	},
	computed: {
		price_stats() {
			return this.$store.state.global_notification.price_stats || {}
		},
		articulos_actualizados() {
			return this.price_stats.articulos_actualizados || 0
		},
		sin_cambios() {
			return !!this.price_stats.sin_cambios
		},
		origen_texto() {
			return this.price_stats.origen_texto || ''
		},
		titulo() {
			if (this.sin_cambios) {
				return 'No cambió ningún precio'
			}
			return 'Precios actualizados'
		},
		icono_hero() {
			if (this.sin_cambios) {
				return 'bi bi-check2-circle'
			}
			return 'bi bi-graph-up-arrow'
		},
		/**
		 * Mientras la lista no llegó vale el número del broadcast; cuando llega manda la
		 * lista. Así el encabezado nunca dice un número distinto al de los nombres que se
		 * ven abajo, que es lo que el usuario lee como un error.
		 *
		 * @return {Number}
		 */
		proveedores_cantidad() {
			if (this.proveedores.length) {
				return this.proveedores.length
			}
			return this.price_stats.proveedores_cantidad || 0
		},
		texto_proveedores() {
			if (this.proveedores_cantidad === 1) {
				return 'Se actualizaron precios de 1 proveedor'
			}
			return 'Se actualizaron precios de ' + this.proveedores_cantidad + ' proveedores'
		},
	},
	methods: {
		/**
		 * Cuenta desde 0 hasta el total con requestAnimationFrame.
		 *
		 * Se guarda el id para cancelarlo en on_hidden: sin eso, cerrar el modal a mitad de
		 * la animación deja el frame pendiente escribiendo sobre un componente que ya no se
		 * está mirando.
		 *
		 * @return {void}
		 */
		animar_numero() {
			this.cancelar_animacion()

			let destino = this.articulos_actualizados

			if (destino <= 0) {
				this.numero_animado = 0
				return
			}

			let duracion = 600
			let inicio = null
			let self = this

			let paso = function (marca_de_tiempo) {
				if (inicio === null) {
					inicio = marca_de_tiempo
				}

				let avance = (marca_de_tiempo - inicio) / duracion

				if (avance >= 1) {
					self.numero_animado = destino
					self.animacion_id = null
					return
				}

				// Desaceleración al final: el número frena en vez de cortarse de golpe.
				let suavizado = 1 - Math.pow(1 - avance, 3)
				self.numero_animado = Math.round(destino * suavizado)
				self.animacion_id = window.requestAnimationFrame(paso)
			}

			this.animacion_id = window.requestAnimationFrame(paso)
		},
		cancelar_animacion() {
			if (this.animacion_id !== null) {
				window.cancelAnimationFrame(this.animacion_id)
				this.animacion_id = null
			}
		},
		/**
		 * Trae los nombres de los proveedores. El broadcast sólo puede llevar números: el
		 * límite de Pusher son 10 KB y pasarse significa que la notificación no llega.
		 *
		 * @return {void}
		 */
		cargar_proveedores() {
			let run_id = this.price_stats.run_id

			if (!run_id || this.sin_cambios) {
				return
			}

			this.run_id_pedido = run_id
			this.cargando_proveedores = true
			this.error_proveedores = false

			this.$api.get('price-update-run/' + run_id + '/desglose')
			.then(res => {
				/* Llegó tarde: el modal ya se cerró, o ya está mostrando otra corrida. */
				if (this.run_id_pedido !== run_id) {
					return
				}

				this.proveedores = res.data.proveedores || []
				this.cargando_proveedores = false
			})
			.catch(() => {
				if (this.run_id_pedido !== run_id) {
					return
				}

				this.error_proveedores = true
				this.cargando_proveedores = false
			})
		},
		on_shown() {
			this.animar_numero()
			this.cargar_proveedores()
		},
		on_hidden() {
			this.cancelar_animacion()
			this.numero_animado = 0
			this.proveedores = []
			this.cargando_proveedores = false
			this.error_proveedores = false
			this.run_id_pedido = null
		},
		/**
		 * Reusa la función que ya existe para el modal de importación: refresca artículos,
		 * categorías y proveedores.
		 *
		 * @return {void}
		 */
		aceptar() {
			this.update_articles_after_import()
			this.$bvModal.hide('price-update-result-notification')
		},
	},
	beforeDestroy() {
		this.cancelar_animacion()
	},
}
</script>
<style lang="sass">
.price-update-result-modal
	padding: 8px 4px

	&__hero
		display: flex
		flex-direction: column
		align-items: center
		text-align: center
		gap: 10px
		margin-bottom: 20px

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

		&--vacio
			background: rgba(100, 116, 139, 0.12)
			color: #64748b

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

	&__numero
		display: flex
		flex-direction: column
		align-items: center
		margin-bottom: 24px

	&__numero-valor
		font-size: 3rem
		font-weight: 800
		line-height: 1
		color: #2563eb

	&__numero-label
		font-size: 0.9rem
		color: #64748b
		margin-top: 4px

	&__proveedores
		text-align: center

	&__proveedores-titulo
		font-size: 0.9rem
		font-weight: 600
		color: #334155
		margin: 0 0 10px 0

	&__lista
		list-style: none
		margin: 0
		padding: 0
		max-height: 220px
		overflow-y: auto
		border-top: 1px solid rgba(148, 163, 184, 0.25)

	&__item
		padding: 7px 10px
		font-size: 0.85rem
		color: #334155
		border-bottom: 1px solid rgba(148, 163, 184, 0.18)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__aviso
		font-size: 0.8rem
		color: #94a3b8
		margin: 0

	&__error
		font-size: 0.8rem
		color: #c82333
		margin: 0

	&__vacio
		text-align: center
		margin-bottom: 20px

	&__vacio-texto
		color: #64748b
		margin: 0

	&__acciones
		display: flex
		justify-content: center
		margin-top: 24px
</style>
