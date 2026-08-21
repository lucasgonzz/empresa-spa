<template>
	<div
	class="cc-toolbar">

		<!--
			Grupo 1: el filtro. Es lo unico de la barra que cambia lo que la tabla muestra, asi que
			va primero y lleva la unica accion con acento.
		-->
		<div
		class="cc-toolbar__grupo">
			<label
			class="cc-toolbar__label"
			for="cc-cantidad-movimientos">
				Ultimos
			</label>
			<b-form-input
			id="cc-cantidad-movimientos"
			v-model="cantidad_movimientos"
			@keydown.enter="getCurrentAcounts"
			class="cc-toolbar__input"
			min="1"
			type="number"></b-form-input>
			<label
			class="cc-toolbar__label"
			for="cc-cantidad-movimientos">
				movimientos
			</label>
			<b-button
			class="cc-toolbar__btn cc-toolbar__btn--acento"
			variant="primary"
			@click="getCurrentAcounts">
				<i class="bi bi-search"></i>
				Buscar
			</b-button>
		</div>

		<!--
			Grupo 2: las acciones sobre la cuenta. Ninguna cambia lo que se ve en pantalla, asi que
			van todas neutras: la jerarquia la marca "Buscar", que es la unica con acento.
		-->
		<div
		class="cc-toolbar__grupo cc-toolbar__grupo--acciones">
			<!--
				Era `variant="danger"`: una impresora ROJA, sin texto y sin title. El rojo es el
				color de lo destructivo en todo el sistema y esto imprime un resumen.
			-->
			<b-dropdown
			class="cc-toolbar__dropdown"
			variant="light"
			right>
				<template #button-content>
					<i class="bi bi-printer"></i>
					Imprimir
				</template>
				<b-dropdown-item @click="print('simple')">
					Resumen
				</b-dropdown-item>
				<b-dropdown-item @click="print('details')">
					Con desglose
				</b-dropdown-item>
			</b-dropdown>

			<b-button
			v-if="from_model.current_acounts_count == 0"
			class="cc-toolbar__btn"
			variant="light"
			title="Cargar el saldo con el que arranca esta cuenta"
			@click="saldoInicial">
				<i class="bi bi-flag"></i>
				Saldo inicial
			</b-button>

			<btn-loader
			class="cc-toolbar__btn"
			:block="false"
			:loader="checking"
			variant="light"
			icon_class="bi bi-arrow-repeat"
			text="Chequear saldos"
			@clicked="checkSaldos">
			</btn-loader>
		</div>
	</div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'
export default {
	name: 'CurrentAcountsNav',
	mixins: [current_acounts],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			checking: false
		}
	},
	computed: {
		cantidad_movimientos: {
			set(value) {
				this.$store.commit('current_acount/set_cantidad_movimientos', value)
			},
			get() {
				return this.$store.state.current_acount.cantidad_movimientos
			}
		},
		loading() {
			return this.$store.state.current_acount.loading
		},
        client() {
            return this.$store.state.current_acount.client
        },
        can_print() {
        	return this.selected_current_acounts.length == 0 || this.is_selected_printable
        },
        is_selected_printable() {
        	return this.selected_current_acounts.length == 1 && (this.selected_current_acounts[0].status == 'nota_credito' || this.selected_current_acounts[0].status == 'pago_from_client')
        }
	},
	methods: {
		checkSaldos() {
			this.checking = true
			this.$api.get('check-saldos/'+this.from_credit_account.id)
			.then(() => {
				this.checking = false
				this.$store.dispatch('current_acount/getModels')
			})
			.catch(err => {
				this.checking = false
			})
		},
        saldoInicial() {
            // this.$store.commit('clients/setSaldoInicial', this.client)
            this.$bvModal.show('saldo-inicial')
        },
		getCurrentAcounts() {
			this.$store.dispatch('current_acount/getModels')
		},
		print(detail) {
            let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+this.from_credit_account.id+'/'+this.cantidad_movimientos+'/'+detail
            window.open(link)
		},
	}
}
</script>
<style lang="sass">
// ══════════════════════════════════════════════════════════════════════════════════════════════
// BARRA DE ENCABEZADO DEL MODAL DE CUENTA CORRIENTE (21/8/2026)
//
// Es lo que Lucas llama "los botones del header del modal". No es el `.modal-header` de bootstrap
// --ese solo tiene el titulo y la cruz--: es la primera franja del cuerpo, y hasta hoy era un
// `display: flex` en fila SIN `flex-wrap`, con cinco controles de tres alturas distintas y sus
// margenes escritos uno por uno (`m-l-15` en cada boton). En 360px de ancho eso no se acomodaba:
// se iba de la caja.
//
// El vocabulario --altura, radio, separacion, sombra, el neutro por defecto y el unico acento--
// es el de la barra de encabezado de los listados (_toolbar_botones.sass, mision 13). No se
// eligen valores nuevos: se toman los tokens que Index.vue ya deja declarados en
// `.cuenta-corriente-modal`.
//
// El <style> NO lleva `scoped` porque tiene que alcanzar el b-dropdown y el BtnLoader, que son
// componentes hijos. Todo va anidado bajo `.cc-toolbar`, que es lo que evita que se filtre.
// ══════════════════════════════════════════════════════════════════════════════════════════════
.cc-toolbar
	display: flex
	flex-direction: row
	flex-wrap: wrap
	align-items: center
	justify-content: space-between
	// La separacion entre grupos y entre controles la da el gap del contenedor, nunca el margen
	// de cada hijo: con margenes propios, la distancia entre un par de botones y el siguiente
	// queda despareja en cuanto uno de los dos se oculta por un v-if (y aca hay uno: "Saldo
	// inicial" solo aparece si la cuenta no tiene movimientos).
	gap: var(--cc-grupo-gap, 16px)
	padding: 14px 20px
	background: var(--bg-section)
	border-bottom: 1px solid var(--color-border)

	.cc-toolbar__grupo
		display: flex
		flex-direction: row
		flex-wrap: wrap
		align-items: center
		gap: var(--cc-gap, 8px)

	// En pantallas anchas las acciones se van al borde derecho; cuando la barra envuelve, el grupo
	// baja completo y arranca a la izquierda como cualquier otra fila.
	.cc-toolbar__grupo--acciones
		margin-left: auto

	.cc-toolbar__label
		margin: 0
		font-size: 0.8125rem
		font-weight: 500
		color: var(--color-text-secondary)
		white-space: nowrap

	// El campo va con el radio de boton y no en capsula. La convencion del rediseño es explicita:
	// la capsula es del CAMPO DE BUSQUEDA, y esto es una cantidad, no una busqueda.
	.cc-toolbar__input
		width: 74px
		height: var(--cc-control-h, 36px)
		padding: 0 10px
		text-align: center
		font-size: 0.875rem
		border-radius: var(--cc-btn-radio, 10px)
		border: 1px solid var(--color-border)
		background: var(--bg-card)
		color: var(--color-text-primary)
		box-shadow: none

		&:focus
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15)

	// Altura unica para TODO lo que vive en la barra: botones, el BtnLoader y el disparador del
	// dropdown. El `> .btn` del segundo selector es porque b-dropdown recibe la clase en su
	// contenedor, no en el boton.
	.cc-toolbar__btn,
	.cc-toolbar__dropdown > .btn
		height: var(--cc-control-h, 36px)
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 6px
		padding: 0 12px
		font-size: 0.875rem
		font-weight: 500
		line-height: 1
		border-radius: var(--cc-btn-radio, 10px)
		box-shadow: var(--cc-btn-sombra, rgba(99, 99, 99, 0.12) 0px 1px 3px 0px)
		white-space: nowrap
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

	// Neutro por defecto, igual que en la barra de los listados: el color de la paleta no cambia,
	// cambia donde se aplica. Antes convivian tres rellenos macizos (dos azules y un rojo) que no
	// comunicaban jerarquia sino el momento en que se habia agregado cada boton.
	.cc-toolbar__btn:not(.cc-toolbar__btn--acento),
	.cc-toolbar__dropdown > .btn
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		color: var(--color-text-primary)

		&:hover,
		&:focus,
		&:not(:disabled):not(.disabled):active
			background: var(--bg-hover)
			border-color: var(--color-border)
			color: var(--color-text-primary)

		i
			color: inherit

	// La unica accion con peso visual de la barra: es la que vuelve a pedir los movimientos, o sea
	// la unica que cambia lo que se ve en pantalla.
	.cc-toolbar__btn--acento
		background: var(--color-primary)
		border: 1px solid var(--color-primary)
		// Literal a proposito: texto sobre el azul de accion, que es el mismo en los dos modos.
		color: #fff

		&:hover,
		&:focus,
		&:not(:disabled):not(.disabled):active
			background: var(--color-primary)
			border-color: var(--color-primary)
			color: #fff
			filter: brightness(0.94)

	// El caret del dropdown pegado al texto se lee como parte de la palabra.
	.cc-toolbar__dropdown > .btn::after
		margin-left: 4px

	// El [class^='icon-'] global de _generals.sass corre los iconos .15em hacia abajo y les suma
	// margenes propios, pensado para un icono dentro de un parrafo. En un boton flex el centrado
	// lo da el contenedor.
	i
		top: 0
		margin: 0
		line-height: 1

	// El spinner del BtnLoader trae `margin-right: .1em` propio, que ademas del gap del boton deja
	// la separacion desigual respecto de los otros dos.
	.spinner-border
		margin: 0
</style>
