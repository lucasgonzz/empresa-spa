<template>
	<!--
		Dos anclas distintas y a proposito: el contenedor es el precio que el clip 1.4 senala ("el
		precio final sale en pesos"), y el boton del "?" es lo que el lead toca en los clips 1.2,
		1.2-mt y 1.4. El `<p>` del medio NO se ancla: se re-renderiza con cada recalculo y el tour
		mediria una caja que ya no existe.
	-->
	<div
	data-tour="listado.campo_precio_final"
	class="cont-final-price">
		<b-button
		data-tour="listado.boton_explicacion_precio"
		class="btn-explicacion m-r-10"
		@click="info"
		variant="outline-secondary"
		title="Ver cómo se calculó este precio"
		size="sm">
			<i class="bi bi-question-lg"></i>
		</b-button>
		<p
		class="text-success">
			{{ propertyText(article, prop, false, !prop.from_pre_view) }}
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.article.model
		},
		prop() {
			return {
				key: 'final_price',
				check_simbolo_moneda: true,
				simbolo_moneda_function: 'article_simbolo_moneda',
				prop_to_check_in_simbolo_moneda: {
					key: 'cost_in_dollars',
					equal_to: 1
				},
				is_price: true,
			}
		}
	},
	methods: {
		/**
		 * Pide el desglose del precio final y lo muestra en el modal compartido.
		 *
		 * 🔴 El modal se abre ANTES de disparar el pedido, no en el .then(). El endpoint no es una
		 * consulta liviana: corre setFinalPrice() con guardar_cambios en true, o sea que recalcula,
		 * guarda, dispara PriceChangeController::store() y encola sincronizaciones a MercadoLibre y
		 * TiendaNube. Abriendo recién con la respuesta, el usuario tocaba el botón y no pasaba nada
		 * durante un rato largo, sin ninguna señal de que el sistema lo hubiera escuchado.
		 */
		info() {
			let self = this
			let mi_pedido = this.$store.state.article.final_price_description_pedido + 1

			// Se limpia lo anterior: sin esto se ve un instante el desglose del artículo o de la
			// lista que se miró antes, que es peor que no ver nada.
			this.$store.commit('article/set_final_price_description', [])
			this.$store.commit('article/set_final_price_detalle', [])
			this.$store.commit('article/set_final_price_description_error', null)
			this.$store.commit('article/set_final_price_description_cargando', true)
			this.$store.commit('article/set_final_price_description_pedido', mi_pedido)

			this.$bvModal.show('final-price-description')

			this.$api.get('article/final-price-description/'+this.article.id)
			.then(res => {
				// Llegó una respuesta vieja: ya hay otro pedido en vuelo y este no tiene que tocar
				// nada, ni el desglose ni el spinner.
				if (self.$store.state.article.final_price_description_pedido !== mi_pedido) {
					return
				}

				// Array.isArray y no un truthy pelado: si la respuesta trae algo que no es un array
				// (pasa cuando el back no tiene nada que calcular), un objeto es truthy y terminaria
				// guardado en un state declarado como Array, con warning de Vue y el modal vacio.
				self.$store.commit('article/set_final_price_detalle', Array.isArray(res.data.detalle) ? res.data.detalle : [])
				self.$store.commit('article/set_final_price_description', res.data.description)
				self.$store.commit('article/set_final_price_description_cargando', false)
			})
			.catch(err => {
				console.log(err)

				if (self.$store.state.article.final_price_description_pedido !== mi_pedido) {
					return
				}

				// El .catch() no es prolijidad: sin él el spinner queda girando para siempre, que es
				// justo el modo de falla que este cambio introduce al abrir el modal antes de tiempo.
				// Sin $toast.error propio: el interceptor global de main.js ya dispara el aviso de
				// error para cualquier respuesta fallida, asi que sumarle uno mas dejaba TRES avisos
				// por un solo error (el bloque de adentro del modal, este toast, y el global). El de
				// adentro del modal es el que hace falta: el modal ya esta abierto y tiene que
				// explicar por que esta vacio.
				self.$store.commit('article/set_final_price_description_error', 'No se pudo obtener el cálculo del precio')
				self.$store.commit('article/set_final_price_description_cargando', false)
			})
		}
	}
}
</script>
<style lang="sass">
.cont-final-price
	display: flex
	flex-direction: row
	justify-content: flex-start
	align-items: center

	p
		font-size: 2.5em
		margin: 0
		font-weight: bold
</style>
