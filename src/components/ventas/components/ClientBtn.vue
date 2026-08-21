<template>
	<div
	class="j-start cliente-btn-cont"
	v-if="sale.client">
		<!--
			Diseño (21/8/2026). Era un <b-button> sin variante, o sea el `btn-secondary` gris
			macizo de bootstrap, con el nombre del cliente adentro. En la columna "Cliente" de
			Ventas eso deja una mancha gris por fila --y son tres las tablas que lo usan: Ventas,
			Presupuestos y el modal de Acopios--, que compite con los importes y con los badges de
			estado de la misma fila.

			Queda como boton de texto: el nombre en el azul de accion, sin relleno, con el icono
			de persona adelante. Se lee como lo que es --un nombre que se puede apretar-- y la
			tabla vuelve a ser una lista de datos con acciones, en vez de una lista de botones.

			El click sigue siendo el mismo y sigue llevando `.stop`: la fila entera tiene su propio
			@click que abre el modal de la venta.
		-->
		<b-button
		class="cliente-btn"
		variant="link"
		:title="'Abrir la cuenta corriente de '+sale.client.name"
		@click.stop="show_current_acount">
			<i class="bi bi-person"></i>
			<span class="cliente-btn__nombre">
				{{ sale.client.name }}
			</span>
		</b-button>

		<whatsapp-btn
		:sale="sale"></whatsapp-btn>
	</div>
</template>
<script>
export default {
	components: {
		WhatsappBtn: () => import('@/common-vue/sale-print-buttons/WhatsappBtn'),
	},
	props: {
		sale: Object,
		from_budget: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		show_current_acount() {
			this.showClientCurrentAcount(this.sale)
		},
	}
}
</script>
<style scoped lang="sass">
// Con `scoped`: el b-button renderiza su raiz en esta plantilla, asi que recibe el atributo de
// scope. WhatsappBtn es un componente hijo y NO lo alcanza, que es justamente lo que se busca --
// ese boton lo comparten media docena de pantallas y no se toca desde aca.
.cliente-btn-cont
	align-items: center
	gap: 4px

.cliente-btn
	display: inline-flex
	align-items: center
	gap: 6px
	max-width: 100%
	padding: 4px 8px
	border: 1px solid transparent
	border-radius: 8px
	font-weight: 500
	color: var(--color-primary)
	text-decoration: none
	// 🔴 `box-shadow: none` en REPOSO, no solo en :hover. _inputs.sass declara
	// `input, button, textarea, ... { box-shadow: rgba(0,0,0,.15) 1.95px 1.95px 2.6px }` para TODO
	// <button> del sistema. Un boton sin relleno ni borde con esa sombra gris desplazada abajo a la
	// derecha se ve como una mancha flotando; y declarandola solo en :hover, la sombra desaparecia
	// justo al pasar el mouse, al reves de lo esperable. Ademas el mismo componente se veia
	// distinto segun la pantalla: adentro del modal de Acopios no pasaba, porque ahi gana
	// `.modal button { box-shadow: none }` de esa misma hoja.
	box-shadow: none
	transition: background 0.15s ease, border-color 0.15s ease

	&:hover,
	&:focus
		background: var(--bg-hover)
		border-color: var(--color-border)
		color: var(--color-primary)
		text-decoration: underline
		box-shadow: none

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
		flex-shrink: 0
		opacity: .75

// Un nombre largo no puede empujar la columna: la celda de la tabla es `nowrap` y el texto se
// cortaria contra el borde sin ningun aviso.
.cliente-btn__nombre
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap
</style>
