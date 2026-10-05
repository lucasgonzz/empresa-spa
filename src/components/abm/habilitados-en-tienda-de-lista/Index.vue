<template>
<!--
	Mision catalogo-por-lista-tienda (5/10/2026): lo que va DEBAJO del interruptor "En la tienda,
	mostrar solo los articulos habilitados para esta lista" (`catalogo_restringido_en_tienda`) del
	formulario de la lista de precios.

	Lo monta src/common-vue/views/Abm.vue por el slot aditivo `prop_extras` de ModelForm, solo para
	`price_type` y solo debajo de esa key (mismo mecanismo que el boton "Sincronizar articulos" que
	va debajo del margen). La key solo existe con la extension `online` (src/models/price_type.js):
	sin la extension este componente no se monta nunca.

	Hace dos cosas, y ninguna escribe nada:

	1. El contador "X habilitados de Y" (contrato C2 de la mision): `GET price-type/{id}/habilitados-en-tienda`
		devuelve `{habilitados, total}`, donde `total` son los articulos vivos del dueño y
		`habilitados` los que tienen tildado "Visible en la tienda para esta lista". Solo con la
		lista YA GUARDADA: una lista nueva no tiene id ni articulos habilitados.
	2. Con el interruptor prendido en el formulario (guardado o no), un aviso permanente de lo que
		implica. La ayuda del campo vive en un popover que solo se ve al pasar el mouse; esto, en
		cambio, queda a la vista, porque prender el interruptor con cero articulos habilitados deja a
		esos clientes sin ver NADA en la tienda, y eso no puede depender de que alguien lea un globo.

	🔴 El contador se pide al montar y no se refresca solo. No hace falta: el formulario vive en un
	b-modal sin `static`, que destruye su contenido al cerrarse, asi que cada vez que se abre la
	lista este componente nace de nuevo y vuelve a preguntar.
-->
<div
v-if="mostrar_bloque"
class="habilitados-en-tienda-cont"
data-testid="habilitados-en-tienda-de-lista">

	<!-- Contador: solo con la lista guardada (hay contra que preguntar). -->
	<div
	v-if="lista_guardada"
	class="habilitados-en-tienda__contador">
		<b-spinner
		v-if="cargando_habilitados"
		small
		variant="primary"></b-spinner>

		<span
		v-else-if="error_habilitados"
		class="habilitados-en-tienda__error">
			No se pudo consultar cuántos artículos están habilitados
		</span>

		<span
		v-else-if="contador_cargado">
			<strong>{{ numero_es(habilitados) }} {{ habilitados == 1 ? 'habilitado' : 'habilitados' }}</strong>
			de {{ numero_es(total) }}
		</span>
	</div>

	<!--
		Aviso con el interruptor prendido. Si ya se sabe que no hay ninguno habilitado, se dice
		con todas las letras: es exactamente el caso en que la tienda queda vacia para esos clientes.
	-->
	<p
	v-if="lista_restringida"
	class="habilitados-en-tienda__aviso m-b-0">
		<template v-if="sin_ninguno_habilitado">
			Hoy no hay ningún artículo habilitado: los clientes con esta lista no van a ver ningún artículo en la tienda.
		</template>
		<template v-else>
			Los clientes con esta lista ven en la tienda solo los artículos habilitados.
		</template>
		Se habilitan desde la ficha del artículo ("Visible en la tienda para esta lista"), con la actualización masiva o con la importación de Excel.
	</p>
</div>
</template>
<script>
export default {
	props: {
		/*
			La lista de precios del formulario: es el `model` del scope de `prop_extras`, o sea el
			MISMO objeto que esta editando ModelForm. Por eso `model.catalogo_restringido_en_tienda`
			es lo que el usuario tiene en el interruptor ahora, guardado o no.
		*/
		model: Object,
	},
	data() {
		return {
			cargando_habilitados: false,
			error_habilitados: false,
			// null mientras no hay respuesta: distingue "todavia no se sabe" de un 0 real.
			habilitados: null,
			total: null,
		}
	},
	computed: {
		/**
		 * ¿La lista ya esta guardada? Sin id no hay contra que pedir el contador.
		 *
		 * @return {Boolean}
		 */
		lista_guardada() {
			return !!(this.model && this.model.id)
		},
		/**
		 * ¿El interruptor esta prendido en el formulario?
		 *
		 * 🔴 Comparacion SUELTA a proposito: la columna llega de la API como 0/1, null o string
		 * ("1") segun el driver, y el toggle de ModelForm escribe 1/0 numerico. Con `=== 1` un "1"
		 * string se leeria como apagado. Nunca `!= 0`: NULL tambien es "sin restriccion" (contrato C1).
		 *
		 * @return {Boolean}
		 */
		lista_restringida() {
			return !!this.model && this.model.catalogo_restringido_en_tienda == 1
		},
		/**
		 * ¿Ya llego una respuesta valida del contador?
		 *
		 * @return {Boolean}
		 */
		contador_cargado() {
			return this.habilitados !== null && this.total !== null
		},
		/**
		 * ¿Se sabe (por el contador) que no hay ningun articulo habilitado para esta lista?
		 *
		 * @return {Boolean}
		 */
		sin_ninguno_habilitado() {
			return this.contador_cargado && Number(this.habilitados) === 0
		},
		/**
		 * ¿Hay algo para mostrar? Una lista nueva con el interruptor apagado no tiene contador ni
		 * aviso: el bloque no se dibuja y el formulario queda como siempre.
		 *
		 * @return {Boolean}
		 */
		mostrar_bloque() {
			return this.lista_guardada || this.lista_restringida
		},
	},
	watch: {
		/*
			Al guardar una lista nueva el `model` pasa a tener id sin que el componente se vuelva a
			montar: ahi corresponde pedir el contador por primera vez. `immediate` cubre la apertura
			de una lista ya guardada.
		*/
		'model.id': {
			handler: 'pedir_habilitados_en_tienda',
			immediate: true,
		},
	},
	methods: {
		/**
		 * Pide `{habilitados, total}` de la lista a la API (contrato C2).
		 *
		 * Una respuesta que llega cuando el formulario ya muestra OTRA lista se descarta: el
		 * contador no puede quedar con los numeros de una lista que no es la que se esta viendo.
		 *
		 * @return {void}
		 */
		pedir_habilitados_en_tienda() {
			if (!this.lista_guardada) {
				return
			}

			let self = this
			let price_type_id = this.model.id

			this.cargando_habilitados = true
			this.error_habilitados = false
			this.habilitados = null
			this.total = null

			this.$api.get('price-type/' + price_type_id + '/habilitados-en-tienda')
			.then(res => {
				if (!self.model || self.model.id != price_type_id) {
					return
				}
				self.cargando_habilitados = false

				let datos = res && res.data ? res.data : {}
				let habilitados = Number(datos.habilitados)
				let total = Number(datos.total)

				// Una respuesta sin los dos numeros (p. ej. una API vieja que no tiene la ruta y
				// contesta otra cosa) se trata como error y no como "0 de 0": Number(null) da 0 y
				// Number(undefined) da NaN, asi que los dos casos se miran aparte.
				if (
					datos.habilitados === null || typeof datos.habilitados == 'undefined'
					|| datos.total === null || typeof datos.total == 'undefined'
					|| isNaN(habilitados) || isNaN(total)
				) {
					self.error_habilitados = true
					return
				}

				self.habilitados = habilitados
				self.total = total
			})
			.catch(() => {
				if (!self.model || self.model.id != price_type_id) {
					return
				}
				// Sin toast: es un dato de mas en el formulario, no una accion del usuario. La
				// linea del error ya lo dice en su lugar.
				self.cargando_habilitados = false
				self.error_habilitados = true
			})
		},
	},
}
</script>
<style scoped lang="sass">
.habilitados-en-tienda-cont
	margin-top: 8px
	font-size: 0.85em

	.habilitados-en-tienda__contador
		color: var(--color-text-primary, rgba(0, 0, 0, .8))

	.habilitados-en-tienda__error
		color: var(--color-text-secondary, rgba(0, 0, 0, .55))

	// El aviso lleva el amarillo de advertencia de Bootstrap (#ffc107) como borde, en un recuadro:
	// es una consecuencia de lo que se eligio, no una ayuda que se puede pasar por alto. El fondo va
	// por --bg-hover, igual que el interruptor de las tarjetas de precio, para que se despegue de la
	// tarjeta tambien en modo oscuro.
	.habilitados-en-tienda__aviso
		margin-top: 6px
		padding: 6px 8px
		border-radius: 6px
		border-left: 3px solid #ffc107
		background: var(--bg-hover, rgba(0, 0, 0, .04))
		color: var(--color-text-primary, rgba(0, 0, 0, .8))
		word-break: break-word
</style>
