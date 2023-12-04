<template>
	<div
	id="container-messages">
		<p
		class="text-with-icon m-t-50"
		v-if="!selected_buyer">
            <i class="icon-user"></i>
			Seleccione un cliente para ver el chat
		</p>
		<div
		v-else>
			<div
			v-if="!loading">
				<div
				v-if="selected_buyer.messages.length"
				id="messages">
					<div 
					v-for="message in selected_buyer.messages"
					class="message s-2"
					:class="getClassMessage(message)">
						<p class="text">
							{{ message.text }}
						</p>
						<card-component 
						class="m-t-10"
						v-if="hasArticle(message)"
						:model="message.article"></card-component>
						<p class="since">
							{{ since(message.created_at) }}
						</p>
					</div>
				</div>
				<p
				class="text-with-icon m-t-50"
				v-else>
		            <i class="icon-message"></i>
					No hay mensajes con {{ selected_buyer.name }}
				</p>
			</div>
			<div
			class="messages"
			v-else>
				<div class="message shadow-2 commerce-message">
					<b-skeleton width="100%"></b-skeleton>
					<b-skeleton width="50px"></b-skeleton>
				</div>
				<div class="message shadow-2 buyer-message">
					<b-skeleton width="100%"></b-skeleton>
					<b-skeleton width="50px"></b-skeleton>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import online from '@/mixins/online'
export default {
	mixins: [online],
	components: {
		CardComponent: () => import('@/common-vue/components/display/cards/CardComponent'),
	},
	computed: {
		loading() {
			return this.$store.state.message.loading
		},
		selected_buyer() {
			return this.$store.state.message.selected_buyer
		},
	},
	methods: {
		getClassMessage(message) {
			return message.from_buyer ? 'buyer-message bg-primary' : 'commerce-message'
		}
	},
	watch: {
		selected_buyer() {
			if (this.selected_buyer && this.selected_buyer.messages.length) {
				this.scrollBottom('messages')
				setTimeout(() => {
					document.getElementById('message-text').focus()
				}, 100)
			}
		}
	}
}
</script>
<style lang="sass">
#container-messages
	height: calc(100% - 70px)
	overflow-y: scroll
#messages
	display: flex
	flex-direction: column
	padding: 1em
.commerce-message
	align-self: flex-end
	color: #000 
	.since
		color: rgba(0,0,0,.7)
.buyer-message
	color: #FFF
	.since
		color: rgba(255,255,255,.7)
.message
	border-radius: .5em
	padding: .5em
	margin-bottom: 1em
	width: 300px
	background: #FFF
	.text
		text-align: left
	.since
		font-size: .7em
		text-align: right
	p 
		margin: 0
</style>