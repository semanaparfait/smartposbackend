import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { DeliveryService } from './delivery.service';
import { customerPageHtml, goneHtml } from './delivery-page';

// The page a customer opens from the link in their WhatsApp or SMS message:
// their delivery code and its QR. No sign-in; the link itself is the key
// (unguessable, and it stops working soon after the delivery).
@ApiExcludeController()
@Public()
@Controller('d')
export class DeliveryPageController {
  constructor(private readonly deliveries: DeliveryService) {}

  @Get(':token')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Robots-Tag', 'noindex, nofollow')
  // No scripts at all; only the inline style and the shop's logo.
  @Header(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  )
  async show(@Param('token') token: string, @Res() res: Response) {
    const data = await this.deliveries.customerPage(token);
    if (!data) return res.status(404).send(goneHtml());
    return res.send(await customerPageHtml(data));
  }
}
