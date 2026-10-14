<template>
	<div
	v-if="!article.article_variants.length && addresses.length">

		<!--
			En edición: dos botones con texto, apilados para no ensanchar la columna Stock. Antes eran
			dos íconos solos (cruz roja y check verde) al lado del botón verde de entrar, y se
			confundían: el caso de trama (14/10/2026) fue un empleado que para "cerrar" tocó el check,
			que GUARDA.
		-->
		<div
		v-if="se_esta_editando_stock"
		key="acciones"
		class="edit-addresses-stock-btn__acciones">

			<b-button
			size="sm"
			data-testid="btn-cancelar-depositos"
			title="Cerrar la edición sin guardar: el stock de cada depósito queda como está"
			:disabled="esta_guardando_stock"
			@click.stop="cancel"
			variant="outline-danger">
				<i class="icon-cancel"></i>
				<span class="edit-addresses-stock-btn__texto">Cancelar</span>
			</b-button>

			<b-button
			size="sm"
			dusk="btn_guardar_depositos"
			data-testid="btn-guardar-depositos"
			title="Guardar el stock y los mínimos y máximos que cambiaste en cada depósito"
			:disabled="esta_guardando_stock"
			@click.stop="actualizar"
			variant="success">
				<i class="icon-check"></i>
				<span class="edit-addresses-stock-btn__texto">Guardar stock</span>
			</b-button>
		</div>

		<!--
			Mientras se trae el stock actual para abrir la edición, el botón de entrar se cambia por
			este (sin dusk ni data-testid a propósito): un segundo click no dispara otro pedido, y los
			specs de Playwright que reintentan la apertura no clickean un botón que está por
			desaparecer.
		-->
		<b-button
		v-else-if="!article.unidades_individuales && esta_trayendo_stock"
		key="trayendo"
		size="sm"
		class="m-l-10"
		disabled
		title="Trayendo el stock actual del artículo"
		variant="outline-success">
			<b-spinner
			small></b-spinner>
		</b-button>

		<b-button
		v-else-if="!article.unidades_individuales"
		key="editar"
		size="sm"
		class="m-l-10"
		dusk="btn_editar_depositos"
		data-testid="btn-editar-depositos"
		title="Editar el stock por depósito"
		@click.stop="edit_addresses"
		variant="outline-success">
			<i class="icon-location"></i>
		</b-button>
	</div>
</template>
<script>
import axios from 'axios'
import permiso_stock_por_sucursal from '@/mixins/listado/permiso_stock_por_sucursal'

/*
	Diferencia mínima para considerar que un número cambió. Es la misma tolerancia con la que
	empresa-api compara `amount` contra `amount_original`.
*/
const TOLERANCIA_STOCK = 0.0001

/**
 * Stock de un input o de un pivot como número. Vacío o null cuenta como 0, igual que en
 * empresa-api (`(float) ''` es 0): un depósito sin fila y uno en 0 no son un cambio.
 *
 * @param {*} valor
 * @returns {Number}
 */
function stock_como_numero(valor) {
	if (valor === null || typeof valor == 'undefined' || valor === '') {
		return 0
	}
	let numero = Number(valor)
	return isNaN(numero) ? 0 : numero
}

/**
 * Mínimo o máximo como número, o null si está vacío. Acá vacío NO es 0: sin mínimo no es lo
 * mismo que mínimo 0.
 *
 * @param {*} valor
 * @returns {Number|null}
 */
function limite_como_numero(valor) {
	if (valor === null || typeof valor == 'undefined' || valor === '') {
		return null
	}
	let numero = Number(valor)
	return isNaN(numero) ? null : numero
}

/**
 * @param {Number|null} a
 * @param {Number|null} b
 * @returns {Boolean}
 */
function numeros_distintos(a, b) {
	if (a === null || b === null) {
		return a !== b
	}
	return Math.abs(a - b) > TOLERANCIA_STOCK
}

/**
 * Mínimo o máximo tal como viaja en el PUT: un input vaciado ('') va como null. Las columnas son
 * enteras y la base está en modo estricto: un '' ahí adentro es un error 500.
 *
 * @param {*} valor
 * @returns {*}
 */
function limite_para_enviar(valor) {
	if (valor === '' || typeof valor == 'undefined') {
		return null
	}
	return valor
}

/**
 * Valor de un pivot para mostrar en un input: null o ausente se muestra vacío.
 *
 * @param {*} valor
 * @returns {*}
 */
function valor_para_input(valor) {
	if (valor === null || typeof valor == 'undefined') {
		return ''
	}
	return valor
}

export default {
	mixins: [
		permiso_stock_por_sucursal,
	],
	props: {
		article: Object,
	},
	computed: {
		addresses() {
			return this.$store.state.address.models
		},
		selected_article() {
			return this.$store.state.article.edit_addresses_stock.article
		},
		se_esta_editando_stock() {
			return this.selected_article && this.selected_article.id == this.article.id
		},
		esta_trayendo_stock() {
			return this.$store.state.article.edit_addresses_stock.trayendo_article_id == this.article.id
		},
		esta_guardando_stock() {
			return this.$store.state.article.edit_addresses_stock.guardando
		},
	},
	methods: {
		/**
		 * Abre la edición del stock por depósito de esta fila.
		 *
		 * 🔴 Antes de abrir se trae el artículo FRESCO (misión stock-sucursal-desde-listado,
		 * 14/10/2026). La fila puede ser de hace horas: si otro empleado movió stock en el medio,
		 * editar sobre lo viejo y guardar deshacía ese movimiento. Con lo que viene se actualiza la
		 * fila en el lugar (así muestra lo real, venga de la lista que venga) y se arman los
		 * renglones y los originales de la edición. Si el pedido falla, no se entra en edición.
		 */
		edit_addresses() {
			let self = this
			let article_id = this.article.id

			if (this.esta_trayendo_stock || this.se_esta_editando_stock) {
				return
			}

			this.$store.commit('article/edit_addresses_stock/set_trayendo_article_id', article_id)
			this.$store.commit('auth/setMessage', 'Trayendo el stock actual')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('article/'+article_id)
			.then(res => {
				self.$store.commit('article/edit_addresses_stock/set_trayendo_article_id', null)
				self.$store.commit('auth/setLoading', false)

				let model = res.data ? res.data.model : null

				if (!model || !Array.isArray(model.addresses)) {
					self.$toast.error('No se abrió la edición del stock por depósito: no pudimos traer el stock actual del artículo. Volvé a intentar.')
					return
				}

				self.actualizar_stock_de_la_fila(model)

				self.$toast.warning('Lo que pongas en cada depósito va a ser su stock final: el sistema NO lo suma al stock actual, lo SOBRE ESCRIBE.', {
					duration: 10000,
				})

				self.$store.commit('article/edit_addresses_stock/iniciar_edicion', self.armar_edicion_de_stock())
			})
			.catch(err => {
				self.$store.commit('article/edit_addresses_stock/set_trayendo_article_id', null)
				self.$store.commit('auth/setLoading', false)
				console.log(err)

				// Un pedido cancelado porque el usuario se fue de la pantalla no es un error para él.
				if (axios.isCancel(err)) {
					return
				}

				self.$toast.error('No se abrió la edición del stock por depósito: no pudimos traer el stock actual del artículo. Volvé a intentar.')
			})
		},
		/**
		 * Pisa, en el mismo objeto de la fila, el stock por depósito y el stock global con lo que
		 * vino de la API. En el lugar y no con `article/add`: la fila es la que se está mirando y
		 * puede venir de `models` o de `filtered`.
		 *
		 * @param {Object} model Artículo devuelto por la API.
		 */
		actualizar_stock_de_la_fila(model) {
			if (!model) {
				return
			}

			if (Array.isArray(model.addresses)) {

				if (Array.isArray(this.article.addresses)) {
					this.article.addresses.splice(0, this.article.addresses.length, ...model.addresses)
				} else {
					this.$set(this.article, 'addresses', model.addresses)
				}
			}

			if (typeof model.stock != 'undefined') {
				this.article.stock = model.stock
			}
		},
		/**
		 * Un renglón por sucursal del comercio, con lo que tiene ahora la fila (recién traída), y
		 * lo que había al abrir para comparar al guardar.
		 *
		 * @returns {Object} { article, addresses, originales }
		 */
		armar_edicion_de_stock() {
			let renglones = []
			let originales = {}

			this.addresses.forEach(address => {

				let article_address = this.article.addresses.find(_address => _address.id == address.id)

				let pivot = null
				if (typeof article_address != 'undefined' && article_address.pivot) {
					pivot = article_address.pivot
				}

				// `amount` original null = el artículo no tenía fila en esa sucursal (contrato con
				// la API: `amount_original` null).
				let amount = pivot && typeof pivot.amount != 'undefined' ? pivot.amount : null
				let stock_min = pivot && typeof pivot.stock_min != 'undefined' ? pivot.stock_min : null
				let stock_max = pivot && typeof pivot.stock_max != 'undefined' ? pivot.stock_max : null

				originales[address.id] = {
					amount: amount,
					stock_min: stock_min,
					stock_max: stock_max,
				}

				renglones.push({
					id: address.id,
					pivot: {
						amount: valor_para_input(amount),
						stock_min: valor_para_input(stock_min),
						stock_max: valor_para_input(stock_max),
					},
				})
			})

			return {
				article: this.article,
				addresses: renglones,
				originales: originales,
			}
		},
		/**
		 * Los renglones que viajan en el PUT: SOLO los que el usuario cambió (stock, mínimo o
		 * máximo distinto de lo que había al abrir) y de una sucursal que puede editar. Cada uno
		 * lleva `pivot.amount_original`, para que la API pueda rechazar el guardado (409) si el
		 * stock de esa sucursal cambió mientras se editaba. Una API vieja ignora ese campo.
		 *
		 * @returns {Array}
		 */
		renglones_para_guardar() {
			let edicion = this.$store.state.article.edit_addresses_stock
			let para_guardar = []

			edicion.addresses.forEach(renglon => {

				if (!this.puede_editar_stock_de_sucursal(renglon.id)) {
					return
				}

				let original = edicion.originales[renglon.id]
				if (typeof original == 'undefined') {
					original = {
						amount: null,
						stock_min: null,
						stock_max: null,
					}
				}

				let cambio = numeros_distintos(stock_como_numero(renglon.pivot.amount), stock_como_numero(original.amount))
					|| numeros_distintos(limite_como_numero(renglon.pivot.stock_min), limite_como_numero(original.stock_min))
					|| numeros_distintos(limite_como_numero(renglon.pivot.stock_max), limite_como_numero(original.stock_max))

				if (!cambio) {
					return
				}

				// Viajan los tres campos aunque haya cambiado uno solo: la API escribe el mínimo y
				// el máximo juntos, y uno ausente lo dejaría en null.
				para_guardar.push({
					id: renglon.id,
					pivot: {
						amount: renglon.pivot.amount,
						stock_min: limite_para_enviar(renglon.pivot.stock_min),
						stock_max: limite_para_enviar(renglon.pivot.stock_max),
						amount_original: original.amount,
					},
				})
			})

			return para_guardar
		},
		cancel() {
			// Lo tipeado vive en el store: con limpiarlo, la fila ya muestra el stock real.
			this.$store.commit('article/edit_addresses_stock/limpiar_edicion')
		},
		actualizar() {
			let self = this
			let article_id = this.article.id

			/*
				Guarda contra el doble click: el estado vive en el store y el commit es sincrónico,
				así que el segundo click lo ve prendido aunque llegue en el mismo tick. Se apaga en
				todos los caminos (éxito, 409 y error) con `limpiar_edicion`.
			*/
			if (this.esta_guardando_stock) {
				return
			}
			this.$store.commit('article/edit_addresses_stock/set_guardando', true)

			this.$store.commit('auth/setMessage', 'Actualizando Stock')
			this.$store.commit('auth/setLoading', true)

			// El PUT sale SIEMPRE, aunque no haya cambios (addresses vacío): los specs de Playwright
			// de los depósitos esperan el PUT y la recarga del artículo después de guardar.
			this.$api.put('article-update-addresses', {
				article_id: article_id,
				addresses: this.renglones_para_guardar(),
			})
			.then(res => {
				if (res.data && res.data.model) {
					self.actualizar_stock_de_la_fila(res.data.model)
				}
				self.$store.commit('article/edit_addresses_stock/limpiar_edicion')
				self.$store.commit('auth/setLoading', false)
				// self.$toast.success('Actualizado correctamente')
				self.loadModel('article', article_id)
			})
			.catch(err => {
				self.$store.commit('auth/setLoading', false)

				/*
					409: el stock de alguna sucursal que se cambió ya no es el que había al abrir (otro
					empleado lo movió en el medio). La API no guardó NADA y devuelve el artículo
					actualizado: la fila queda con lo real y se sale de la edición, para que el
					usuario vuelva a abrir y decida. Sin toast propio: el `message` de la API ya lo
					muestra el handler global de errores (10 segundos).
				*/
				if (err && err.response && err.response.status == 409) {
					if (err.response.data && err.response.data.model) {
						self.actualizar_stock_de_la_fila(err.response.data.model)
					}
					self.$store.commit('article/edit_addresses_stock/limpiar_edicion')
					return
				}

				self.$store.commit('article/edit_addresses_stock/limpiar_edicion')
				console.log(err)
				self.$toast.error('Error al actualizar')
			})
		}
	}
}
</script>
<style lang="sass">
.edit-addresses-stock-btn__acciones
	display: flex
	flex-direction: column
	align-items: stretch
	margin-left: 10px

	.btn
		white-space: nowrap

	.btn + .btn
		margin-top: 5px

// El margen va en el texto y no en el ícono: el compilador de plantillas se come el espacio
// entre el ícono y el texto cuando están en líneas distintas.
.edit-addresses-stock-btn__texto
	margin-left: .4rem
</style>
