<template>
	<div>
		<!--
			Este control reemplaza al input generico de ModelForm para percentage_gain (se monta por
			slot), asi que el data-testid que la convencion generica hubiera puesto no existe: hay
			que ponerlo a mano y con el MISMO nombre (<model_name>-<key>), para que un test no tenga
			que saber que este campo se renderiza distinto al resto del formulario.
		-->
		<b-form-input
		data-testid="article-percentage_gain"
		:disabled="disabled"
		v-model="article.percentage_gain"
		placeholder="Margen de ganancia"></b-form-input>

		<!-- El margen implicito se muestra FUERA del input a proposito. Escribirlo adentro seria
		     escribirlo en article.percentage_gain, y el backend pone price = null cuando hay
		     percentage_gain: el usuario cargaria un precio a mano, veria el margen, guardaria, y el
		     precio se le convertiria en margen sin aviso. Aca es un dato derivado, nada mas. -->
		<div
		v-if="disabled"
		class="m-t-10">
			<div
			v-if="margen_implicito !== null"
			class="percentage-gain-input__implicito">
				Ese precio implica un margen del {{ porcentaje_es(margen_implicito) }}%
			</div>
			<p class="m-b-0">
				Elimine el precio manual para poder indicar el margen de ganancia.
				<template v-if="margen_implicito !== null">
					El porcentaje de arriba es el que resulta del precio cargado, no uno guardado.
				</template>
			</p>
		</div>
	</div>
</template>
<script>
import { usa_precio_manual } from '@/utils/criterio_de_precio'

export default {
	computed: {
		article() {
			return this.$store.state.article.model
		},
		/*
		 * Mision 44: exige precio manual > 0, con el mismo criterio que el back
		 * (utils/criterio_de_precio.js es el espejo de CriterioDePrecioHelper.php).
		 * Antes bastaba con que price no fuera null ni cadena vacia, asi que un precio
		 * guardado en 0 bloqueaba el margen de ganancia sin que el back considerara que
		 * ese articulo tuviera precio manual.
		 */
		disabled() {
			return usa_precio_manual(this.article)
		},
		/**
		 * Margen que implica el precio cargado a mano, derivado en vivo de articles.base_margen
		 * (grupo 357, prompt 02). La base NO es el costo real pelado: es el resultado de la cadena
		 * costo real -> margen de usuario -> unidades individuales -> cotizacion -> margen de
		 * proveedor -> margen de categoria, que es justo donde el sistema aplica percentage_gain.
		 * Por eso el backend expone la base y no el margen ya calculado: asi la cuenta es una
		 * division que se rehace en cada tecla, sin ir al servidor.
		 *
		 * Devuelve null cuando no hay nada que mostrar (sin base, sin precio), para no pintar NaN.
		 */
		margen_implicito() {
			if (!this.article) {
				return null
			}

			let base = parseFloat(this.article.base_margen)
			let precio = parseFloat(this.article.price)

			if (isNaN(base) || base <= 0 || isNaN(precio)) {
				return null
			}

			return Math.round((precio - base) / base * 100 * 100) / 100
		}
	},
}
</script>
<style lang="sass" scoped>
.percentage-gain-input__implicito
	font-weight: bold
	margin-bottom: 4px
</style>
