<template>
<div class="puntos-ajuste">

	<div class="puntos-ajuste__campos">

		<div class="puntos-ajuste__campo puntos-ajuste__campo--signo">
			<label class="puntos-ajuste__label">Qué hacer</label>
			<b-form-radio-group
			buttons
			button-variant="outline-primary"
			:checked="signo"
			:options="opciones_de_signo"
			@change="cambiar_signo"></b-form-radio-group>
		</div>

		<div class="puntos-ajuste__campo">
			<label class="puntos-ajuste__label">Cuántos puntos</label>
			<b-form-input
			v-model="cantidad"
			type="number"
			min="0"
			step="1"
			placeholder="0"
			@keyup.enter="guardar"></b-form-input>
		</div>

		<div class="puntos-ajuste__campo puntos-ajuste__campo--motivo">
			<label class="puntos-ajuste__label">Motivo</label>
			<b-form-input
			v-model="detalle"
			type="text"
			maxlength="191"
			placeholder="Por qué se ajusta"
			@keyup.enter="guardar"></b-form-input>
		</div>

		<div class="puntos-ajuste__campo puntos-ajuste__campo--boton">
			<b-button
			variant="primary"
			:disabled="!se_puede_guardar"
			@click="guardar">
				<b-spinner
				v-if="loading"
				small></b-spinner>
				<span v-else>Guardar el ajuste</span>
			</b-button>
		</div>

	</div>

	<p class="puntos-ajuste__resumen">
		{{ resumen }}
	</p>

	<!--
		🔴 El 422 se muestra TAL CUAL viene. Los mensajes de la API ya están escritos en criollo
		y el de "se resta más que el saldo" trae el saldo real adentro: reescribirlo acá sería
		perder justamente el número que dice cuánto se puede restar.
	-->
	<b-alert
	:show="!!error"
	class="m-b-0"
	variant="warning">
		{{ error }}
	</b-alert>

</div>
</template>
<script>
/**
 * Ajuste manual de puntos de un cliente, en más o en menos, con motivo obligatorio.
 *
 * 🔴 SE PIDE SIGNO + CANTIDAD POSITIVA, AUNQUE LA API RECIBA UN NÚMERO SIGNADO.
 * Esta pantalla la mira el dueño del negocio, no un programador: "-300" en un input es
 * exactamente la clase de dato que se tipea mal (el menos que se come el teclado numérico, el
 * menos que se pega dos veces). Con dos botones "Sumar / Restar" no hay forma de equivocarle el
 * signo, y el `puntos` signado que pide `POST api/puntos/ajuste` se arma acá, en un solo lugar.
 *
 * El pedido lo hace la acción `puntos/ajuste` del store, que además vuelve a pedir la ficha
 * entera cuando sale bien: el saldo lo dice la API y sumarle el ajuste acá sería decidir el
 * mismo número con dos criterios.
 */
export default {
	props: {
		client_id: {
			type: [Number, String],
			default: null,
		},
	},
	data() {
		return {
			signo: 1,
			cantidad: '',
			detalle: '',
			loading: false,
			error: '',
		}
	},
	computed: {
		opciones_de_signo() {
			return [
				{ text: 'Sumar', value: 1 },
				{ text: 'Restar', value: -1 },
			]
		},
		cantidad_numero() {
			return Number(this.cantidad) || 0
		},
		puntos_signados() {
			return this.signo * this.cantidad_numero
		},
		se_puede_guardar() {
			return !this.loading
				&& !!this.client_id
				&& this.cantidad_numero > 0
				&& this.detalle.trim() !== ''
		},
		/**
		 * La frase que explica lo que está por pasar, antes de que pase. El ajuste manual es la
		 * única escritura a mano del módulo y no tiene vuelta atrás con un botón: que diga en
		 * castellano qué va a hacer es más barato que un modal de confirmación.
		 */
		resumen() {
			if (this.cantidad_numero <= 0) {
				return 'Poné cuántos puntos y por qué, y el ajuste queda en el libro con tu nombre.'
			}
			if (this.signo > 0) {
				return 'Se le van a sumar ' + this.numero_es(this.cantidad_numero) + ' puntos.'
			}
			return 'Se le van a restar ' + this.numero_es(this.cantidad_numero) + ' puntos, de los más viejos a los más nuevos.'
		},
	},
	methods: {
		cambiar_signo(valor) {
			this.signo = valor
			// Cambiar de sumar a restar invalida el error anterior: el 422 de "no se le pueden
			// restar N" no dice nada sobre una suma.
			this.error = ''
		},
		guardar() {
			if (!this.se_puede_guardar) {
				return
			}

			let self = this
			this.loading = true
			this.error = ''

			this.$store.dispatch('puntos/ajuste', {
				client_id: this.client_id,
				puntos: this.puntos_signados,
				detalle: this.detalle.trim(),
			})
			.then(function () {
				self.loading = false
				self.cantidad = ''
				self.detalle = ''
				self.signo = 1
				self.$toast.success('Ajuste guardado')
				self.$emit('ajustado')
			})
			.catch(function (err) {
				self.loading = false
				// El cuerpo del 422 de `PuntoController@ajuste` es { message }, sin el mapa
				// `errors` de una validación de Laravel: por eso no lo levanta el toast de
				// validación global de main.js y hay que leerlo a mano.
				let mensaje = err && err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: 'No se pudo guardar el ajuste.'
				self.error = mensaje
			})
		},
	},
}
</script>
<style lang="sass" scoped>
// Tokens de color, nunca hexadecimales: el bloque vive adentro de un modal de bootstrap-vue, que
// se monta colgando de body y fuera de #app.
.puntos-ajuste
	margin: 12px 20px 0 20px
	padding: 14px
	background: var(--bg-section)
	border: 1px solid var(--color-border)
	border-radius: 10px

	&__campos
		display: flex
		flex-wrap: wrap
		// En teléfono cada campo se lleva la línea entera (flex-basis grande + wrap) en vez de
		// quedar los cuatro apretados en una fila imposible de tocar.
		gap: 12px
		align-items: flex-end

	&__campo
		display: flex
		flex-direction: column
		flex: 1 1 160px
		min-width: 150px

		&--signo
			flex: 0 0 auto
			min-width: auto

		&--motivo
			flex: 2 1 240px

		&--boton
			flex: 0 0 auto
			min-width: auto

	&__label
		margin-bottom: 4px
		font-size: 0.8rem
		font-weight: 600
		color: var(--color-text-secondary)

	&__resumen
		margin: 10px 0 0 0
		font-size: 0.85rem
		color: var(--color-text-secondary)
</style>
