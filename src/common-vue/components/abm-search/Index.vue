<template>
	<div
	class="abm-search">
		<b-form-input
		v-model="query"
		autocomplete="off"
		placeholder="Buscar recurso... Ej: metodos de pago, comisiones, reputaciones"
		@focus="abrir_si_hay_query"
		@keydown.down.prevent="mover_seleccion(1)"
		@keydown.up.prevent="mover_seleccion(-1)"
		@keydown.enter.prevent="seleccionar_con_enter"
		@keydown.esc="cerrar"></b-form-input>

		<div
		v-if="abierto && resultados.length"
		class="abm-search-resultados">
			<div
			v-for="(resultado, index) in resultados"
			:key="resultado.view + '-' + resultado.model_name"
			class="abm-search-item"
			:class="{ seleccionado: index == indice_seleccionado }"
			@mousedown.prevent="seleccionar(resultado)"
			@mouseenter="indice_seleccionado = index">
				<div class="abm-search-item-encabezado">
					<span class="abm-search-item-nombre">{{ resultado.nombre }}</span>
					<span class="abm-search-item-grupo">{{ resultado.view_nombre }}</span>
				</div>
				<p
				v-if="resultado.para_que_sirve"
				class="abm-search-item-descripcion">{{ resultado.para_que_sirve }}</p>
			</div>
		</div>

		<div
		v-if="abierto && query_normalizada.length >= 2 && !resultados.length"
		class="abm-search-resultados">
			<div class="abm-search-vacio">
				No se encontraron recursos para "{{ query }}"
			</div>
		</div>
	</div>
</template>
<script>
import abm from '@/mixins/abm'
export default {
	// Buscador tipo Google del modulo ABM: matchea recursos por nombre, palabras clave
	// y descripcion, y al elegir uno navega a su grupo y submodelo (auto-seleccion).
	mixins: [abm],
	data() {
		return {
			query: '',
			abierto: false,
			indice_seleccionado: -1,
		}
	},
	computed: {
		// Query sin tildes ni mayusculas, para comparar de forma tolerante
		query_normalizada() {
			return this.normalizar(this.query)
		},
		/**
		 * Indice de busqueda: un item por cada recurso visible del ABM.
		 * Respeta la misma visibilidad que Abm.vue: extension del grupo (if_has_extencion)
		 * y la misma regla de modelo (check_model), asi el buscador nunca ofrece un recurso
		 * que las pestanias no muestran.
		 */
		indice() {
			let items = []
			this.abm_views.forEach(view => {
				if (view.if_has_extencion && !this.hasExtencion(view.if_has_extencion)) {
					return
				}
				view.models.forEach(model_name => {
					if (!this.check_model(model_name)) {
						return
					}
					let definicion = this.get_definicion_modelo(model_name)
					if (!definicion) {
						return
					}
					let descripcion = definicion.abm_descripcion ? definicion.abm_descripcion : {}
					items.push({
						model_name: model_name,
						view: view.view,
						view_nombre: this.capitalize(view.view),
						nombre: definicion.plural_model_name_spanish,
						singular: definicion.singular_model_name_spanish,
						para_que_sirve: descripcion.para_que_sirve ? descripcion.para_que_sirve : '',
						palabras_clave: descripcion.palabras_clave ? descripcion.palabras_clave : [],
					})
				})
			})
			return items
		},
		/**
		 * Resultados filtrados y ordenados por relevancia:
		 * coincidencia en el nombre (3) > palabras clave (2) > descripcion o grupo (1).
		 */
		resultados() {
			if (this.query_normalizada.length < 2) {
				return []
			}
			let query = this.query_normalizada
			let resultados = []
			this.indice.forEach(item => {
				let puntaje = 0
				if (this.normalizar(item.nombre).includes(query)
					|| this.normalizar(item.singular).includes(query)) {
					puntaje = 3
				} else if (this.coincide_palabra_clave(item, query)) {
					puntaje = 2
				} else if (this.normalizar(item.para_que_sirve).includes(query)
					|| this.normalizar(item.view).includes(query)) {
					puntaje = 1
				}
				if (puntaje > 0) {
					resultados.push(Object.assign({}, item, { puntaje: puntaje }))
				}
			})
			resultados.sort((a, b) => {
				if (b.puntaje != a.puntaje) {
					return b.puntaje - a.puntaje
				}
				return a.nombre.localeCompare(b.nombre)
			})
			return resultados.slice(0, 10)
		},
	},
	methods: {
		/**
		 * Pasa un texto a minusculas y le quita las tildes, para que
		 * "facturacion" matchee con "Facturacion" y viceversa.
		 */
		normalizar(texto) {
			if (!texto) {
				return ''
			}
			return ('' + texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		},
		coincide_palabra_clave(item, query) {
			let coincide = false
			item.palabras_clave.forEach(palabra => {
				if (this.normalizar(palabra).includes(query)) {
					coincide = true
				}
			})
			return coincide
		},
		/**
		 * Misma regla que checkModel de Abm.vue: para un model_name (string) siempre da
		 * true (las pestanias del ABM no filtran por permiso). Se deja como metodo aparte
		 * para que, si algun dia el ABM empieza a filtrar por permiso, se cambie en un solo lugar.
		 */
		check_model(model_name) {
			return (typeof model_name.check_permissions == 'undefined' || this.can(model_name.replaceAll(' ', '_') + '.index'))
		},
		/**
		 * Lee la definicion del modelo con el mismo mecanismo que plural() y
		 * singular() del mixin global (require dinamico cacheado por webpack).
		 */
		get_definicion_modelo(model_name) {
			try {
				return require('@/models/' + model_name + '.js').default
			} catch (e) {
				console.log('abm-search: no se encontro el modelo ' + model_name)
				return null
			}
		},
		/**
		 * Navega al recurso elegido. Con pushear los params alcanza:
		 * los watchers de Abm.vue sobre $route.params resuelven el
		 * selected_model y los horizontal-nav se sincronizan solos.
		 */
		seleccionar(resultado) {
			this.query = ''
			this.abierto = false
			this.indice_seleccionado = -1
			this.$router.push({params: {
				view: this.routeString(resultado.view),
				sub_view: this.routeString(resultado.nombre),
			}})
			.catch(() => {})
		},
		seleccionar_con_enter() {
			if (!this.resultados.length) {
				return
			}
			let indice = this.indice_seleccionado >= 0 ? this.indice_seleccionado : 0
			this.seleccionar(this.resultados[indice])
		},
		mover_seleccion(direccion) {
			if (!this.resultados.length) {
				return
			}
			let nuevo = this.indice_seleccionado + direccion
			if (nuevo < 0) {
				nuevo = this.resultados.length - 1
			}
			if (nuevo >= this.resultados.length) {
				nuevo = 0
			}
			this.indice_seleccionado = nuevo
		},
		abrir_si_hay_query() {
			if (this.query_normalizada.length >= 2) {
				this.abierto = true
			}
		},
		cerrar() {
			this.abierto = false
			this.indice_seleccionado = -1
		},
		// Cierra el desplegable al hacer click fuera del componente
		click_afuera(evento) {
			if (!this.$el.contains(evento.target)) {
				this.cerrar()
			}
		},
	},
	watch: {
		query() {
			this.indice_seleccionado = -1
			this.abierto = this.query_normalizada.length >= 2
		},
	},
	mounted() {
		document.addEventListener('mousedown', this.click_afuera)
	},
	beforeDestroy() {
		document.removeEventListener('mousedown', this.click_afuera)
	},
}
</script>
<style lang="sass" scoped>
.abm-search
	position: relative
	max-width: 480px
	margin: 0 auto 15px auto
	.abm-search-resultados
		position: absolute
		top: calc(100% + 4px)
		left: 0
		right: 0
		background: #fff
		border: 1px solid #e0e0e0
		border-radius: 10px
		box-shadow: 0 8px 24px rgba(0, 0, 0, .08)
		z-index: 1000
		max-height: 420px
		overflow-y: auto
		text-align: left
	.abm-search-item
		padding: 10px 14px
		cursor: pointer
		border-bottom: 1px solid #f2f2f2
		&:last-child
			border-bottom: none
		&.seleccionado
			background: #f5f6f7
	.abm-search-item-encabezado
		display: flex
		justify-content: space-between
		align-items: baseline
		gap: 10px
	.abm-search-item-nombre
		font-weight: 600
		font-size: 14px
		color: #1d1d1f
	.abm-search-item-grupo
		font-size: 11px
		color: #86868b
		text-transform: capitalize
		white-space: nowrap
	.abm-search-item-descripcion
		margin: 3px 0 0 0
		font-size: 12px
		color: #6e6e73
		line-height: 1.35
		display: -webkit-box
		-webkit-line-clamp: 2
		-webkit-box-orient: vertical
		overflow: hidden
	.abm-search-vacio
		padding: 14px
		font-size: 13px
		color: #86868b
		text-align: center
</style>
