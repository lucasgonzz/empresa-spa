<template>
	<b-modal
	id="price-update-result-notification"
	size="lg"
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

				<div class="price-update-result-modal__listas">
					<!-- Proveedores -->
					<div class="price-update-result-modal__lista">
						<h6 class="price-update-result-modal__lista-titulo">Por proveedor</h6>
						<div
						v-for="(item, index) in proveedores_visibles"
						:key="'prov-' + index"
						class="price-update-result-modal__fila"
						:style="estilo_fila(index)">
							<span class="price-update-result-modal__fila-nombre" :title="item.nombre">
								{{ item.nombre }}
							</span>
							<div class="price-update-result-modal__barra-carril">
								<div
								class="price-update-result-modal__barra"
								:style="estilo_barra(item.cantidad, maximo_proveedores)"></div>
							</div>
							<span class="price-update-result-modal__fila-cantidad">{{ item.cantidad }}</span>
						</div>

						<p
						v-if="proveedores.otros_grupos > 0 && !proveedores_expandidos"
						class="price-update-result-modal__restantes">
							y {{ proveedores.otros_cantidad }} artículos más en otros
							{{ proveedores.otros_grupos }}
							{{ proveedores.otros_grupos === 1 ? 'proveedor' : 'proveedores' }}
						</p>

						<b-button
						v-if="proveedores.otros_grupos > 0 && !proveedores_expandidos"
						size="sm"
						variant="link"
						:disabled="cargando_proveedores"
						@click="ver_restantes('provider')">
							{{ cargando_proveedores ? 'Cargando...' : 'Ver los ' + proveedores.total_grupos + ' proveedores' }}
						</b-button>

						<p
						v-if="error_proveedores"
						class="price-update-result-modal__error">
							No se pudo cargar el detalle. Probá de nuevo en un momento.
						</p>
					</div>

					<!-- Categorias -->
					<div class="price-update-result-modal__lista">
						<h6 class="price-update-result-modal__lista-titulo">Por categoría</h6>
						<div
						v-for="(item, index) in categorias_visibles"
						:key="'cat-' + index"
						class="price-update-result-modal__fila"
						:style="estilo_fila(index)">
							<span class="price-update-result-modal__fila-nombre" :title="item.nombre">
								{{ item.nombre }}
							</span>
							<div class="price-update-result-modal__barra-carril">
								<div
								class="price-update-result-modal__barra price-update-result-modal__barra--categoria"
								:style="estilo_barra(item.cantidad, maximo_categorias)"></div>
							</div>
							<span class="price-update-result-modal__fila-cantidad">{{ item.cantidad }}</span>
						</div>

						<p
						v-if="categorias.otros_grupos > 0 && !categorias_expandidas"
						class="price-update-result-modal__restantes">
							y {{ categorias.otros_cantidad }} artículos más en otras
							{{ categorias.otros_grupos }}
							{{ categorias.otros_grupos === 1 ? 'categoría' : 'categorías' }}
						</p>

						<b-button
						v-if="categorias.otros_grupos > 0 && !categorias_expandidas"
						size="sm"
						variant="link"
						:disabled="cargando_categorias"
						@click="ver_restantes('category')">
							{{ cargando_categorias ? 'Cargando...' : 'Ver las ' + categorias.total_grupos + ' categorías' }}
						</b-button>

						<p
						v-if="error_categorias"
						class="price-update-result-modal__error">
							No se pudo cargar el detalle. Probá de nuevo en un momento.
						</p>
					</div>
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
 * broadcast → id de b-modal), misma nomenclatura BEM, y el mismo criterio de traer sólo el
 * top en el payload y pedir el resto por endpoint.
 */
export default {
	mixins: [global_notification_functions],
	data() {
		return {
			/** Valor que se ve mientras corre la animación de conteo. */
			numero_animado: 0,
			/** id del requestAnimationFrame en curso, para poder cancelarlo al cerrar. */
			animacion_id: null,
			proveedores_expandidos: false,
			categorias_expandidas: false,
			cargando_proveedores: false,
			cargando_categorias: false,
			error_proveedores: false,
			error_categorias: false,
			/** Listas completas traídas del endpoint; pisan a las del broadcast. */
			proveedores_completos: null,
			categorias_completas: null,
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
		proveedores() {
			return this.price_stats.proveedores || { items: [], otros_cantidad: 0, otros_grupos: 0, total_grupos: 0 }
		},
		categorias() {
			return this.price_stats.categorias || { items: [], otros_cantidad: 0, otros_grupos: 0, total_grupos: 0 }
		},
		proveedores_visibles() {
			if (this.proveedores_completos) {
				return this.proveedores_completos
			}
			return this.proveedores.items || []
		},
		categorias_visibles() {
			if (this.categorias_completas) {
				return this.categorias_completas
			}
			return this.categorias.items || []
		},
		/** La barra más larga es la del grupo más grande; el resto se mide contra esa. */
		maximo_proveedores() {
			return this.maximo_de(this.proveedores_visibles)
		},
		maximo_categorias() {
			return this.maximo_de(this.categorias_visibles)
		},
	},
	methods: {
		/**
		 * @param {Array} items
		 * @return {Number}
		 */
		maximo_de(items) {
			let maximo = 0

			items.forEach(item => {
				if (item.cantidad > maximo) {
					maximo = item.cantidad
				}
			})

			if (maximo === 0) {
				return 1
			}

			return maximo
		},
		/**
		 * Ancho de la barra, en porcentaje del grupo más grande.
		 *
		 * @param {Number} cantidad
		 * @param {Number} maximo
		 * @return {Object}
		 */
		estilo_barra(cantidad, maximo) {
			return {
				width: Math.round((cantidad / maximo) * 100) + '%',
			}
		},
		/**
		 * Retardo escalonado por fila: las barras entran una atrás de la otra en vez de
		 * todas juntas, que es lo que hace que se lea como un gráfico y no como un salto.
		 *
		 * @param {Number} index
		 * @return {Object}
		 */
		estilo_fila(index) {
			return {
				'animation-delay': (index * 40) + 'ms',
			}
		},
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
		 * Trae el desglose completo del endpoint. El broadcast sólo puede llevar el top: el
		 * límite de Pusher son 10 KB y pasarse significa que la notificación no llega.
		 *
		 * @param {String} tipo 'provider' | 'category'
		 * @return {void}
		 */
		ver_restantes(tipo) {
			let run_id = this.price_stats.run_id

			if (!run_id) {
				return
			}

			let es_proveedor = tipo === 'provider'

			if (es_proveedor) {
				this.cargando_proveedores = true
				this.error_proveedores = false
			} else {
				this.cargando_categorias = true
				this.error_categorias = false
			}

			this.$api.get('price-update-run/' + run_id + '/desglose?tipo=' + tipo + '&limit=50')
			.then(res => {
				if (es_proveedor) {
					this.proveedores_completos = res.data.items || []
					this.proveedores_expandidos = true
					this.cargando_proveedores = false
				} else {
					this.categorias_completas = res.data.items || []
					this.categorias_expandidas = true
					this.cargando_categorias = false
				}
			})
			.catch(err => {
				console.log(err)

				if (es_proveedor) {
					this.error_proveedores = true
					this.cargando_proveedores = false
				} else {
					this.error_categorias = true
					this.cargando_categorias = false
				}
			})
		},
		on_shown() {
			this.animar_numero()
		},
		on_hidden() {
			this.cancelar_animacion()
			this.numero_animado = 0
			this.proveedores_expandidos = false
			this.categorias_expandidas = false
			this.proveedores_completos = null
			this.categorias_completas = null
			this.error_proveedores = false
			this.error_categorias = false
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

	&__listas
		display: flex
		flex-direction: row
		gap: 24px

		@media screen and (max-width: 768px)
			flex-direction: column

	&__lista
		flex: 1
		min-width: 0

	&__lista-titulo
		font-size: 0.72rem
		font-weight: 700
		text-transform: uppercase
		letter-spacing: 0.05em
		color: #94a3b8
		margin-bottom: 12px

	&__fila
		display: flex
		align-items: center
		gap: 10px
		margin-bottom: 8px
		opacity: 0
		animation: price-update-fila-entra 0.35s ease forwards

	&__fila-nombre
		flex: 0 0 38%
		font-size: 0.82rem
		color: #334155
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__barra-carril
		flex: 1
		height: 8px
		border-radius: 999px
		background: rgba(148, 163, 184, 0.18)
		overflow: hidden
		min-width: 0

	&__barra
		height: 100%
		border-radius: 999px
		background: #2563eb
		transform-origin: left center
		animation: price-update-barra-crece 0.45s ease forwards

		&--categoria
			background: #7c3aed

	&__fila-cantidad
		flex: 0 0 auto
		font-size: 0.82rem
		font-weight: 700
		color: #334155
		min-width: 32px
		text-align: right

	&__restantes
		font-size: 0.78rem
		color: #94a3b8
		margin: 8px 0 0 0

	&__error
		font-size: 0.78rem
		color: #c82333
		margin: 8px 0 0 0

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

@keyframes price-update-fila-entra
	from
		opacity: 0
		transform: translateY(6px)
	to
		opacity: 1
		transform: translateY(0)

@keyframes price-update-barra-crece
	from
		transform: scaleX(0)
	to
		transform: scaleX(1)
</style>
