<template>
	<!--
		Panel de canje de puntos del cliente (extension puntos_clientes).

		Molde visual: Discounts.vue de esta misma carpeta. Reusa las clases vender-rate-panel__*
		de components/vender/sass/_vender-client-block.sass, que ya esta importado por
		VenderStages.vue; los pocos estilos propios viven abajo, en este mismo archivo.
	-->
	<div
	v-if="mostrar_panel"
	class="vender-rate-panel vender-rate-panel--puntos">

		<div class="vender-rate-panel__box">

			<!-- Cabecera: el saldo del cliente y cuanto vale en pesos -->
			<div class="vender-rate-panel__header">
				<div class="vender-rate-panel__header-text">
					<span class="vender-rate-panel__title">Puntos del cliente</span>
					<span class="vender-rate-panel__subtitle">
						{{ client.name }}
					</span>
				</div>

				<span
				v-if="loading"
				class="vender-puntos__saldo vender-puntos__saldo--loading">
					Buscando los puntos...
				</span>

				<span
				v-else
				class="vender-puntos__saldo">
					Tiene {{ puntos_es(saldo) }} puntos = {{ price(equivalencia_pesos) }}
				</span>
			</div>

			<div class="vender-rate-panel__body">

				<!-- Canje ya aplicado a esta venta -->
				<div
				v-if="canje_aplicado"
				class="vender-rate-panel__section vender-puntos__aplicado">
					<span class="vender-rate-panel__section-label">
						Canje aplicado
					</span>
					<div class="vender-puntos__aplicado-row">
						<span class="vender-puntos__aplicado-texto">
							Se canjean {{ puntos_es(canje_aplicado) }} puntos y la venta baja
							{{ price(descuento_aplicado) }}
						</span>
						<b-button
						size="sm"
						variant="outline-danger"
						@click="quitar_canje">
							<i class="icon-trash"></i>
							Quitar
						</b-button>
					</div>
					<span class="vender-rate-panel__section-hint vender-puntos__hint-total">
						Total de la venta con el canje: {{ price(total_vender) }}
					</span>
				</div>

				<!-- Editando una venta guardada: el canje no se puede tocar desde aca -->
				<div
				v-else-if="en_edicion"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-hint">
						El canje de puntos se hace al crear la venta. Editando un comprobante ya
						guardado no se puede canjear desde acá.
					</span>
					<span
					v-if="canje_de_la_venta_editada"
					class="vender-rate-panel__section-hint vender-puntos__alerta">
						Ojo: esta venta se guardó con un canje de
						{{ puntos_es(canje_de_la_venta_editada) }} puntos. Al guardar la edición el
						canje se deshace y esos puntos vuelven al cliente.
					</span>
				</div>

				<!-- El cliente todavia no llega al minimo: se dice cuanto le falta -->
				<div
				v-else-if="!llega_al_minimo"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-hint">
						Le faltan {{ puntos_es(falta_para_el_minimo) }} puntos para poder canjear:
						hacen falta al menos {{ puntos_es(minimo_canje) }}.
					</span>
				</div>

				<!-- La venta es demasiado chica para el minimo de canje -->
				<div
				v-else-if="max_por_tope < minimo_canje"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-hint">
						Con puntos se puede pagar hasta el {{ porcentaje_es(tope_porcentaje) }}% de
						la compra ({{ price(tope_en_pesos) }}), y con eso no se llega al mínimo de
						{{ puntos_es(minimo_canje) }} puntos. Agregá artículos para poder canjear.
					</span>
				</div>

				<!-- Formulario de canje -->
				<div
				v-else
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Canjear puntos
					</span>

					<span class="vender-rate-panel__section-hint">
						Puede canjear hasta {{ puntos_es(max_canjeable) }} puntos
						({{ price(max_canjeable * valor_punto) }}) en esta venta.
					</span>

					<div class="vender-puntos__form">
						<b-form-input
						id="puntos_a_canjear"
						type="number"
						min="0"
						:max="max_canjeable"
						placeholder="Puntos"
						class="vender-puntos__input"
						@keyup.enter="canjear"
						v-model="puntos_input"></b-form-input>

						<b-button
						variant="primary"
						class="vender-puntos__btn"
						@click="canjear">
							<i class="icon-check"></i>
							Canjear
						</b-button>

						<b-button
						variant="outline-primary"
						class="vender-puntos__btn"
						@click="canjear_el_maximo">
							Canjear el máximo
						</b-button>
					</div>

					<span
					v-if="equivalencia_del_input"
					class="vender-rate-panel__section-hint vender-puntos__hint-total">
						{{ puntos_es(puntos_pedidos) }} puntos descuentan
						{{ price(equivalencia_del_input) }}
					</span>

					<span
					v-if="error_local"
					class="vender-puntos__error">
						{{ error_local }}
					</span>
				</div>

				<!-- Avisos que genera el propio panel al recortar un canje que dejo de entrar -->
				<span
				v-if="aviso"
				class="vender-rate-panel__section-hint vender-puntos__alerta">
					{{ aviso }}
				</span>

			</div>
		</div>
	</div>
</template>
<script>
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
export default {
	name: 'VenderPuntos',
	/*
		Los dos mixins son los mismos que usa Discounts.vue, y por la misma razon: `vender` trae
		el cliente de la venta y `vender_set_total` trae setTotal() junto con todo lo que
		setTotal() necesita para correr (getTotalItem, setItemsPrices, los recargos). Llamar a
		setTotal() sin `vender` explota apenas hay un item en la venta.
	*/
	mixins: [vender, vender_set_total],
	data() {
		return {
			/* Lo que el vendedor escribe en el input. Es string: viene de un <b-form-input> */
			puntos_input: null,

			/* Error de validacion local, el que evita que el vendedor llegue al 422 */
			error_local: '',

			/* Aviso del panel cuando el canje se recorta solo porque cambio la venta */
			aviso: '',
		}
	},
	computed: {
		tiene_extencion() {
			return this.hasExtencion('puntos_clientes')
		},
		loading() {
			return this.$store.state.puntos.loading
		},
		saldo() {
			return Number(this.$store.state.puntos.saldo_cliente)
		},
		equivalencia_pesos() {
			return Number(this.$store.state.puntos.equivalencia_pesos)
		},
		valor_punto() {
			return Number(this.$store.state.puntos.config.valor_punto)
		},
		minimo_canje() {
			return Number(this.$store.state.puntos.config.minimo_canje)
		},
		tope_porcentaje() {
			return Number(this.$store.state.puntos.config.tope_porcentaje)
		},
		client_id() {
			return this.client ? this.client.id : null
		},
		/*
			Sin programa activo la API devuelve 200 con TODO en cero y puede_canjear en false
			--a proposito: un 403 ahi abriria el modal de error global en el medio de una venta--.
			Ese cero es la senal de que no hay programa, y con valor_punto en cero no hay panel
			que mostrar: el canje no vale nada.
		*/
		programa_activo() {
			return this.valor_punto > 0
		},
		mostrar_panel() {
			return this.tiene_extencion && !!this.client && this.programa_activo
		},
		en_edicion() {
			return this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.budget
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		canje_de_la_venta_editada() {
			if (!this.en_edicion || !this.previus_sale) {
				return 0
			}
			return Number(this.previus_sale.puntos_canjeados)
		},
		canje_aplicado() {
			return Number(this.$store.state.vender.puntos_canjeados)
		},
		descuento_aplicado() {
			return Number(this.$store.state.vender.descuento_puntos)
		},
		total_vender() {
			return Number(this.$store.state.vender.total)
		},
		/*
			El total de la venta ANTES del canje, que es exactamente la base contra la que el
			servidor mide el tope (PuntosCanjeHelper: `total + descuento_puntos`). Se calcula con
			la misma formula justamente para que las dos puntas midan el mismo numero.

			Ademas es invariante respecto del canje --sumarle el descuento devuelve el bruto sin
			importar cuanto se este canjeando--, y de eso depende que el watcher de abajo no se
			cicle: recortar el canje no cambia este valor.
		*/
		total_bruto() {
			let descuento = this.descuento_aplicado ? this.descuento_aplicado : 0
			return this.total_vender + descuento
		},
		tope_en_pesos() {
			return this.total_bruto * this.tope_porcentaje / 100
		},
		/* Cuantos puntos entran en el tope. Piso, nunca redondeo: pasarse un punto es un 422 */
		max_por_tope() {
			if (this.valor_punto <= 0) {
				return 0
			}
			return Math.floor(this.tope_en_pesos / this.valor_punto)
		},
		/*
			Puntos enteros a proposito. El saldo es decimal(20,2) del lado de la base, pero
			ofrecer medio punto en el mostrador no le sirve a nadie y abre la puerta a que el
			redondeo del front y el del servidor no den lo mismo.
		*/
		max_canjeable() {
			let por_saldo = Math.floor(this.saldo)
			if (por_saldo < this.max_por_tope) {
				return por_saldo
			}
			return this.max_por_tope
		},
		llega_al_minimo() {
			return this.saldo + 0.01 >= this.minimo_canje
		},
		falta_para_el_minimo() {
			let falta = this.minimo_canje - this.saldo
			return falta > 0 ? Math.ceil(falta) : 0
		},
		puntos_pedidos() {
			let puntos = Math.floor(Number(this.puntos_input))
			return puntos > 0 ? puntos : 0
		},
		equivalencia_del_input() {
			if (!this.puntos_pedidos) {
				return 0
			}
			return this.calcular_descuento(this.puntos_pedidos)
		},
	},
	watch: {
		/*
			El disparador del pedido de saldo es el CLIENTE DE LA VENTA, no un evento del
			buscador: stage-1/SelectClient.vue commitea vender/setClient en tres lugares
			distintos y limpiar_vender() en un cuarto, y mirando el state se ven los cuatro
			igual. La mutation no puede hacer el dispatch por su cuenta (una mutation de Vuex
			recibe solo (state, value) y no tiene dispatch), asi que el pedido vive aca.

			immediate: entrar a VENDER con una venta ya cargada --editando un comprobante
			guardado, por ejemplo-- tambien tiene que mostrar los puntos del cliente.
		*/
		client_id: {
			immediate: true,
			handler(client_id) {
				this.pedir_saldo(client_id)
			},
		},
		/*
			Si la venta cambia despues del canje (se saca un articulo, se agrega un descuento),
			el canje aplicado puede quedar por encima del tope. Sin esto, el vendedor cierra la
			venta y se come un 422 del servidor sin entender por que.
		*/
		total_bruto() {
			this.revisar_canje_contra_el_total()
		},
		/*
			El canje no siempre lo borra este componente: la mutation vender/setClient lo pone en
			null cuando el operador cambia o quita el cliente, y una mutation no puede llamar a
			setTotal(). Sin este watcher el total de la venta se queda con el descuento del
			cliente ANTERIOR restado, y el vendedor cobra de menos sin que nada avise.

			Solo el paso de "habia canje" a "no hay": aplicar un canje ya recalcula el total en
			aplicar_canje(). Que quitar_canje() dispare un setTotal() de mas no molesta --es
			idempotente y este modulo lo llama en cada tecla-- y sale mucho mas barato que una
			bandera para distinguir quien borro el canje.
		*/
		canje_aplicado(nuevo, viejo) {
			if (!nuevo && viejo) {
				this.setTotal()
			}
		},
	},
	methods: {
		/**
		 * Pide el saldo del cliente elegido.
		 *
		 * @param {Number} client_id
		 */
		pedir_saldo(client_id) {

			this.puntos_input = null
			this.error_local = ''
			this.aviso = ''

			/*
				🔴 Sin la extension NO se llama al endpoint. El grupo de rutas del modulo esta
				gateado por la extension y responde 403, y un 403 en el medio de una venta abre
				el modal de error global sobre el mostrador.
			*/
			if (!this.tiene_extencion) {
				return
			}

			if (!client_id) {
				this.$store.commit('puntos/limpiarCliente')
				return
			}

			this.$store.dispatch('puntos/getDisponible', client_id)
		},
		/**
		 * Los pesos que descuentan N puntos.
		 *
		 * 🔴 La misma cuenta que PuntosCanjeHelper::calcular_descuento(), redondeo incluido:
		 * round(puntos * valor_punto, 2). El servidor la recalcula y la compara con este numero
		 * con tolerancia de un centavo, y si no coincide rechaza la venta entera con 422. Por
		 * eso valor_punto sale de /api/puntos/disponible y no de ninguna constante de acá.
		 *
		 * @param {Number} puntos
		 * @returns {Number}
		 */
		calcular_descuento(puntos) {
			return Math.round(puntos * this.valor_punto * 100) / 100
		},
		canjear() {

			this.aviso = ''
			this.error_local = ''

			let puntos = this.puntos_pedidos

			if (!puntos) {
				this.error_local = 'Escribí cuántos puntos querés canjear.'
				return
			}

			/*
				Las tres validaciones son las mismas del servidor y con el mismo texto, para que
				el vendedor no llegue al 422 y, si igual llega (otra pestaña le movio el saldo),
				lea dos veces la misma frase y no dos explicaciones distintas.
			*/
			if (puntos < this.minimo_canje) {
				this.error_local = 'Hacen falta al menos '+this.puntos_es(this.minimo_canje)+' puntos para canjear.'
				return
			}

			if (puntos > this.saldo) {
				this.error_local = 'El cliente tiene '+this.puntos_es(this.saldo)+' puntos disponibles.'
				return
			}

			if (puntos > this.max_por_tope) {
				this.error_local = 'Con puntos se puede pagar hasta el '+this.porcentaje_es(this.tope_porcentaje)+'% de la compra ('+this.price(this.tope_en_pesos)+').'
				return
			}

			this.aplicar_canje(puntos)
		},
		canjear_el_maximo() {
			this.puntos_input = this.max_canjeable
			this.canjear()
		},
		/**
		 * Deja el canje en el store y recalcula el total de la venta.
		 *
		 * @param {Number} puntos
		 */
		aplicar_canje(puntos) {

			this.$store.commit('vender/set_puntos_canjeados', puntos)
			this.$store.commit('vender/set_descuento_puntos', this.calcular_descuento(puntos))

			this.puntos_input = null
			this.error_local = ''

			/*
				setTotal() es lo que baja el total con el canje: el descuento lo aplica
				mixins/vender_set_total.js dentro de la cuenta, en el orden en el que el servidor
				lo espera. Es el mismo camino que usan Discounts.vue y Surchages.vue.
			*/
			this.setTotal()
		},
		quitar_canje() {

			this.$store.commit('vender/set_puntos_canjeados', null)
			this.$store.commit('vender/set_descuento_puntos', null)

			this.puntos_input = null
			this.error_local = ''
			this.aviso = ''

			this.setTotal()
		},
		/**
		 * Recorta o quita el canje cuando la venta cambio y el canje aplicado ya no entra.
		 *
		 * No se cicla: total_bruto es invariante respecto del canje, asi que recortarlo no
		 * vuelve a disparar el watcher que llama a este metodo.
		 */
		revisar_canje_contra_el_total() {

			if (!this.canje_aplicado) {
				return
			}

			if (this.canje_aplicado <= this.max_canjeable) {
				return
			}

			if (this.max_canjeable >= this.minimo_canje) {

				this.aplicar_canje(this.max_canjeable)
				this.aviso = 'Cambió la venta: el canje se recortó a '+this.puntos_es(this.max_canjeable)+' puntos, que es el '+this.porcentaje_es(this.tope_porcentaje)+'% de la compra.'

			} else {

				this.quitar_canje()
				this.aviso = 'Cambió la venta y el canje ya no entra: se quitó el canje de puntos.'
			}
		},
		/**
		 * Formatea una cantidad de puntos con separador de miles y sin decimales.
		 *
		 * No se usa price(): los puntos no son plata y mostrarlos con signo de peso es
		 * exactamente la confusion que este modulo tiene que evitar en el mostrador.
		 *
		 * @param {Number} puntos
		 * @returns {String}
		 */
		puntos_es(puntos) {
			let numero = Number(puntos)
			if (isNaN(numero)) {
				return '0'
			}
			return this.numero_es_con_decimales(Math.round(numero), 0)
		},
	},
}
</script>
<style lang="sass">
/* Acento superior propio del panel de puntos: violeta, distinto de descuentos y recargos */
.vender-rate-panel--puntos .vender-rate-panel__box
	border-top: 3px solid #6f42c1

.vender-rate-panel--puntos .vender-rate-panel__header
	background: rgba(111, 66, 193, 0.07)

.vender-rate-panel--puntos .vender-rate-panel__title
	color: #59359a

/* El saldo del cliente, que es lo que el vendedor lee de un vistazo */
.vender-puntos__saldo
	font-weight: 700
	font-size: 0.9rem
	color: #59359a
	white-space: nowrap

.vender-puntos__saldo--loading
	font-weight: 400
	color: var(--color-text-secondary, #6c757d)

.vender-puntos__form
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 8px

.vender-puntos__input
	width: 130px
	flex: 0 0 auto

.vender-puntos__btn
	flex: 0 0 auto
	display: inline-flex
	align-items: center
	gap: 4px

.vender-puntos__hint-total
	display: block
	margin: 8px 0 0

.vender-puntos__error
	display: block
	margin-top: 8px
	font-size: 0.78rem
	font-weight: 600
	color: #b02a37

.vender-puntos__alerta
	display: block
	margin-top: 8px
	color: #b45309

.vender-puntos__aplicado
	border-color: #6f42c1
	background: rgba(111, 66, 193, 0.06)

.vender-puntos__aplicado-row
	display: flex
	flex-wrap: wrap
	justify-content: space-between
	align-items: center
	gap: 8px

.vender-puntos__aplicado-texto
	font-size: 0.85rem
	font-weight: 600
	color: var(--color-text-primary, #212529)
	min-width: 0

/* Tablet: VENDER se usa mucho en tablet y el saldo no puede quedar apretado contra el titulo */
@media (max-width: 1024px)
	.vender-puntos__saldo
		white-space: normal

/* Telefono: el input y los dos botones ocupan el ancho completo para tocarlos con el dedo */
@media (max-width: 767px)
	.vender-puntos__form
		flex-direction: column
		align-items: stretch

	.vender-puntos__input
		width: 100%

	.vender-puntos__btn
		width: 100%
		justify-content: center
</style>
