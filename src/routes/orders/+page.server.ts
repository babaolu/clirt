import { desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { orders } from '#lib/server/db/schema.ts';
import { requireUser } from '#lib/server/auth-guard.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const rows = await db
		.select({
			id: orders.id,
			createdAt: orders.createdAt,
			status: orders.status,
			emailStatus: orders.emailStatus,
			totalKobo: orders.totalKobo,
			// Fully qualified: drizzle renders ${orders.id} as a bare "id", which would bind to order_item.id here.
			itemCount: sql<number>`(select coalesce(sum(oi.quantity), 0) from order_item oi where oi.order_id = "orders"."id")::int`
		})
		.from(orders)
		.where(eq(orders.userId, user.id))
		.orderBy(desc(orders.createdAt));
	return { orders: rows };
};
