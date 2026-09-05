<template>
<div class="puntos-saldo">

	<div class="puntos-saldo__tarjeta puntos-saldo__tarjeta--principal">
		<span class="puntos-saldo__valor">{{ puntos_es(saldo) }}</span>
		<span class="puntos-saldo__titulo">Puntos disponibles</span>
	</div>

	<div class="puntos-saldo__tarjeta">
		<span class="puntos-saldo__valor">{{ price(equivalencia_pesos) }}</span>
		<span class="puntos-saldo__titulo">Valen en pesos</span>
	</div>

	<!--
		🔴 Esta es la tarjeta que hace que el vendedor levante el teléfono. Va SIEMPRE, aunque
		esté en cero: un espacio vacío se lee como "no se sabe", y "no se le vence nada" es un
		dato tan bueno como el otro.
	-->
	<div
	class="puntos-saldo__tarjeta"
	:class="{ 'puntos-saldo__tarjeta--vence': hay_por_vencer }">
		<span class="puntos-saldo__valor">{{ puntos_es(por_vencer_90_dias) }}</span>
		<span class="puntos-saldo__titulo">Se le vencen en 90 días</span>
		<span
		v-if="hay_por_vencer"
		class="puntos-saldo__pesos-chicos">
			{{ price(pesos_por_vencer) }}
		</span>
	</div>

</div>
</template>
<script>
/**
 * La franja de saldo del modal de puntos: cuántos puntos tiene, cuánto valen en pesos y cuántos
 * se le vencen en los próximos 90 días.
 *
 * Es el equivalente de `common/current-acounts/SaldoYLimite.vue` en el modal de cuenta
 * corriente: una franja arriba del libro de movimientos que contesta de un vistazo lo único que
 * el dueño del negocio viene a mirar.
 *
 * 🔴 LA EQUIVALENCIA EN PESOS SE MULTIPLICA ACÁ AUNQUE LA API LA MANDE CALCULADA.
 * El endpoint devuelve `equivalencia_pesos`, pero `store/puntos.js` (U8) no la commitea en la
 * acción `getCliente`, y además la acción `ajuste` vuelve a pedir la ficha por su cuenta: si el
 * número saliera del payload de la primera carga, después de un ajuste el saldo cambiaría y los
 * pesos quedarían con el valor viejo. `valor_punto` es config del programa y no se mueve, así
 * que multiplicar por él acá da siempre los dos números en el mismo estado. No es "decidir el
 * saldo con dos criterios": el saldo lo sigue diciendo la API y acá solo se convierte.
 */
export default {
	props: {
		/**
		 * Pesos que vale un punto en el programa activo. Lo baja `Index.vue` desde el payload de
		 * `puntos/getCliente`.
		 */
		valor_punto: {
			type: Number,
			default: 0,
		},
	},
	computed: {
		saldo() {
			return this.$store.state.puntos.saldo_cliente
		},
		por_vencer_90_dias() {
			return this.$store.state.puntos.por_vencer_90_dias
		},
		equivalencia_pesos() {
			return this.saldo * this.valor_punto
		},
		pesos_por_vencer() {
			return this.por_vencer_90_dias * this.valor_punto
		},
		hay_por_vencer() {
			return this.por_vencer_90_dias > 0
		},
	},
	methods: {
		/**
		 * Puntos para mostrar. Pasa por `Number` antes de `numero_es` a propósito: la columna es
		 * `decimal(20,2)` y Laravel la manda como string ('1300.00'), que `numero_es` respeta tal
		 * cual y termina mostrando "1.300,00" puntos. Los puntos son enteros en la práctica y los
		 * dos decimales colgando confunden.
		 *
		 * @param {*} valor
		 * @returns {String}
		 */
		puntos_es(valor) {
			return this.numero_es(Number(valor) || 0)
		},
	},
}
</script>
<style lang="sass" scoped>
// Tokens de color, nunca hexadecimales: este bloque vive adentro de un modal de bootstrap-vue,
// que se monta colgando de body y fuera de #app. Un hex acá queda blanco en modo oscuro.
.puntos-saldo
	display: flex
	flex-wrap: wrap
	gap: 12px
	padding: 16px 20px
	background: var(--bg-card)
	border-bottom: 1px solid var(--color-border)

	&__tarjeta
		display: flex
		flex-direction: column
		// flex: 1 1 160px con min-width: en teléfono las tres tarjetas envuelven una debajo de
		// la otra en vez de espicharse hasta que el número quede cortado.
		flex: 1 1 160px
		min-width: 150px
		padding: 12px 14px
		border: 1px solid var(--color-border)
		border-radius: 10px

		&--principal
			border-color: var(--color-primary)

		&--vence
			border-color: var(--btn-peligro-borde)

	&__valor
		font-size: 1.35rem
		font-weight: 600
		line-height: 1.2
		color: var(--color-text-primary)

	&__titulo
		font-size: 0.8rem
		color: var(--color-text-secondary)

	&__pesos-chicos
		margin-top: 2px
		font-size: 0.8rem
		font-weight: 600
		color: var(--btn-peligro-texto)
</style>
