import {z} from 'zod';
export const countrySchema=z.string().regex(/^[A-Z]{2}$/,'Use a two-letter country code');
export const connectionSchema=z.object({
 state:z.enum(['not-configured','connecting','connected','connection-failed','location-mismatch','authentication-required','location-unavailable']),
 requestedCountry:countrySchema.nullable(),ip:z.union([z.ipv4(),z.ipv6()]).nullable(),country:countrySchema.nullable(),timezone:z.string().max(80).nullable(),locale:z.string().max(60).nullable(),checkedAt:z.iso.datetime(),message:z.string().max(300)
});
export type Connection=z.infer<typeof connectionSchema>;
export const locatedCreateSchema=z.strictObject({name:z.string().trim().min(1).max(100),country:countrySchema,proxyId:z.uuid(),locale:z.string().max(60).optional(),timezoneId:z.string().max(80).optional(),startupUrl:z.url().max(2048).optional()});
