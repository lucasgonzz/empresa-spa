<template>
	<b-form-row>
		<b-col>
			<p
			class="c-p"
			@click="show ? show = false : show = true">
				Iva
				<icon-show
				:show="show"></icon-show>
			</p>
			<b-form-select 
			class="m-b-15"
			v-show="show"
			v-model="article.iva_id"
			:options="getOptions({key: 'iva_id', text: 'Iva', select_prop_name: 'percentage'})">
			</b-form-select>
		</b-col>
	</b-form-row>
</template>
<script>
import IconShow from '@/components/common/IconShow'
import ivas from '@/mixins/ivas'
export default {
	props: ['article'],
	mixins: [ivas],
	components: {
		IconShow,
	},
	data() {
		return {
			show: false
		}
	}
}
</script>