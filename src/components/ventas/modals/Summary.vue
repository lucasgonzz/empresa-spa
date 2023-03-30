<template>

<!-- Modal -->
<div class="modal fade" id="sales-summary" tabindex="-1" role="dialog" aria-labelledby="ventas-resumens" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Resumen de ventas</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <ul class="list-group">
                    <li class="list-group-item active">
                        Venta del
                    </li>
                    <li class="list-group-item">{{ sales.length }} ventas</li>
                    <li class="list-group-item">{{ getTotalItems }} artículos</li>
                    <li class="list-group-item">Total: ${{ total }}</li>
                </ul>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-dismiss="modal">Cerrar</button>
            </div>
        </div>
    </div>
</div>
</template>
<script>
export default {
	props: ['sales'],
	data() {
		return {
            last_date: '',
			total: 0
		}
	},
	methods: {
        isOtherDate(date) {
            this.last_date = date
            if (date != this.last_date) {
                return true
            } else {
                return false
            }
        },
		getTotalItems() {
			var count = 0
			this.sales.forEach(sale => {
				sale.articles.forEach(article => {
					count++
					this.total += article.price
				})
			})
			return count
		},
	}
}
</script>