/** Badge labels and Tailwind classes for order and email statuses. */
export const ORDER_STATUS = {
	pending: { label: 'Pending', class: 'bg-amber-100 text-amber-800' },
	confirmed: { label: 'Confirmed', class: 'bg-emerald-100 text-emerald-800' },
	cancelled: { label: 'Cancelled', class: 'bg-stone-200 text-stone-700' }
} as const;

export const EMAIL_STATUS = {
	pending: { label: 'Email pending', class: 'bg-stone-100 text-stone-700' },
	sent: { label: 'Email sent', class: 'bg-emerald-100 text-emerald-800' },
	failed: { label: 'Email failed', class: 'bg-red-100 text-red-800' }
} as const;

export const orderNumber = (id: string) => id.slice(0, 8).toUpperCase();

export const formatOrderDate = (date: Date | string) =>
	new Date(date).toLocaleString('en-NG', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Africa/Lagos'
	});
