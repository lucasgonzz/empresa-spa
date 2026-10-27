<template>
	<div
	class="meli-form__seccion"
	data-testid="meli-estado-publicacion">
		<div class="meli-form__fila m-b-10">
			<p class="meli-form__titulo m-b-0">Publicación en Mercado Libre</p>
			<b-badge
			v-if="estado"
			:variant="estado_de_la_publicacion.variant"
			data-testid="meli-estado-badge">
				{{ estado_de_la_publicacion.text }}
			</b-badge>
		</div>

		<p
		v-if="!estado"
		class="meli-form__texto">
			{{ cargando ? 'Consultando el estado de la publicación…' : 'No se pudo consultar el estado de la publicación.' }}
		</p>

		<template v-else>
			<!-- Última sincronización: qué pasó la última vez que se mandó a Mercado Libre -->
			<p
			v-if="ultima_sync"
			class="meli-form__aviso"
			:class="clase_de_la_sincronizacion"
			data-testid="meli-ultima-sync">
				<strong>{{ texto_de_la_sincronizacion }}</strong>
				<span v-if="ultima_sync.error_message">
					<br>
					{{ ultima_sync.error_message }}
				</span>
			</p>

			<!-- Lo que falta para poder publicar (textos de la API) -->
			<div
			v-if="faltantes.length"
			class="meli-form__aviso meli-form__aviso--alerta"
			data-testid="meli-faltantes">
				<strong>Falta para publicar:</strong>
				<ul class="meli-form__lista">
					<li
					v-for="(faltante, index) in faltantes"
					:key="index">
						{{ faltante }}
					</li>
				</ul>
			</div>
			<p
			v-else-if="!estado.me_li_id"
			class="meli-form__aviso meli-form__aviso--ok">
				No falta nada para publicar. Guardá el artículo o tocá «Sincronizar ahora» para mandarlo a Mercado Libre.
			</p>

			<div class="meli-form__fila">
				<a
				v-if="estado.permalink"
				:href="estado.permalink"
				target="_blank"
				rel="noopener"
				class="btn btn-sm btn-outline-primary"
				data-testid="meli-ver-publicacion">
					Ver en Mercado Libre
				</a>
				<b-button
				size="sm"
				variant="primary"
				data-testid="meli-sincronizar-ahora"
				:disabled="sincronizar_deshabilitado"
				@click="sincronizar">
					{{ finalizada ? 'Publicar de nuevo' : 'Sincronizar ahora' }}
				</b-button>
				<b-button
				size="sm"
				variant="link"
				class="p-0"
				data-testid="meli-actualizar-estado"
				@click="cargar">
					Actualizar estado
				</b-button>
			</div>

			<!-- Por qué el botón está deshabilitado (un botón deshabilitado no muestra su title) -->
			<p
			v-if="sincronizar_deshabilitado"
			class="meli-form__texto m-t-10 m-b-0"
			data-testid="meli-sincronizar-ayuda">
				Para publicarlo, tildá «Disponible en Mercado Libre» y guardá el artículo.
			</p>
			<p
			v-else-if="finalizada"
			class="meli-form__texto m-t-10 m-b-0"
			data-testid="meli-publicar-de-nuevo-ayuda">
				Mercado Libre no deja reactivar una publicación finalizada: «Publicar de nuevo» la vuelve a publicar.
			</p>

			<p class="meli-form__texto m-t-10 m-b-0">
				Esto muestra lo que está guardado. Cada vez que guardás el artículo, el sistema lo actualiza solo en Mercado Libre.
			</p>
		</template>
	</div>
</template>
<script>
/**
 * Estado de la publicación del artículo en Mercado Libre (misión mercado-libre-integracion,
 * 27/10/2026). Parte de mercado-libre-form/Index.vue; solo para un artículo ya guardado.
 *
 * - `GET mercado-libre/articulo/{id}` → {estado: {me_li_id, permalink, meli_status, ultima_sync:
 *   {status, error_message, synced_at, attempted_at} | null, faltantes: [texto]}}.
 * - "Sincronizar ahora": `POST mercado-libre/articulo/{id}/sincronizar` → encola el artículo y
 *   devuelve el mismo `estado`. Deshabilitado si el formulario no tiene tildado "Disponible en
 *   Mercado Libre" y el artículo no está publicado. Con la publicación finalizada
 *   (`meli_status` closed) dice "Publicar de nuevo": la API la vuelve a publicar.
 *
 * `meli_status` es el estado de la publicación en Mercado Libre (active, paused, closed,
 * under_review, inactive...) y `ultima_sync.status` el de la cola del sistema (pendiente,
 * en_progreso, exitosa, error). Los estilos viven en mercado-libre-form/Index.vue.
 */
export default {
	name: 'MeliEstadoPublicacion',
	props: {
		article_id: {
			type: [Number, String],
			required: true,
		},
		// true si en el formulario está tildado "Disponible en Mercado Libre"
		disponible_en_ml: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			estado: null,
			cargando: false,
		}
	},
	computed: {
		ultima_sync() {
			return this.estado ? this.estado.ultima_sync : null
		},
		faltantes() {
			return this.estado && Array.isArray(this.estado.faltantes) ? this.estado.faltantes : []
		},
		// La publicación está finalizada en Mercado Libre: "Sincronizar ahora" la vuelve a publicar
		finalizada() {
			return !!(this.estado && this.estado.meli_status === 'closed')
		},
		/*
			Sin el tilde de "Disponible en Mercado Libre" y sin publicación, sincronizar no haría
			nada: se deshabilita y se explica abajo. Si ya está publicado y lo destildaron, queda
			habilitado: la API pausa la publicación.
		*/
		sincronizar_deshabilitado() {
			return !this.disponible_en_ml && !(this.estado && this.estado.me_li_id)
		},
		// Texto y color del estado de la publicación en Mercado Libre
		estado_de_la_publicacion() {
			if (!this.estado || !this.estado.me_li_id) {
				return { text: 'Sin publicar', variant: 'secondary' }
			}
			let estados = {
				active: { text: 'Publicada', variant: 'success' },
				paused: { text: 'Pausada', variant: 'warning' },
				closed: { text: 'Finalizada', variant: 'danger' },
				under_review: { text: 'En revisión de Mercado Libre', variant: 'warning' },
				inactive: { text: 'Inactiva', variant: 'secondary' },
				payment_required: { text: 'Mercado Libre pide un pago', variant: 'warning' },
				not_yet_active: { text: 'Todavía no activa', variant: 'secondary' },
			}
			return estados[this.estado.meli_status] || { text: 'Publicada', variant: 'info' }
		},
		// Qué pasó la última vez que se mandó a Mercado Libre
		texto_de_la_sincronizacion() {
			let sync = this.ultima_sync
			if (!sync) {
				return ''
			}
			if (sync.status == 'pendiente') {
				return 'En cola para mandarse a Mercado Libre.'
			}
			if (sync.status == 'en_progreso') {
				return 'Mandándose a Mercado Libre en este momento.'
			}
			if (sync.status == 'exitosa') {
				return 'Actualizada en Mercado Libre ' + this.since(sync.synced_at || sync.attempted_at) + '.'
			}
			if (sync.status == 'error') {
				return 'No se pudo actualizar en Mercado Libre (' + this.since(sync.attempted_at) + '):'
			}
			return 'Última sincronización: ' + sync.status
		},
		clase_de_la_sincronizacion() {
			let sync = this.ultima_sync
			if (sync && sync.status == 'error') {
				return 'meli-form__aviso--error'
			}
			if (sync && sync.status == 'exitosa') {
				return 'meli-form__aviso--ok'
			}
			return ''
		},
	},
	mounted() {
		this.cargar()
	},
	methods: {
		/**
		 * Consulta el estado de la publicación.
		 *
		 * @returns {void}
		 */
		cargar() {
			this.cargando = true
			this.$store.commit('auth/setMessage', 'Consultando la publicación en Mercado Libre')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('mercado-libre/articulo/' + this.article_id, {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.cargando = false
				this.estado = res.data.estado || null
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.cargando = false
				console.log(err)
			})
		},

		/**
		 * Manda el artículo a la cola de Mercado Libre ya mismo.
		 *
		 * @returns {void}
		 */
		sincronizar() {
			if (this.sincronizar_deshabilitado) {
				return
			}
			let era_finalizada = this.finalizada
			this.$store.commit('auth/setMessage', 'Mandando el artículo a Mercado Libre')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('mercado-libre/articulo/' + this.article_id + '/sincronizar', null, {
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				if (res.data.estado) {
					this.estado = res.data.estado
				}
				if (era_finalizada) {
					this.$toast.success('Listo: el artículo quedó en cola para publicarse de nuevo en Mercado Libre. En un rato tocá «Actualizar estado».')
				} else {
					this.$toast.success('Listo: el artículo quedó en cola para mandarse a Mercado Libre. En un rato tocá «Actualizar estado».')
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				let mensaje = 'No se pudo mandar el artículo a Mercado Libre'
				if (err && err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				this.$toast.error(mensaje)
			})
		},
	},
}
</script>
