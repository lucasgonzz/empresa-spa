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
				class="price-update-result-modal__chip"
				:title="origen_texto">
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
					<!-- Con la lista vacia el encabezado no cuenta nada: "37 articulos" arriba
					     de "0 proveedores" son dos numeros que no cierran entre si. -->
					<p
					v-if="!lista_vacia"
					class="price-update-result-modal__proveedores-titulo">
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

					<!-- La lista llego vacia: puede pasar si los articulos que cambiaron se
					     borraron entre que cerro la corrida y se abrio el modal. Sin esto
					     quedaba el titulo colgado, sin lista y sin explicacion. -->
					<p
					v-else-if="proveedores_cargados"
					class="price-update-result-modal__aviso">
						No quedaron proveedores para mostrar.
					</p>
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
			 * Si la respuesta del endpoint ya llegó.
			 *
			 * No alcanza con mirar si la lista tiene elementos: una lista vacía que ya llegó
			 * y una que todavía no llegó se muestran distinto, y el encabezado tiene que
			 * decir 0 en la primera en vez de seguir mostrando el número del broadcast.
			 */
			proveedores_cargados: false,
			/**
			 * Si el modal está a la vista.
			 *
			 * Lo necesita el watch de run_id para distinguir la apertura normal (donde el
			 * trabajo lo hace on_shown) de una notificación que llega con el modal ya
			 * abierto (donde on_shown no se dispara nunca).
			 */
			visible: false,
			/**
			 * Número del pedido de la lista que vale. Cada pedido nuevo lo incrementa y las
			 * respuestas viejas se descartan comparando contra él.
			 *
			 * Se cuenta por pedido y no por corrida a propósito: cerrar el modal justo cuando
			 * llega otra notificación puede dejar dos pedidos en vuelo de LA MISMA corrida, y
			 * si el primero falla y el segundo anda, el cartel de error del primero se queda
			 * pegado arriba de una lista que sí llegó. Comparando ids de corrida eso no se
			 * puede distinguir; comparando pedidos, sí.
			 */
			pedido_en_curso: 0,
		}
	},
	computed: {
		price_stats() {
			return this.$store.state.global_notification.price_stats || {}
		},
		/** Corrida que el modal está mostrando ahora mismo. */
		run_id() {
			return this.price_stats.run_id || null
		},
		articulos_actualizados() {
			return this.price_stats.articulos_actualizados || 0
		},
		sin_cambios() {
			return !!this.price_stats.sin_cambios
		},
		/**
		 * El chip que dice por qué se recalculó. Con el detalle pegado cuando lo hay: saber
		 * que fue "por un cambio en un tipo de precio" sirve, pero saber en cuál sirve más, y
		 * el backend ya lo manda recortado justamente para esto.
		 *
		 * @return {String}
		 */
		origen_texto() {
			let texto = this.price_stats.origen_texto || ''

			if (texto && this.price_stats.origen_detalle) {
				texto += ': ' + this.price_stats.origen_detalle
			}

			return texto
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
			if (this.proveedores_cargados) {
				return this.proveedores.length
			}
			return this.price_stats.proveedores_cantidad || 0
		},
		/** La respuesta llegó y no trajo ni un proveedor. */
		lista_vacia() {
			return this.proveedores_cargados && this.proveedores.length === 0
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
			let run_id = this.run_id

			if (!run_id || this.sin_cambios) {
				return
			}

			this.pedido_en_curso++

			let pedido = this.pedido_en_curso

			this.cargando_proveedores = true
			this.error_proveedores = false

			this.$api.get('price-update-run/' + run_id + '/desglose')
			.then(res => {
				/* Llegó tarde: el modal se cerró, cambió de corrida, o volvió a pedir. */
				if (pedido !== this.pedido_en_curso) {
					return
				}

				this.proveedores = res.data.proveedores || []
				this.proveedores_cargados = true
				this.cargando_proveedores = false
			})
			.catch(() => {
				if (pedido !== this.pedido_en_curso) {
					return
				}

				this.error_proveedores = true
				this.cargando_proveedores = false
			})
		},
		/**
		 * Deja el modal como recién abierto: sin números, sin lista y sin nada en vuelo.
		 *
		 * @return {void}
		 */
		reiniciar() {
			this.cancelar_animacion()
			this.numero_animado = 0
			this.proveedores = []
			this.proveedores_cargados = false
			this.cargando_proveedores = false
			this.error_proveedores = false
			/* Invalida lo que esté en vuelo: su respuesta ya no tiene dónde ir. */
			this.pedido_en_curso++
		},
		/**
		 * Muestra la corrida que esté ahora en el store. Es lo que hace on_shown, pero
		 * llamable también con el modal ya abierto.
		 *
		 * @return {void}
		 */
		mostrar_corrida() {
			this.reiniciar()
			this.animar_numero()
			this.cargar_proveedores()
		},
		on_shown() {
			this.visible = true
			this.mostrar_corrida()
		},
		on_hidden() {
			this.visible = false
			this.reiniciar()
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
	watch: {
		/**
		 * 🔴 Otra corrida llegó con el modal ya abierto, que desde que cada disparo tiene su
		 * propia notificación es el caso NORMAL: dos recálculos seguidos mandan dos avisos.
		 *
		 * bootstrap-vue descarta el show() de un modal que ya está visible, así que el evento
		 * `shown` no se vuelve a emitir y on_shown no corre. Sin esto, el chip y el título
		 * pasaban a ser de la corrida nueva (son computed sobre el store) mientras el número
		 * grande y la lista de proveedores seguían siendo los de la anterior: el usuario veía
		 * un número que no era de ninguna de las dos, sin que nada fallara.
		 *
		 * @param {Number|null} run_id_nuevo
		 * @param {Number|null} run_id_anterior
		 * @return {void}
		 */
		run_id(run_id_nuevo) {
			/* Cerrado: lo que corresponda lo va a hacer on_shown cuando se abra. */
			if (!this.visible) {
				return
			}

			/*
			 * Una notificación global que no es de precios pisó el store y se llevó
			 * price_stats. Este modal ya no tiene qué mostrar: dejarlo abierto con los
			 * números viejos es peor que cerrarlo.
			 */
			if (!run_id_nuevo) {
				this.$bvModal.hide('price-update-result-notification')
				return
			}

			this.mostrar_corrida()
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
		// Con el detalle del origen pegado, el texto llega a ~170 caracteres. Sin tope se
		// blockifica y envuelve en tres lineas adentro de un border-radius de 999px: queda
		// una pildora deforme. El texto completo va en el title.
		max-width: 100%
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

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
