<template>
<b-modal
id="imagenes-catalogo"
size="md"
centered
scrollable
title="Buscar imágenes para todo el catálogo"
@show="al_abrir"
@hidden="al_cerrar">

	<div
	class="img-cat"
	data-testid="imagenes-modal-catalogo">

		<div
		v-if="cargando"
		class="img-cat__cargando">
			<b-spinner
			small
			variant="primary"></b-spinner>
			<span>Calculando qué artículos se buscarían…</span>
		</div>

		<div
		v-else-if="error"
		class="img-cat__aviso img-cat__aviso--mal"
		data-testid="imagenes-catalogo-error">
			<span>No pudimos calcular la búsqueda.</span>
			<button
			type="button"
			class="img-cat__link"
			@click="cargar">
				Reintentar
			</button>
		</div>

		<template v-else-if="previa">

			<!--
				Ya hay una de catalogo corriendo: la API no deja lanzar otra (422), asi que el boton
				se apaga y se ofrece ir a la que esta en curso.
			-->
			<div
			v-if="previa.corrida_activa"
			class="img-cat__aviso img-cat__aviso--info"
			data-testid="imagenes-catalogo-activa">
				<span>
					Ya hay una búsqueda de todo el catálogo en curso ({{ avance_de_la_activa }}). Esperá a que termine, o detenela desde su detalle.
				</span>
				<button
				type="button"
				class="img-cat__link"
				data-testid="imagenes-catalogo-ver-activa"
				@click="ver_corrida_activa">
					Ver la búsqueda en curso
				</button>
			</div>

			<!--
				Sin clave de Serper no se lanza: con la de Google (100 busquedas por dia para toda
				la flota) un catalogo entero no termina nunca. Este modal lo ve solo el acceso
				maestro, por eso nombra la variable del .env.
			-->
			<div
			v-else-if="!previa.proveedor_configurado"
			class="img-cat__aviso img-cat__aviso--mal"
			data-testid="imagenes-catalogo-sin-proveedor">
				Falta cargar la clave de Serper (SERPER_API_KEY) en el servidor de este cliente. Sin esa clave no se puede buscar todo el catálogo; la búsqueda desde el listado sigue andando como siempre.
			</div>

			<div class="img-cat__principal">
				<span
				class="img-cat__cifra"
				data-testid="imagenes-catalogo-a-buscar"
				:data-valor="previa.a_buscar">
					{{ entero(previa.a_buscar) }}
				</span>
				<span class="img-cat__cifra-etiqueta">
					{{ Number(previa.a_buscar) === 1 ? 'artículo se busca ahora' : 'artículos se buscan ahora' }}
				</span>
				<span class="img-cat__contexto">
					De {{ entero(previa.sin_imagen) }} {{ Number(previa.sin_imagen) === 1 ? 'artículo activo' : 'artículos activos' }} sin imagen.
				</span>
			</div>

			<ul class="img-cat__lista">
				<li v-if="Number(previa.excluidos_pendientes_de_revision) > 0">
					<strong>{{ entero(previa.excluidos_pendientes_de_revision) }}</strong>
					no se buscan: ya tienen una imagen esperando que alguien la apruebe o la rechace.
				</li>
				<li v-if="Number(previa.excluidos_ya_buscados) > 0">
					<strong>{{ entero(previa.excluidos_ya_buscados) }}</strong>
					no se buscan: ya se buscaron sin éxito en los últimos 90 días.
				</li>
				<li v-if="Number(previa.quedan_para_otra_corrida) > 0">
					<strong>{{ entero(previa.quedan_para_otra_corrida) }}</strong>
					quedan para otra búsqueda: el tope es de {{ entero(previa.tope) }} artículos por vez. Cuando termine, lanzala de nuevo y sigue con los que faltan.
				</li>
				<li v-else-if="Number(previa.tope) > 0">
					El tope es de <strong>{{ entero(previa.tope) }}</strong> artículos por búsqueda: esta vez entran todos.
				</li>
				<li>
					Van primero los publicados en la tienda, después los que tienen stock y después el resto.
				</li>
			</ul>

			<div
			v-if="estimacion"
			class="img-cat__estimacion"
			data-testid="imagenes-catalogo-estimacion">
				<p class="img-cat__estimacion-titulo">
					Estimación
				</p>
				<dl class="img-cat__datos">
					<div class="img-cat__dato">
						<dt>Búsquedas</dt>
						<dd>~{{ entero(estimacion.busquedas) }}</dd>
					</div>
					<div class="img-cat__dato">
						<dt>Tiempo</dt>
						<dd>~{{ duracion(estimacion.minutos) }}</dd>
					</div>
					<div class="img-cat__dato">
						<dt>Búsquedas (costo)</dt>
						<dd>USD {{ dolares(estimacion.usd_busquedas) }}</dd>
					</div>
					<div class="img-cat__dato">
						<dt>Revisión con IA (costo)</dt>
						<dd>USD {{ dolares(estimacion.usd_ia) }}</dd>
					</div>
				</dl>
				<p class="img-cat__nota">
					Busca en {{ proveedor }}. Corre en segundo plano, de a tramos: se puede seguir usando el sistema y el avance se ve en esta pestaña.
				</p>
			</div>

		</template>

	</div>

	<template #modal-footer>
		<b-button
		class="btn-modulo"
		variant="outline-secondary"
		@click="cerrar">
			Cancelar
		</b-button>
		<b-button
		class="btn-modulo"
		variant="primary"
		data-testid="imagenes-catalogo-lanzar"
		:disabled="!puede_lanzar || lanzando"
		@click="lanzar">
			<b-spinner
			v-if="lanzando"
			small
			class="m-r-5"></b-spinner>
			Lanzar búsqueda
		</b-button>
	</template>

</b-modal>
</template>
<script>
import { esta_activa, entero_es, porcentaje_de, texto_de_proveedor } from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'
import { numero_es as numero_con_decimales } from '@/common-vue/helpers/formato_numero'
import { es_cancelacion } from '@/store/image_assignment'

/**
 * Confirmación de "Buscar imágenes para todo el catálogo" (solo acceso maestro; la solapa ni
 * siquiera monta este modal para nadie más).
 *
 * Al abrirse pide la previa (contrato §5.4): cuántos artículos hay sin imagen, cuántos se buscan
 * ahora, qué se excluye y por qué, el tope, el proveedor y la estimación de búsquedas, tiempo y
 * dólares. Con eso Lucas decide antes de gastar. No deja lanzar sin proveedor configurado, sin
 * artículos para buscar o con otra de catálogo en curso: la API contesta 422 en los tres casos,
 * pero es mejor que el botón ya lo diga.
 *
 * Eventos: `lanzada(asignacion)` y `ver_asignacion(asignacion)` (la que estaba en curso).
 */
export default {
	data() {
		return {
			/** Respuesta de la previa (§5.4), o null mientras no llegó. */
			previa: null,
			/** true mientras se calcula la previa. */
			cargando: false,
			/** true si la previa falló. */
			error: false,
			/** true mientras está en vuelo el POST de lanzamiento (evita el doble clic). */
			lanzando: false,
		}
	},
	computed: {
		estimacion() {
			return this.previa && this.previa.estimacion ? this.previa.estimacion : null
		},
		/**
		 * Se puede lanzar si hay proveedor, hay algo para buscar y no hay otra de catálogo
		 * corriendo. Es la misma regla con la que la API contesta 422.
		 *
		 * @returns {Boolean}
		 */
		puede_lanzar() {
			if (!this.previa || this.cargando || this.error) {
				return false
			}
			if (this.previa.corrida_activa) {
				return false
			}
			if (!this.previa.proveedor_configurado) {
				return false
			}
			return Number(this.previa.a_buscar) > 0
		},
		/**
		 * "1.250 de 5.000" de la búsqueda de catálogo que ya está corriendo.
		 *
		 * @returns {String}
		 */
		avance_de_la_activa() {
			let activa = this.previa ? this.previa.corrida_activa : null
			if (!activa) {
				return ''
			}
			if (!esta_activa(activa) || !Number(activa.procesados)) {
				return 'todavía arrancando'
			}
			let porcentaje = porcentaje_de(activa)
			return entero_es(activa.procesados) + ' de ' + entero_es(activa.total_articulos) + (porcentaje !== null ? ', ' + porcentaje + ' %' : '')
		},
		proveedor() {
			return texto_de_proveedor(this.previa ? this.previa.proveedor : null, true)
		},
	},
	methods: {
		/** Al abrir: previa fresca, siempre (lo que había la vez anterior puede estar viejo). */
		al_abrir() {
			this.previa = null
			this.cargar()
		},
		al_cerrar() {
			this.previa = null
			this.error = false
			this.lanzando = false
		},
		cerrar() {
			this.$bvModal.hide('imagenes-catalogo')
		},
		/**
		 * Pide la previa del catálogo. Un 403 (sesión que no es de acceso maestro) lo anuncia el
		 * interceptor global con el mensaje de la API. Una cancelación no es un error: se vuelve a
		 * pedir una vez (ver `es_cancelacion` en el store).
		 *
		 * @param {Boolean} es_reintento
		 */
		cargar(es_reintento) {
			let self = this
			self.cargando = true
			self.error = false
			self.$store.dispatch('image_assignment/get_previa_catalogo')
			.then(previa => {
				self.previa = previa
				self.cargando = false
			})
			.catch(err => {
				console.log(err)
				if (es_cancelacion(err) && es_reintento !== true) {
					self.cargar(true)
					return
				}
				self.error = true
				self.cargando = false
			})
		},
		/**
		 * Lanza la búsqueda de todo el catálogo. Con el indicador global de carga: es el único
		 * clic de esta pantalla que pone a trabajar al servidor por horas, y no tiene que poder
		 * repetirse mientras viaja.
		 *
		 * Si la API contesta 422 (se lanzó otra desde otra pestaña, se borró la clave...) el
		 * interceptor muestra el motivo y la previa se vuelve a pedir, así lo que se ve es lo real.
		 */
		lanzar() {
			if (!this.puede_lanzar || this.lanzando) {
				return
			}
			let self = this
			self.lanzando = true
			self.$store.commit('auth/setMessage', 'Lanzando la búsqueda de imágenes')
			self.$store.commit('auth/setLoading', true)

			self.$store.dispatch('image_assignment/lanzar_catalogo')
			.then(asignacion => {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.lanzando = false
				self.$toast.success('Listo: la búsqueda arrancó. Va a tardar un rato largo y el avance se ve en esta pestaña.', {
					duration: 6000,
				})
				self.$emit('lanzada', asignacion)
				self.cerrar()
			})
			.catch(err => {
				console.log(err)
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.lanzando = false
				self.cargar()
			})
		},
		/** Cierra y pide abrir el detalle de la búsqueda de catálogo que ya estaba corriendo. */
		ver_corrida_activa() {
			if (!this.previa || !this.previa.corrida_activa) {
				return
			}
			this.$emit('ver_asignacion', this.previa.corrida_activa)
			this.cerrar()
		},
		entero(valor) {
			return entero_es(valor)
		},
		/**
		 * Minutos estimados a texto: "45 min", "11 h", "11 h 7 min".
		 *
		 * @param {Number} minutos
		 * @returns {String}
		 */
		duracion(minutos) {
			let total = Math.round(Number(minutos) || 0)
			if (total < 60) {
				return total + ' min'
			}
			let horas = Math.floor(total / 60)
			let resto = total % 60
			return horas + ' h' + (resto ? ' ' + resto + ' min' : '')
		},
		/**
		 * Dólares con dos decimales es-AR ("7,50").
		 *
		 * @param {Number} valor
		 * @returns {String}
		 */
		dolares(valor) {
			return numero_con_decimales(Number(valor) || 0, 2)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: el cuerpo de un b-modal cuelga de <body> (fuera de #app) y las reglas van todas
// prefijadas con img-cat. Colores por token, con el literal de :root como fallback.
.img-cat
	display: flex
	flex-direction: column
	gap: 16px
	text-align: left

.img-cat__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 32px 0
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

.img-cat__aviso
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 6px
	padding: 12px 14px
	border-radius: 12px
	font-size: 0.875rem
	line-height: 1.4

.img-cat__aviso--info
	background: var(--bg-info-soft, rgba(23, 162, 184, .1))
	color: var(--color-text-info-strong, #0c5460)

.img-cat__aviso--mal
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

.img-cat__link
	border: 0
	padding: 0
	background: transparent
	box-shadow: none
	font-size: 0.875rem
	font-weight: 600
	color: inherit
	text-decoration: underline

.img-cat__principal
	display: flex
	flex-direction: column
	align-items: center
	gap: 2px
	padding: 8px 0 4px
	text-align: center

.img-cat__cifra
	font-size: 2.6rem
	font-weight: 700
	line-height: 1.05
	letter-spacing: -0.02em
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.img-cat__cifra-etiqueta
	font-size: 0.95rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.img-cat__contexto
	font-size: 0.82rem
	color: var(--color-text-secondary, #6c757d)

.img-cat__lista
	margin: 0
	padding: 0
	list-style: none
	display: flex
	flex-direction: column
	gap: 8px
	font-size: 0.875rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

	li
		position: relative
		padding-left: 14px

		// Un punto chico en vez de la viñeta del navegador: mas liviano.
		&::before
			content: ''
			position: absolute
			left: 0
			top: 0.55em
			width: 5px
			height: 5px
			border-radius: 50%
			background: var(--color-border, #dee2e6)

	strong
		color: var(--color-text-primary, #212529)
		font-variant-numeric: tabular-nums

.img-cat__estimacion
	padding: 14px 16px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)

.img-cat__estimacion-titulo
	margin: 0 0 10px
	font-size: 0.75rem
	font-weight: 600
	letter-spacing: .04em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

.img-cat__datos
	display: grid
	grid-template-columns: repeat(2, minmax(0, 1fr))
	gap: 10px 16px
	margin: 0

.img-cat__dato
	display: flex
	flex-direction: column
	gap: 1px

	dt
		font-size: 0.75rem
		font-weight: 500
		color: var(--color-text-secondary, #6c757d)

	dd
		margin: 0
		font-size: 1.05rem
		font-weight: 600
		color: var(--color-text-primary, #212529)
		font-variant-numeric: tabular-nums

.img-cat__nota
	margin: 12px 0 0
	font-size: 0.8rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

@media (max-width: 400px)
	.img-cat__datos
		grid-template-columns: minmax(0, 1fr)
</style>
