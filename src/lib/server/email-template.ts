/** Pure builders for the order confirmation email (no env access, so they can be tested directly). */
import { describeDesign, shirtColorName, type Customization } from '#lib/customization.ts';
import { formatNaira } from '#lib/money.ts';
import { formatOrderDate, orderNumber } from '#lib/order-status.ts';

export type EmailOrder = {
	id: string;
	createdAt: Date;
	contactEmail: string;
	shippingName: string;
	phone: string;
	address: string;
	city: string;
	state: string;
	notes: string | null;
	subtotalKobo: number;
	totalKobo: number;
};

export type EmailItem = {
	styleName: string;
	size: string;
	quantity: number;
	unitPriceKobo: number;
	customization: Customization;
};

export const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

function itemLine(item: EmailItem) {
	return {
		title: `${item.styleName} · ${shirtColorName(item.customization.shirtColor)} · Size ${item.size}`,
		design: describeDesign(item.customization.design),
		qty: item.quantity,
		total: formatNaira(item.unitPriceKobo * item.quantity)
	};
}

export function buildText(order: EmailOrder, items: EmailItem[], orderUrl: string): string {
	const lines = items.map((item) => {
		const l = itemLine(item);
		return `- ${l.title}\n  ${l.design}\n  Qty ${l.qty} · ${l.total}`;
	});
	return [
		`Thank you for your order, ${order.shippingName}!`,
		'',
		`Order #${orderNumber(order.id)}`,
		`Placed: ${formatOrderDate(order.createdAt)}`,
		'',
		...lines,
		'',
		`Subtotal: ${formatNaira(order.subtotalKobo)}`,
		'Delivery: Free',
		`Total: ${formatNaira(order.totalKobo)}`,
		'',
		'Payment: Pay on delivery',
		'',
		'Delivering to:',
		order.shippingName,
		order.address,
		`${order.city}, ${order.state}`,
		order.phone,
		...(order.notes ? ['', `Notes: ${order.notes}`] : []),
		'',
		`View your order: ${orderUrl}`,
		'',
		'Clirt · Custom tees printed in Nigeria'
	].join('\n');
}

export function buildHtml(order: EmailOrder, items: EmailItem[], orderUrl: string): string {
	const e = escapeHtml;
	const cell = 'padding:12px 0;border-bottom:1px solid #e7e5e4;vertical-align:top;';
	const rows = items
		.map((item) => {
			const l = itemLine(item);
			return `<tr>
<td style="${cell}font-size:14px;color:#1c1917;"><strong>${e(l.title)}</strong><br><span style="color:#57534e;">${e(l.design)}</span></td>
<td style="${cell}font-size:14px;color:#57534e;text-align:center;white-space:nowrap;">× ${l.qty}</td>
<td style="${cell}font-size:14px;color:#1c1917;text-align:right;white-space:nowrap;">${e(l.total)}</td>
</tr>`;
		})
		.join('');

	return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:#1c1917;padding:20px 24px;border-radius:8px 8px 0 0;font-size:22px;font-weight:bold;color:#ffffff;">Clirt</td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 8px;font-size:18px;color:#1c1917;">Thank you for your order, ${e(order.shippingName)}!</p>
<p style="margin:0 0 20px;font-size:14px;color:#57534e;">Order <strong>#${orderNumber(order.id)}</strong> · ${e(formatOrderDate(order.createdAt))}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
<tr><td style="padding:12px 0 4px;font-size:14px;color:#57534e;" colspan="2">Subtotal</td><td style="padding:12px 0 4px;font-size:14px;text-align:right;">${formatNaira(order.subtotalKobo)}</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#57534e;" colspan="2">Delivery</td><td style="padding:4px 0;font-size:14px;text-align:right;">Free</td></tr>
<tr><td style="padding:4px 0;font-size:16px;font-weight:bold;color:#1c1917;" colspan="2">Total</td><td style="padding:4px 0;font-size:16px;font-weight:bold;text-align:right;">${formatNaira(order.totalKobo)}</td></tr>
</table>
<p style="margin:20px 0 4px;font-size:14px;font-weight:bold;color:#1c1917;">Payment</p>
<p style="margin:0;font-size:14px;color:#57534e;">Pay on delivery. No payment was taken online.</p>
<p style="margin:20px 0 4px;font-size:14px;font-weight:bold;color:#1c1917;">Delivering to</p>
<p style="margin:0;font-size:14px;line-height:20px;color:#57534e;">${e(order.shippingName)}<br>${e(order.address)}<br>${e(order.city)}, ${e(order.state)}<br>${e(order.phone)}</p>
${order.notes ? `<p style="margin:12px 0 0;font-size:14px;color:#57534e;"><strong>Notes:</strong> ${e(order.notes)}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="background:#1c1917;border-radius:6px;">
<a href="${e(orderUrl)}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">View your order</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#a8a29e;border-top:1px solid #e7e5e4;">Clirt · Custom tees printed in Nigeria</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
