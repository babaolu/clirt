import { sql } from 'drizzle-orm';
import {
	pgTable,
	pgEnum,
	serial,
	uuid,
	integer,
	text,
	boolean,
	jsonb,
	timestamp,
	unique,
	check,
	index
} from 'drizzle-orm/pg-core';
import { SIZES, type Customization } from '../../customization';
import { user } from './auth.schema';

export * from './auth.schema';

export const sleeveEnum = pgEnum('sleeve', ['short', 'long']);
export const neckEnum = pgEnum('neck', ['round', 'v', 'collar']);
export const presetKindEnum = pgEnum('preset_kind', ['text_style', 'graphic']);
export const sizeEnum = pgEnum('size', SIZES);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'cancelled']);
export const emailStatusEnum = pgEnum('email_status', ['pending', 'sent', 'failed']);

export const shirtStyle = pgTable(
	'shirt_style',
	{
		id: serial('id').primaryKey(),
		slug: text('slug').notNull().unique(),
		name: text('name').notNull(),
		sleeve: sleeveEnum('sleeve').notNull(),
		neck: neckEnum('neck').notNull(),
		basePriceKobo: integer('base_price_kobo').notNull(),
		active: boolean('active').notNull().default(true),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(t) => [
		unique('shirt_style_sleeve_neck_unique').on(t.sleeve, t.neck),
		check('shirt_style_base_price_positive', sql`${t.basePriceKobo} > 0`)
	]
);

export const designPreset = pgTable('design_preset', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	kind: presetKindEnum('kind').notNull(),
	config: jsonb('config').$type<Record<string, unknown>>().notNull(),
	active: boolean('active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0)
});

export const cartItem = pgTable(
	'cart_item',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		shirtStyleId: integer('shirt_style_id')
			.notNull()
			.references(() => shirtStyle.id),
		size: sizeEnum('size').notNull(),
		quantity: integer('quantity').notNull(),
		customization: jsonb('customization').$type<Customization>().notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('cart_item_quantity_range', sql`${t.quantity} between 1 and 20`),
		index('cart_item_user_id_idx').on(t.userId)
	]
);

export const orders = pgTable(
	'orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }), // account deletion removes orders too
		status: orderStatusEnum('status').notNull().default('pending'),
		subtotalKobo: integer('subtotal_kobo').notNull(),
		totalKobo: integer('total_kobo').notNull(),
		contactEmail: text('contact_email').notNull(),
		shippingName: text('shipping_name').notNull(),
		phone: text('phone').notNull(),
		address: text('address').notNull(),
		city: text('city').notNull(),
		state: text('state').notNull(),
		notes: text('notes'),
		emailStatus: emailStatusEnum('email_status').notNull().default('pending'),
		emailMessageId: text('email_message_id'),
		emailError: text('email_error'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('orders_user_id_idx').on(t.userId)]
);

export const orderItem = pgTable(
	'order_item',
	{
		id: serial('id').primaryKey(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		shirtStyleId: integer('shirt_style_id')
			.notNull()
			.references(() => shirtStyle.id),
		styleName: text('style_name').notNull(),
		size: sizeEnum('size').notNull(),
		quantity: integer('quantity').notNull(),
		unitPriceKobo: integer('unit_price_kobo').notNull(),
		customization: jsonb('customization').$type<Customization>().notNull(),
		previewSvg: text('preview_svg'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check('order_item_quantity_range', sql`${t.quantity} between 1 and 20`),
		index('order_item_order_id_idx').on(t.orderId)
	]
);

export type ShirtStyle = typeof shirtStyle.$inferSelect;
export type DesignPreset = typeof designPreset.$inferSelect;
