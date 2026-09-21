<template>
	<component
	v-if="componente_del_modal"
	:is="componente_del_modal"
	model_name="article"
	:modal_id="MODAL_ID"
	:show_btn_pdf="false"></component>
</template>

<script>
/** Id propio del modal — nunca 'article' a secas, ver el comentario de abajo. */
const MODAL_ID = 'mostrador-article'

/**
 * Puente entre el click en un artículo del informe (tarjeta de bloques/Articulos.vue o
 * renglón de bloques/Lista.vue, evento `abrir-articulo`) y el modal de edición que ya
 * usa el resto del sistema (misión mostrador-fotos-y-modales, 21/9/2026).
 *
 * 🔴 LA TRABA QUE RESUELVE, Y POR QUÉ VIVE ACÁ. El modal `common-vue/components/model/
 * Index.vue` con model_name="article" (id de b-modal: "article") solo existe si la
 * pantalla actual lo montó — normalmente src/views/Listado.vue. El mostrador se abre
 * como overlay desde CUALQUIER pantalla (botón flotante o /ia/:id): parado en Caja no
 * hay ningún <b-modal id="article"> en el documento y $bvModal.show('article') no le
 * habla a nadie. Mismo problema, mismo remedio que ya usa
 * asistente-ia/CuentaCorrienteDeMencion.vue para la cuenta corriente: este componente
 * monta SU PROPIA instancia del modal genérico, recién al primer click.
 *
 * 🔴 Y CON UN modal_id PROPIO, nunca 'article' a secas. Si el mostrador se abre estando
 * parado en Listado.vue (el botón flotante puede abrirse desde cualquier pantalla, sin
 * navegar), esa vista YA montó su propio <b-modal id="article">: dos con el mismo id
 * reciben el mismo evento de $bvModal.show() y se abren los dos a la vez. Mismo criterio
 * documentado en common-vue/components/model/Index.vue:196-203 y en
 * CuentaCorrienteDeMencion.vue.
 *
 * No hace falta pasarle "properties" calculadas (getSelectAndCheckboxProps /
 * getPivotProperties de common-vue/mixins/display.js): las dos están gateadas por
 * `if (!model)` — solo hacen algo al CREAR un modelo en blanco. Acá el modelo siempre
 * viene completo desde el API, así que el commit es directo, sin pasar por el mixin
 * setModel() (que además hardcodea `$bvModal.show(model_name)`, no un modal_id propio).
 *
 * 🔴 CHEQUEO DE DUEÑO ACÁ, DEL LADO DEL CLIENTE, PORQUE `GET article/{id}` NO LO HACE.
 * `ArticleController::show()` resuelve por `Controller::fullModel()`, que busca por id
 * PELADO (`Model::where('id', $id)->first()`, sin `where('user_id', ...)`) — así es en
 * TODO el sistema, no un bug de esta ruta: el resto de las pantallas nunca le pasan un id
 * que no hayan sacado ellas mismas de una lista ya scopeada, así que nunca se nota. Acá
 * el id viene del `contenido` que redactó la skill del mostrador a partir de los hechos
 * (que sí están scopeados) — el camino normal tampoco puede traer uno ajeno, pero un id
 * mal copiado (alucinado, o de un `contenido` corrupto) sí mostraría el artículo de OTRO
 * negocio en la base compartida. El validador no lo puede evitar (MostradorContenidoValidator
 * no conoce al dueño del informe en runtime del bloque) y el fetch tampoco: se verifica acá,
 * comparando `articulo.user_id` contra el dueño de la sesión, antes de abrir nada.
 */
export default {
	name: 'AbrirArticuloDesdeInforme',
	data() {
		return {
			// El módulo YA RESUELTO de common-vue/components/model/Index.vue: se guarda
			// en vez de dejarle el import a un componente asíncrono, para poder mostrar
			// el modal en el $nextTick siguiente con certeza (mismo motivo que
			// CuentaCorrienteDeMencion.vue).
			componente_del_modal: null,
			// true mientras viaja el pedido del artículo (evita que dos clics seguidos
			// disparen dos aperturas).
			abriendo: false,
			MODAL_ID,
		}
	},
	methods: {
		/**
		 * Trae el artículo completo y abre el modal.
		 *
		 * @param {Number} article_id
		 * @returns {void}
		 */
		abrir(article_id) {
			if (!article_id || this.abriendo) {
				return
			}
			this.abriendo = true
			let self = this
			Promise.all([
				import('@/common-vue/components/model/Index'),
				this.$api.get('article/' + article_id),
			])
				.then(function (resultados) {
					self.abriendo = false
					let modulo = resultados[0]
					let articulo = resultados[1].data.model
					if (!articulo || !articulo.id || !self.es_del_dueno(articulo)) {
						self.$toast.error('No pudimos abrir este artículo')
						return
					}
					self.componente_del_modal = modulo.default || modulo
					self.$store.commit('article/setModel', { model: articulo, properties: [] })
					self.$nextTick(function () {
						self.$bvModal.show(MODAL_ID)
					})
				})
				.catch(function (err) {
					self.abriendo = false
					console.log(err)
					self.$toast.error('No pudimos abrir este artículo')
				})
		},
		/**
		 * true si el artículo traído es del dueño de la sesión (ver el comentario de
		 * arriba: GET article/{id} no lo scopea). Mismo camino que ya usa Index.vue para
		 * resolver "quién es el dueño real" cuando quien está logueado es un empleado
		 * (common-vue/components/model/Index.vue:945-947, `auth_user.owner`).
		 *
		 * @param {Object} articulo
		 * @returns {Boolean}
		 */
		es_del_dueno(articulo) {
			let auth_user = this.$store.state.auth.user
			if (!auth_user) {
				return false
			}
			let owner_id = auth_user.owner ? auth_user.owner.id : auth_user.id
			return !!owner_id && articulo.user_id == owner_id
		},
	},
}
</script>
