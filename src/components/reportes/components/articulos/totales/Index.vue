<template>
	<b-row
	v-if="models.length || hay_ventas_en_el_periodo">
		<b-col>
			<div
			class="j-between">
				<h3
				class="text-left">
					<strong>
						Total: {{ price(total) }}
					</strong>
				</h3>
				<h4>
					Unidades vendidas: {{ numero_es(unidades_vendidas) }}
				</h4>
			</div>
			<!--
				El Total y las Unidades son de todo el periodo, y la lista puede mostrar menos articulos
				(«Cantidad de resultados»). Sin esta linea el dueño no tiene forma de saber que hay mas.
			-->
			<p
			v-if="aviso_recorte"
			class="text-left text-muted small m-b-0">
				{{ aviso_recorte }}
			</p>
		</b-col>
	</b-row>
</template>
<script>
export default {
	computed: {
		/*
			Total vendido en el periodo. Desde el 10/10/2026 la API lo manda calculado sobre TODOS los
			articulos del periodo (`totales`); antes se sumaba la lista, que es solo lo que entra en
			«Cantidad de resultados», y el dueño leia como total del periodo algo que no lo era.

			Con una API vieja `totales` no viene (null) y se sigue sumando la lista, como siempre.
		*/
		total() {
			if (this.totales) {
				return Number(this.totales.price)
			}

			let total = 0

			this.models.forEach(model => {

				total += Number(model.price)
			})

			return total
		},
		/* Mismo criterio que total(): del periodo si la API lo manda, de la lista si no */
		unidades_vendidas() {
			if (this.totales) {
				return Number(this.totales.unidades_vendidas)
			}

			let unidades_vendidas = 0

			this.models.forEach(model => {

				unidades_vendidas += Number(model.unidades_vendidas)
			})

			return unidades_vendidas
		},
		/*
			Texto que avisa que la lista no muestra todo lo vendido en el periodo. Vacio si la lista
			muestra todos los articulos, o si la API es vieja y no manda la cantidad del periodo.
		*/
		aviso_recorte() {
			if (!this.totales) {
				return ''
			}

			let cantidad_articulos = Number(this.totales.cantidad_articulos)
			let en_la_lista = this.models.length

			if (!(cantidad_articulos > en_la_lista)) {
				return ''
			}

			let texto = this.numero_es(cantidad_articulos) + ' artículos vendidos en el período · '

			if (en_la_lista == 0) {
				return texto + 'la lista no muestra ninguno'
			}
			if (en_la_lista == 1) {
				return texto + 'la lista muestra solo el primero'
			}
			return texto + 'la lista muestra los ' + this.numero_es(en_la_lista) + ' primeros'
		},
		/*
			Si la API dice que en el periodo se vendio algo. Hace que el bloque se muestre aunque la
			lista venga vacia; un periodo sin ventas sigue sin mostrar nada, como antes.
		*/
		hay_ventas_en_el_periodo() {
			return !!this.totales && Number(this.totales.cantidad_articulos) > 0
		},
		totales() {
			return this.$store.state.reportes.article_purchase.totales
		},
		models() {
			return this.$store.state.reportes.article_purchase.articles 
		},
	}
}
</script>
