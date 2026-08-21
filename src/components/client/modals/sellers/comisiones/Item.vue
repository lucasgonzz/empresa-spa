<template>
	<div class="comision-item">

		<div class="comision-item__col comision-item__col--izq">
			<template v-if="item.sale_id">
				<button
				type="button"
				class="comision-item__link"
				@click="showSellerCommissionSale(item)">
					Venta N° {{ item.sale ? item.sale.num : item.sale_id }}
				</button>
				<div class="comision-item__meta">
					{{ item.sale ? date(item.sale.created_at) : '-' }}
					<template v-if="item.sale">
						· {{ price(item.sale.total) }}
					</template>
				</div>
			</template>
			<template v-else>
				<div class="comision-item__titulo">
					Pago al vendedor
				</div>
				<div
				v-if="payment_methods_label"
				class="comision-item__meta">
					{{ payment_methods_label }}
				</div>
			</template>
		</div>

		<div class="comision-item__col comision-item__col--centro">
			<template v-if="es_pendiente">
				<span class="comision-item__badge">Esperando cobro</span>
			</template>
			<template v-else>
				<div class="comision-item__meta-label">Saldada el</div>
				<div class="comision-item__meta">{{ date(item.liquidada_at) }}</div>
			</template>
		</div>

		<div class="comision-item__col comision-item__col--der">
			<div
			v-if="item.percentage"
			class="comision-item__meta">
				{{ porcentaje_es(item.percentage) }}%
			</div>
			<div
			v-if="item.debe"
			class="comision-item__monto comision-item__monto--debe">
				{{ price(item.debe) }}
			</div>
			<div
			v-if="item.haber"
			class="comision-item__monto comision-item__monto--haber">
				{{ price(item.haber) }}
			</div>
			<div
			v-if="!es_pendiente"
			class="comision-item__meta">
				Saldo: {{ price(item.saldo) }}
			</div>
		</div>

	</div>
</template>
<script>
export default {
	props: {
		item: {
			type: Object,
			required: true,
		},
		es_pendiente: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		payment_methods_label() {
			if (!this.item.payment_methods || !this.item.payment_methods.length) {
				return ''
			}
			return this.item.payment_methods.map(payment_method => {
				let monto = payment_method.pivot ? payment_method.pivot.amount : null
				return payment_method.name + ' ' + this.price(monto)
			}).join(', ')
		},
	},
}
</script>
<style scoped lang="sass">
$accent-debe: #dc2626
$accent-haber: #059669
$accent-saldo: #0f172a

.comision-item
	display: flex
	align-items: center
	gap: 16px
	padding: 14px 16px
	border-radius: 12px
	background: #fff
	border: 1px solid #eef0f3
	margin-bottom: 8px

	&:hover
		border-color: #dfe3e8

	&__col
		min-width: 0

		&--izq
			flex: 1 1 45%

		&--centro
			flex: 0 0 160px
			text-align: center

		&--der
			flex: 0 0 140px
			text-align: right

	&__link
		background: none
		border: none
		padding: 0
		font-size: 0.95rem
		font-weight: 600
		color: #0f172a
		cursor: pointer
		text-align: left

		&:hover
			text-decoration: underline

	&__titulo
		font-size: 0.95rem
		font-weight: 600
		color: #0f172a

	&__meta
		font-size: 0.78rem
		color: #94a3b8
		margin-top: 2px

	&__meta-label
		font-size: 0.68rem
		text-transform: uppercase
		letter-spacing: 0.04em
		color: #94a3b8

	&__badge
		display: inline-block
		font-size: 0.72rem
		font-weight: 600
		color: #b45309
		background: rgba(217, 119, 6, 0.12)
		padding: 3px 10px
		border-radius: 999px

	&__monto
		font-size: 0.95rem
		font-weight: 700

		&--debe
			color: $accent-debe

		&--haber
			color: $accent-haber

	@media screen and (max-width: 576px)
		flex-direction: column
		align-items: stretch
		gap: 6px

		&__col
			flex: 1 1 auto
			text-align: left !important
</style>
