<template>
	<div>
		<!--
			🔴 El data-testid lleva la moneda ademas del id del modelo, y el `id` de al lado NO.
			Este v-for emite un boton por cada credit_account (pesos y dolares), asi que con la
			extension ventas_en_dolares prendida los dos botones de un mismo proveedor comparten el
			`id` --que en HTML tiene que ser unico y no lo es--. El testid no repite ese error.
		-->
		<!--
			Diseño (21/8/2026). Era `variant="success"`: verde MACIZO y sin icono, con el boton de
			WhatsApp --que tambien es verde macizo-- pegado a su derecha en la misma celda de la
			tabla de clientes. Los dos se leian como el mismo boton repetido y habia que leer el
			texto para saber cual era cual.

			Queda como acento suave del color primario: es la accion principal de la fila (abre la
			cuenta corriente del cliente o del proveedor), asi que se distingue del verde de
			contacto y del celeste de "Actividad" sin gritarles por encima. La geometria de
			bootstrap no se toca, salvo el radio: lo que decide que este boton se lea parejo con
			sus dos vecinos es el padding, y ese queda igual.
		-->
		<b-button
		v-for="credit_account in model.credit_accounts"
		class="m-l-15 btn-cuenta-corriente"
		v-if="show(credit_account)"
		:id="'btn-current-acount-'+model.id"
		:data-tour="ancla_tour(credit_account)"
		:data-testid="'btn-current-acount-'+model.id+'-'+credit_account.moneda_id"
		:title="'Abrir la cuenta corriente en '+credit_account.moneda.name"
		@click.stop="showCurrentAcounts(credit_account)"
		variant="light">
			<i class="bi bi-journal-text"></i>
			C/C {{ credit_account.moneda.name }}
		</b-button> 
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		model: Object,
	},
	methods: {
		/**
		 * Ancla `data-tour` del boton que abre la cuenta corriente.
		 *
		 * 🔴 Solo se ancla la cuenta en PESOS (`moneda_id == 1`), y no por preferencia: con la
		 * extension `ventas_en_dolares` prendida, el `v-for` de arriba dibuja **un boton por
		 * moneda**, asi que un valor fijo quedaria repetido dos veces en la misma fila. El mismo
		 * archivo ya documenta ese problema para el atributo `id`.
		 *
		 * ⚠️ Y ademas este boton se dibuja **una vez por fila** de la tabla. El tour no puede
		 * distinguir de que fila es —la fila no llega hasta aca—, asi que agarra la primera del
		 * listado: los tours 2.5 y 4.3 tienen que dejar arriba al cliente o al proveedor que
		 * corresponde, o el paso senala a otro.
		 *
		 * @param {Object} credit_account
		 * @returns {String|null}
		 */
		ancla_tour(credit_account) {
			if (credit_account.moneda_id != 1) {
				return null
			}

			if (this.model_name === 'provider') {
				return 'cuentas_corrientes.boton_abrir_cuenta_proveedor'
			}

			if (this.model_name === 'client') {
				return 'cuentas_corrientes.boton_abrir_cuenta_cliente'
			}

			return null
		},
		show(credit_account) {
			return credit_account.moneda_id == 1 || this.hasExtencion('ventas_en_dolares')
		},
		showCurrentAcounts(credit_account) {
			this.$store.commit('current_acount/setFromModelName', this.model_name)
			this.$store.commit('current_acount/setFromModel', this.model)
			this.$store.commit('current_acount/set_from_credit_account', credit_account)
			this.$store.dispatch('current_acount/getModels')
			this.$bvModal.show('current-acounts')
		},
	},
}
</script>
<style scoped lang="sass">
// Con `scoped`: todo lo de aca dentro es markup propio de este componente --el b-button renderiza
// su raiz en esta plantilla, asi que recibe el atributo de scope-- y no tiene que alcanzar a
// ningun hijo. Sin scope, un `.btn` suelto se le filtraria a las dos tablas donde vive.
//
// Los colores salen de tokens: este boton se dibuja adentro de #app, pero el sistema tiene modo
// oscuro y un hex aca lo dejaria blanco.
// 🔴 El selector suma `.btn` --que el b-button ya trae-- y no es de mas. Con `.btn-cuenta-corriente`
// a secas, el scoped compila a (0,2,0) contando el atributo de scope, y `html.dark-mode .btn-light`
// de _dark_theme.sass es (0,2,1): el `html` suma un elemento y GANA en background, border-color y
// color, que son justo las tres declaraciones que definen este boton. El resultado medido era el
// peor posible: en modo oscuro el boton quedaba gris neutro en reposo y azul al pasar el mouse
// --invertido respecto de modo claro--, porque el :hover de aca si ganaba con una clase mas.
// Con `.btn.btn-cuenta-corriente` queda en (0,3,0) y gana en los dos modos.
.btn.btn-cuenta-corriente
	display: inline-flex
	align-items: center
	justify-content: center
	gap: 6px
	// Mismo radio que los botones de la barra de encabezado de los listados
	// (--toolbar-btn-radius, mision 13): es el radio con el que el sistema viene dibujando sus
	// botones desde el rediseño de agosto.
	border-radius: var(--toolbar-btn-radius, 10px)
	background: var(--bg-card)
	border: 1px solid var(--color-primary)
	color: var(--color-primary)
	font-weight: 500
	box-shadow: var(--toolbar-btn-shadow, rgba(99, 99, 99, 0.12) 0px 1px 3px 0px)
	transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

	&:hover,
	&:focus,
	&:not(:disabled):not(.disabled):active
		background: var(--color-primary)
		border-color: var(--color-primary)
		// Literal a proposito: texto sobre el azul de accion, que es el mismo en los dos modos.
		color: #fff

	// Los iconos `icon-*` del sistema se dibujan con un ::before al que _generals.sass le
	// pone `top: .15em` y margenes laterales, pensado para un icono adentro de un parrafo.
	// En un boton flex el centrado lo da el contenedor, asi que se apaga. El reset va sobre
	// el ::before y no sobre el <i>: la regla global apunta al pseudoelemento, y sobre el <i>
	// no vencia nada. Los `bi bi-*` ni siquiera entran por ahi --el selector es
	// [class^='icon-'] y ellos empiezan con `bi`--, pero el resto de esta regla si los toca.
	i,
	i::before
		top: 0
		margin: 0
		line-height: 1
		color: inherit
</style>
