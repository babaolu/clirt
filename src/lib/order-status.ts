/** Badge labels and Tailwind classes for order and email statuses. */
export const ORDER_STATUS = {
	pending: { label: 'Pending', class: 'bg-marigold-soft text-ink' },
	confirmed: { label: 'Confirmed', class: 'bg-leaf-soft text-leaf' },
	cancelled: { label: 'Cancelled', class: 'bg-fog text-slate' }
} as const;

export const EMAIL_STATUS = {
	pending: { label: 'Email pending', class: 'bg-fog text-slate' },
	sent: { label: 'Email sent', class: 'bg-leaf-soft text-leaf' },
	failed: { label: 'Email failed', class: 'bg-alert-soft text-alert' }
} as const;

export const orderNumber = (id: string) => id.slice(0, 8).toUpperCase();

export const formatOrderDate = (date: Date | string) =>
	new Date(date).toLocaleString('en-NG', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Africa/Lagos'
	});
