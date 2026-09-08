<template>
	<div>

		<div
		v-if="can('article.edit_stock')">
			<!--
				El articulo todavia no existe: no hay a que asignarle stock. Antes era un <p> pelado
				con un `m-t-10`; ahora es un aviso con el mismo lenguaje visual que el resto del
				formulario, para que no se lea como texto suelto perdido en la solapa.
			-->
			<p
			class="stock-input__aviso"
			v-if="typeof model.id == 'undefined'">
				<i
				class="bi bi-info-circle"
				aria-hidden="true"></i>
				Primero cree el articulo para asignar el stock
			</p>

			<!--
				Bloque para editar el stock. La flecha ya no son los dos caracteres "->" escritos a
				mano: es un icono de Bootstrap Icons, que es el set que usa todo este modulo.
			-->
			<div
			v-else
			class="stock-input">
				<span class="stock-input__leyenda">
					Presione para editar stock
				</span>
				<i
				class="bi bi-arrow-right-short stock-input__flecha"
				aria-hidden="true"></i>
				<stock-btn
				:article="model"></stock-btn>
			</div>
		</div>

		<!--
			Sin permiso para editar: el stock es un dato de solo lectura, asi que se dibuja con las
			clases del bloque `only_show` de ModelForm.vue --que son globales, no scoped-- en vez de
			inventar una pildora igual con otro nombre. Es el mismo camino que ya toma
			AplicarIvaInput.vue con las clases `.model-form__toggle*`.
		-->
		<span
		v-else
		class="model-form__only-show">
			<span class="model-form__only-show-value">
				{{ numero_es(model.stock) }}
			</span>
		</span>
	</div>
</template>
<script>
export default {
	components: {
		StockBtn: () => import('@/components/listado/components/StockBtn'),
	},
	computed: {
		model() {
			return this.$store.state.article.model
		},
		addresses() {
			return this.$store.state.address.models
		},
		disabled() {
			if (!this.model.id && this.model.stock) {
				return true
			}
			return false
		},
	},
	methods: {
		stockMovement() {
			this.$bvModal.show('stock-movement')
			setTimeout(() => {
				document.getElementById('stock-movement-amount').focus()
			}, 500)
		}
	}
}
</script>
<style lang="sass">
// Bloque de stock de la solapa "Stock" del modal del articulo.
//
// No inventa una estetica nueva: copia la que el formulario ya tiene en `.model-form__only-show`
// (ModelForm.vue) --pildora con --bg-section, esquinas de 8px, borde --color-border-secondary y la
// altura de control del sistema (--toolbar-control-h)-- porque es exactamente el mismo tipo de
// contenido: un dato que se lee, con su accion al lado. Hasta el 7/9/2026 esto era texto pelado sin
// una sola clase, con la flecha escrita como dos caracteres ("->") y con el color de texto por
// defecto, que en modo oscuro quedaba casi negro sobre el modal oscuro.
.stock-input
	display: inline-flex
	align-items: center
	gap: 6px
	min-height: var(--toolbar-control-h, 36px)
	// Menos padding a la derecha que a la izquierda: de ese lado el aire ya lo pone el boton.
	padding: 0.28rem 0.5rem 0.28rem 0.75rem
	background: var(--bg-section, #f3f4f6)
	border: 1px solid var(--color-border-secondary, #e9ecef)
	border-radius: 8px
	max-width: 100%

	// La leyenda no compite con el boton, que es lo que hay que apretar: va en el gris secundario
	// del tema y en el cuerpo chico del resto de los valores del formulario.
	&__leyenda
		font-size: 0.85rem
		font-weight: 500
		color: var(--color-text-secondary, #6c757d)
		line-height: 1.3

	// La flecha que apunta al boton, en el mismo gris que la leyenda para que sea puntuacion y no
	// un elemento mas.
	&__flecha
		flex: 0 0 auto
		font-size: 1.15rem
		line-height: 1
		color: var(--color-text-secondary, #6c757d)

	// StockBtn se comparte con la celda de la tabla del listado (table-props/stock-btn/Index.vue),
	// donde ese `m-l-10` si hace falta para separarlo del boton de sucursales. Aca la separacion la
	// pone el gap del contenedor, asi que se anula puertas adentro --con !important porque la
	// utilidad global lo lleva-- en lugar de tocar un componente que usa otra pantalla.
	.btn
		margin-left: 0 !important

// Misma pildora, en tono de aviso: todavia no hay articulo al que asignarle stock. Va en italica y
// en el gris secundario, igual que el "Sin datos" de ModelForm, porque tambien es la ausencia de un
// dato y no un error.
.stock-input__aviso
	display: inline-flex
	align-items: center
	gap: 6px
	max-width: 100%
	min-height: var(--toolbar-control-h, 36px)
	// El <p> trae el margen inferior de bootstrap y aca el espacio vertical lo maneja la columna
	// del formulario, igual que con el resto de los campos.
	margin-bottom: 0
	padding: 0.28rem 0.75rem
	background: var(--bg-section, #f3f4f6)
	border: 1px solid var(--color-border-secondary, #e9ecef)
	border-radius: 8px
	font-size: 0.85rem
	font-style: italic
	line-height: 1.3
	color: var(--color-text-secondary, #6c757d)
</style>
