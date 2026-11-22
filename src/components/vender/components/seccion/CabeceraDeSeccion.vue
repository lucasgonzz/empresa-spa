<template>
	<!--
		Cabecera de una seccion de Vender (mision vender-secciones-personalizables, 22/11/2026):
		circulo con el numero, titulo y descripcion en UN solo renglon y, si la seccion se pliega,
		el chevron. Mas baja que la de antes (menos de 36px): el titulo y la descripcion que estaban
		en dos renglones ahora van en uno y se cortan con puntos suspensivos si no entran.

		La usan la seccion generica (seccion/Index.vue) y la etapa 2 (stage-2/Index.vue). Los
		atributos que le lleguen (data-tour, data-testid, data-abierta) caen en la raiz, que es el
		header clickeable: es donde los ponian las etapas de antes y donde los buscan el tour de la
		demo y las pruebas e2e.
	-->
	<div
	class="vender-stage__header"
	:class="{ 'vender-stage__header--no-collapse': !plegable }"
	@click="al_hacer_clic">
		<span class="vender-stage__number">{{ numero }}</span>
		<div class="vender-stage__header-text">
			<span class="vender-stage__label">{{ titulo }}</span>
			<span
			v-if="descripcion"
			class="vender-stage__sublabel">{{ descripcion }}</span>
		</div>
		<i
		v-if="plegable"
		:class="abierta ? 'icon-up' : 'icon-down'"
		class="vender-stage__chevron"></i>
	</div>
</template>

<script>
export default {
	name: 'CabeceraDeSeccion',
	props: {
		/**
		 * Numero que se muestra en el circulo (posicion de la seccion en orden de lectura).
		 */
		numero: {
			type: Number,
			required: true,
		},

		/**
		 * Titulo de la seccion. Es texto del usuario: se pinta SIEMPRE con {{ }}, nunca con v-html.
		 */
		titulo: {
			type: String,
			default: '',
		},

		/**
		 * Descripcion de la seccion (la que escribio el usuario o la automatica con sus campos).
		 * Tambien texto del usuario: solo con {{ }}.
		 */
		descripcion: {
			type: String,
			default: '',
		},

		/**
		 * Si la seccion se puede plegar (clic en el header y chevron).
		 */
		plegable: {
			type: Boolean,
			default: false,
		},

		/**
		 * Si la seccion esta desplegada (define el sentido del chevron).
		 */
		abierta: {
			type: Boolean,
			default: true,
		},
	},
	methods: {
		/**
		 * Clic en el header: sólo hace algo si la seccion se pliega; el padre alterna su estado.
		 *
		 * @returns {void}
		 */
		al_hacer_clic() {
			if (this.plegable) {
				this.$emit('alternar')
			}
		},
	},
}
</script>
