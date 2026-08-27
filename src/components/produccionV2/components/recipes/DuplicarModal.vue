<template>
	<b-modal
	id="duplicar-receta"
	title="Duplicar receta"
	hide-footer
	@show="al_abrir">

		<!--
			🔴 EL AVISO DE LOS INSUMOS QUE SIGUEN APUNTANDO AL MODELO ORIGINAL.

			Duplicando "Silla 1" -> "Silla 2", la receta nueva sigue consumiendo *Estructura silla
			1*. Para una receta hoja (patas -> cano) eso esta perfecto; para una de ensamble esta
			mal, y el sistema no puede re-apuntarlo solo porque no sabe cual es la parte
			equivalente del modelo nuevo. Lo que si puede es NOMBRARLOS: un aviso generico no
			sirve, el usuario tiene que leer cuales son.
		-->
		<template v-if="insumos_a_revisar.length">

			<b-alert
			show
			variant="warning">
				<p class="m-b-5">
					La receta se duplico, pero <strong>estos insumos siguen apuntando a las partes
					del modelo original</strong>. Si el modelo nuevo usa partes propias, cambialos
					en la receta:
				</p>
				<ul class="duplicar-receta__insumos">
					<li
					v-for="insumo in insumos_a_revisar"
					:key="insumo.article_id">
						{{ insumo.article_name }}
					</li>
				</ul>
			</b-alert>

			<div class="j-end">
				<b-button
				variant="primary"
				@click="cerrar">
					Entendido
				</b-button>
			</div>

		</template>

		<template v-else>

			<p v-if="nombre_original">
				Se va a crear un articulo nuevo con la misma receta que
				<strong>{{ nombre_original }}</strong>: las mismas rutas, los mismos insumos y las
				mismas cantidades.
			</p>

			<b-form-group label="Nombre del articulo nuevo">
				<b-form-input
				v-model="nombre"
				:disabled="loading"
				placeholder="Ingrese el nombre"
				@keyup.enter="duplicar"></b-form-input>
			</b-form-group>

			<!--
				Esta linea es la que evita el reclamo de "me duplico el codigo de barras": el
				articulo nuevo es un producto fisico distinto, asi que los codigos que lo
				identifican no se heredan.
			-->
			<p class="duplicar-receta__aclaracion">
				El articulo nuevo se crea sin codigo de barras, sin codigo de proveedor y sin stock.
				Las cantidades de cada insumo se copian y las podes editar despues.
			</p>

			<div class="j-end">
				<b-button
				class="m-r-10"
				variant="outline-secondary"
				:disabled="loading"
				@click="cerrar">
					Cancelar
				</b-button>
				<b-button
				variant="primary"
				:disabled="loading || !nombre"
				@click="duplicar">
					<b-spinner
					v-if="loading"
					small
					class="m-r-5"></b-spinner>
					Duplicar
				</b-button>
			</div>

		</template>
	</b-modal>
</template>
<script>
export default {
	props: {
		/**
		 * Receta que se va a duplicar. Llega desde el boton de la fila del listado.
		 */
		receta: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			/* Nombre del articulo nuevo. Se precarga con el del original y se puede editar. */
			nombre: '',
			/* Evita un doble POST mientras la peticion esta en curso. */
			loading: false,
			/*
				Insumos de la receta duplicada que a su vez tienen receta propia: siguen
				apuntando a las partes del modelo original. Mientras tenga algo, el modal se
				queda abierto mostrando la lista en vez de cerrarse solo.
			*/
			insumos_a_revisar: [],
		}
	},
	computed: {
		/*
			Nombre del articulo de la receta original. Si la fila no trajo el articulo cargado,
			se cae al nombre de la receta, que es lo que muestra el listado.
		*/
		nombre_original() {
			if (!this.receta) {
				return ''
			}
			if (this.receta.article && this.receta.article.name) {
				return this.receta.article.name
			}
			if (this.receta.name) {
				return this.receta.name
			}
			return ''
		},
	},
	methods: {
		/**
		 * Precarga el nombre cada vez que se abre el modal.
		 *
		 * Va en el @show y no en un watch de la prop: el modal se monta una sola vez y se
		 * reusa para todas las filas del listado.
		 *
		 * @returns {void}
		 */
		al_abrir() {
			this.loading = false
			this.insumos_a_revisar = []
			this.nombre = this.nombre_original ? this.nombre_original + ' copia' : ''
		},
		/**
		 * Crea el articulo nuevo con su receta completa (rutas, insumos y cantidades).
		 *
		 * @returns {void}
		 */
		duplicar() {
			if (this.loading || !this.nombre) {
				return
			}
			if (!this.receta || !this.receta.id) {
				return
			}

			let self = this

			this.loading = true
			this.$store.commit('auth/setMessage', 'Duplicando receta')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('recipe/' + this.receta.id + '/duplicar', { name: this.nombre })
			.then(function(res) {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$store.commit('recipe/add', res.data.model)
				self.$toast.success('Receta duplicada')

				/*
					Si la receta nueva tiene insumos que se fabrican, el modal NO se cierra: los
					lista, porque siguen apuntando a las partes del modelo original y nadie mas
					se lo va a decir. Un toast se va solo y este aviso hay que leerlo.
				*/
				self.insumos_a_revisar = res.data.insumos_a_revisar ? res.data.insumos_a_revisar : []

				if (!self.insumos_a_revisar.length) {
					self.cerrar()
				}
			})
			.catch(function(err) {
				console.log(err)
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				/* Mensaje del backend si vino, texto generico si no. */
				let message = 'No se pudo duplicar la receta'
				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}
				self.$toast.error(message)
			})
		},
		/**
		 * Cierra el modal.
		 *
		 * @returns {void}
		 */
		cerrar() {
			this.$bvModal.hide('duplicar-receta')
		},
	},
}
</script>
<style lang="sass">
.duplicar-receta__aclaracion
	font-size: .85rem
	opacity: .75
.duplicar-receta__insumos
	// La lista va sin margen de abajo para que el boton no quede colgado lejos del aviso.
	margin-bottom: 0
	padding-left: 20px
</style>
