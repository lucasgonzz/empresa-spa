<template>
	<b-col
	cols="12"
	lg="6"
	class="col-total">
		<div
		class="cont-total">

			<!-- <p 
			v-if="sub_total != total"
			class="m-0">
				<strong class="sub-total">
					Sub Total: {{ price(sub_total) }}
				</strong>
			</p> -->
			<p class="m-0 venta-total-box">
				<!--
					🔴 El `data-monto` no es redundante con el texto: `price()` recorta los decimales
					cuando son ",00", asi que del texto no siempre se puede sacar el numero. Mismo
					patron que los renglones de Posicion Fiscal.
				-->
				<strong
				v-if="!editando_total_forzado"
				data-testid="venta-total-remito"
				:data-monto="total"
				dusk="total">
					Total: {{ price(total) }}
				</strong>

				<!--
					El input inline del total forzado (extension forzar_total). Reemplaza al numero
					mientras se edita: el vendedor tipea el total que quiere cobrar y el sistema
					calcula el ajuste.

					Confirma con Enter o saliendo del campo, cancela con Escape.

					Es un v-if propio y no el v-else del <strong> de arriba a proposito: entre los
					dos hay un comentario, y el v-else depende de que el compilador de plantillas
					los deje pegados. Dos v-if no dependen de eso.
				-->
				<input
				v-if="editando_total_forzado"
				ref="input_total_forzado"
				v-model="total_tipeado"
				type="number"
				step="0.01"
				min="0"
				class="input-total-forzado"
				data-testid="input-total-forzado"
				aria-label="Total a cobrar"
				@keydown.enter="confirmar_total_forzado"
				@keydown.esc="cancelar_total_forzado"
				@blur="confirmar_total_forzado">

				<button
				v-if="puede_forzar_total && !editando_total_forzado"
				type="button"
				class="btn-forzar-total"
				data-testid="btn-forzar-total"
				title="Editar el total a cobrar"
				aria-label="Editar el total a cobrar"
				@click="abrir_total_forzado">
					<i class="bi bi-pencil"></i>
				</button>
			</p>
			<p class="m-t-10">
				{{ items.length }} productos, {{ cantidad_unidades }} unidades
			</p>

			<!--
				El renglon del ajuste. Va siempre que haya monto forzado, tambien al abrir una venta
				guardada: el vendedor tiene que poder ver que ese total no sale de los items solos.
			-->
			<p
			v-if="forzar_total_monto"
			class="m-0"
			data-testid="renglon-total-forzado">
				<strong>{{ signo_total_forzado }}</strong>
				Total forzado: {{ price(monto_total_forzado_absoluto) }}
			</p>

			<!--
				El descuento en PORCENTAJE es el campo viejo de esta misma extension. Ya no lo
				escribe nadie desde VENDER --el lapiz de arriba guarda un monto-- pero sigue
				llegando en las ventas historicas que se abren para editar, y ahi se tiene que ver.
			-->
			<p
			v-if="descuento"
			class="m-0">
				<strong>- {{ Math.round(descuento) }}%</strong>
			</p>
			<p
			class="m-0"
			v-for="discount in sale_discounts">
				<strong>-</strong> {{ discount.name }} {{ porcentaje_es(discount.percentage) }}%
			</p>
			<p
			class="m-0"
			v-for="surchage in sale_surchages">
				<strong>+</strong> {{ surchage.name }} {{ porcentaje_es(surchage.percentage) }}%
			</p>
		</div>

		
		<!-- Este no pide nada al servidor: el desglose lo arma el front (mixins/vender_set_total.js)
		     y ya esta en el store, asi que el v-b-modal directo abre al instante y esta bien. Lo
		     unico que cambia es la forma del boton, para que sea el mismo en los cinco lugares que
		     abren este modal. -->
		<b-button
		class="btn-explicacion m-l-10"
		variant="outline-secondary"
		title="Ver cómo se calculó este total"
		v-b-modal="'final-price-description'">
			<i class="bi bi-question-lg"></i>
		</b-button>

		<div
		class="cont-selects m-l-10">

			<price-type></price-type>

			<moneda></moneda>	
		</div>

		
		<price-description
		:price_descriptions="total_description"></price-description>

	</b-col>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components: {
		PriceType: () => import('@/components/vender/components/remito/total-previus-sales/price-type/Index'),
		Moneda: () => import('@/components/vender/components/remito/total-previus-sales/Moneda'),
		PriceDescription: () => import('@/components/common/PriceDescription'),
	},
	data() {
		return {
			/* Si el input inline del total forzado esta abierto */
			editando_total_forzado: false,
			/* Lo que el vendedor tipea adentro de ese input */
			total_tipeado: '',
			/*
				🔴 Escape cierra el input, y cerrarlo le saca el foco: el @blur dispara igual y,
				sin esta bandera, confirmaria justo lo que se acaba de cancelar. No sacarla.
			*/
			cancelando_total_forzado: false,
		}
	},
	computed: {
		total_description() {
			return this.$store.state.vender.total_description
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		sub_total() {
			return this.$store.state.vender.sub_total
		},
		total() {
			return this.$store.state.vender.total
		},
		items() {
			return this.$store.state.vender.items
		},
		cantidad_unidades() {
			let cant = 0
			this.items.forEach(item => {
				cant += Number(item.amount)
				if (item.returned_amount) {
					cant -= Number(item.returned_amount)
				}
			})
			// Este computed no lo usa nadie mas que la linea "X productos, Y unidades" del template
			// (chequeado en todo src el 21/8/2026), asi que devuelve texto de pantalla directo:
			// 1.234,50 en vez de 1234.50.
			return this.numero_es_con_decimales(cant, 2)
		},
		sale_discounts() {
			// if (this.previus_sale.id) {
			// 	return this.previus_sale.discounts
			// } 

			let sale_discounts_id = this.$store.state.vender.discounts_id
			let discounts = []
			this.$store.state.discount.models.forEach(discount => {
				if (sale_discounts_id.includes(discount.id)) {
					discounts.push(discount)
				}
			})
			return discounts
		},
		sale_surchages() {
			// if (this.previus_sale.id) {
			// 	return this.previus_sale.surchages
			// } 

			let sale_surchages_id = this.$store.state.vender.surchages_id
			let surchages = []
			this.$store.state.surchage.models.forEach(surchage => {
				if (sale_surchages_id.includes(surchage.id)) {
					surchages.push(surchage)
				}
			})
			return surchages
		},
		descuento() {
			return this.$store.state.vender.descuento
		},
		/*
			Monto con signo del total forzado. Se redeclara acá --tambien lo trae el mixin
			vender_set_total-- por el mismo criterio que `total` e `items` de más arriba: que el
			que lee este componente encuentre de dónde sale cada cosa del template.
		*/
		forzar_total_monto() {
			return this.$store.state.vender.forzar_total_monto
		},
		signo_total_forzado() {
			return Number(this.forzar_total_monto) < 0 ? '-' : '+'
		},
		monto_total_forzado_absoluto() {
			return Math.abs(Number(this.forzar_total_monto))
		},
		/*
			El lapiz existe solo con la extension prendida. Sin ella, esta caja se comporta
			exactamente como antes de la mision.

			El `total > 0` es el mismo que tenia el boton "Forzar" que este lapiz reemplaza:
			forzar el total de un remito vacio no significa nada.
		*/
		puede_forzar_total() {
			return this.hasExtencion('forzar_total') && this.total > 0
		},
	},
	methods: {
		abrir_total_forzado() {

			this.cancelando_total_forzado = false
			this.total_tipeado = this.total
			this.editando_total_forzado = true

			/*
				El input recien existe en el DOM en el proximo tick. Arranca con el total actual y
				con el texto SELECCIONADO para que el vendedor tipee encima sin tener que borrar,
				que es como se usa esto en el mostrador: con el cliente adelante.
			*/
			let self = this
			this.$nextTick(() => {
				let input = self.$refs.input_total_forzado
				if (input) {
					input.focus()
					input.select()
				}
			})
		},
		cancelar_total_forzado() {
			this.cancelando_total_forzado = true
			this.editando_total_forzado = false
		},
		confirmar_total_forzado() {

			if (!this.editando_total_forzado) {
				return
			}

			this.editando_total_forzado = false

			if (this.cancelando_total_forzado) {
				return
			}

			let tipeado = String(this.total_tipeado).trim()

			if (
				tipeado === ''
				|| isNaN(Number(tipeado))
				|| Number(tipeado) < 0
			) {
				this.$toast.warning('Escribi el total que queres cobrar')
				return
			}

			/*
				El total que se ve en pantalla YA tiene aplicado el forzado anterior, si habia uno.
				Para saber cuanto hay que ajustar primero se lo saca: si no, forzar dos veces
				seguidas iria restando sobre lo ya restado.
			*/
			let base = Number(this.total) - Number(this.forzar_total_monto || 0)

			let monto = Number(tipeado) - base

			/*
				Redondeo a centavos. La resta en punto flotante deja colas
				(4000 - 4012 = -11.999999999999545) que despues viajan a una columna
				decimal(22,2) y dejan el total corrido por un centavo del que el vendedor tipeo.
			*/
			monto = Math.round(monto * 100) / 100

			/*
				Monto cero no es un forzado: es el total que ya estaba. Va null para que la venta
				no quede marcada como ajustada cuando no se ajusto nada.
			*/
			this.$store.commit('vender/set_forzar_total_monto', monto ? monto : null)

			this.setTotal()
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.col-total
	display: flex
	flex-direction: row 
	justify-content: flex-start !important
	align-items: flex-start

	.cont-total
		flex-direction: column
		align-items: flex-start
		justify-content: flex-start
			
			
		@media screen and (min-width: 768px)
			p 
				text-align: left


	.price-type-name
		font-size: 20px
		align-self: center
		font-weight: bold
		margin-left: 50px



	.cont-selects
		width: 170px



.venta-total-box 
	background: linear-gradient(135deg, #007bff, #218838)
	color: #ffffff /* texto blanco para alto contraste */
	font-weight: bold
	font-size: 2rem /* texto grande para ser fácil de leer */
	padding: 20px 30px
	border-radius: 12px
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) /* sombra para dar relieve */
	text-align: center
	transition: transform 0.2s ease, box-shadow 0.2s ease
	display: flex
	align-items: center
	justify-content: center

	// El lapiz del total forzado (extension forzar_total), a la derecha del monto y adentro de
	// la caja. Escondido hasta que el mouse entra a la caja, para no ensuciar el numero.
	.btn-forzar-total
		background: transparent
		border: 0
		padding: 0
		margin-left: 14px
		color: #ffffff
		font-size: 1.3rem
		line-height: 1
		cursor: pointer
		opacity: 0
		transition: opacity 0.2s ease

	// focus-within ademas de hover: con opacity 0 el boton sigue siendo alcanzable con el
	// teclado, y si no se mostrara al recibir el foco el que navega con Tab lo estaria
	// apretando a ciegas.
	&:hover .btn-forzar-total, &:focus-within .btn-forzar-total
		opacity: 1

	.input-total-forzado
		width: 100%
		max-width: 240px
		background: rgba(255, 255, 255, 0.95)
		color: #212529
		border: 0
		border-radius: 8px
		padding: 2px 10px
		font-weight: bold
		font-size: 1.6rem
		text-align: center


// 🔴 EN TELEFONO NO HAY HOVER: ahi el lapiz va SIEMPRE visible, o la funcion directamente no
// existe en un celular --que es donde mas se usa el "pagame 4.000 y listo"--.
//
// Van las dos condiciones a proposito: (hover: none) cubre cualquier pantalla tactil, incluida
// la tablet, y el max-width cubre al navegador de escritorio angosto que igual reporta hover.
@media (hover: none)
	.venta-total-box .btn-forzar-total
		opacity: 1

@media screen and (max-width: 767px)
	.venta-total-box .btn-forzar-total
		opacity: 1


/* Efecto al pasar el mouse (por si lo quieres interactivo) */
.venta-total-box:hover
	transform: scale(1.05)
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3)

.ui-small .venta-total-box
	font-size: 1.2rem
	padding: 8px 16px
	border-radius: 8px

	.btn-forzar-total
		font-size: 1rem
		margin-left: 10px

	.input-total-forzado
		max-width: 160px
		font-size: 1.1rem
</style>