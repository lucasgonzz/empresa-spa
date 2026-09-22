<template>
	<div class="informe-tabla">
		<h4
		v-if="bloque.titulo"
		class="informe-tabla__titulo">
			{{ bloque.titulo }}
		</h4>
		<!--
			Chasis .tabla-modulo de sass/_controles_modulo.sass (el mismo de las tablas
			del módulo IA viejo): wrapper redondeado afuera y el div que scrollea adentro.
			Es una <table> pelada y no un b-table: acá no hay model_name ni ordenamiento,
			solo texto en celdas.
		-->
		<div class="tabla-modulo-wrapper">
			<div class="table-responsive">
				<table class="table tabla-modulo informe-tabla__tabla">
					<thead>
						<tr>
							<th
							v-for="(columna, index) in columnas"
							:key="index">
								{{ columna }}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
						v-for="(fila, fila_index) in filas"
						:key="fila_index">
							<td
							v-for="(celda, celda_index) in fila"
							:key="celda_index">
								{{ celda }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		bloque: {
			type: Object,
			required: true,
		},
	},
	computed: {
		columnas() {
			return Array.isArray(this.bloque.columnas) ? this.bloque.columnas : []
		},
		filas() {
			if (!Array.isArray(this.bloque.filas)) {
				return []
			}
			return this.bloque.filas.filter(fila => Array.isArray(fila))
		},
	},
}
</script>

<style lang="sass">
.informe-tabla
	margin: 0 0 22px 0

	&__titulo
		font-size: .95rem
		font-weight: 600
		margin: 0 0 8px 0
		color: var(--color-text-primary, #212529)

	// La primera columna suele ser el nombre (artículo, cliente): que no se parta.
	&__tabla td:first-child
		white-space: nowrap
		max-width: 320px
		overflow: hidden
		text-overflow: ellipsis
</style>
