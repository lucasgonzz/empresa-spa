<template>
	<!--
		Tarjeta del módulo de Devoluciones: superficie con título, bajada opcional y acciones a la
		derecha del título. El estilo vive en components/devoluciones/Index.vue (.dev-tarjeta).
	-->
	<section class="dev-tarjeta">
		<div
		v-if="titulo || $slots.acciones"
		class="dev-tarjeta__encabezado">
			<div>
				<h5 class="dev-tarjeta__titulo">
					{{ titulo }}
				</h5>
				<p
				v-if="subtitulo"
				class="dev-tarjeta__subtitulo">
					{{ subtitulo }}
				</p>
			</div>

			<div
			v-if="$slots.acciones"
			class="dev-tarjeta__acciones">
				<slot name="acciones"></slot>
			</div>
		</div>

		<slot></slot>
	</section>
</template>
<script>
export default {
	props: {
		// Título de la tarjeta.
		titulo: {
			type: String,
			default: '',
		},
		// Bajada en gris debajo del título (qué se hace en esta tarjeta).
		subtitulo: {
			type: String,
			default: '',
		},
	},
}
</script>
