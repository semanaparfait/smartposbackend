import { Feature } from 'src/common/decorators/feature.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { FileUploadInterceptor } from 'src/common/interceptors/file-upload.interceptor';
import { Payload } from 'src/util/token.service';
import { UserRole } from '../user/entities/user.entity';
import { ServiceService } from './service.service';
import { BookingService } from './booking.service';
import { ReceiptService } from './receipt.service';
import {
  ConfirmReceiptsDto,
  MissingReceiptDto,
  PaymentIdParam,
  ReceiptQueryDto,
} from './dto/receipt.dto';
import {
  CreateServiceDto,
  CreateUnitDto,
  ServiceIdParam,
  UnitIdParam,
  UpdateServiceDto,
  UpdateUnitDto,
} from './dto/service.dto';
import {
  BookingIdParam,
  BookingPaymentDto,
  BookingQueryDto,
  CancelBookingDto,
  CheckOutDto,
  CreateBookingDto,
  RefundBookingDto,
  TakingsQueryDto,
} from './dto/booking.dto';

// Staff with "Services & bookings" run the bookings; "Set up services" (or the
// owner) changes what is offered and its prices.
@ApiTags('Services & Bookings')
@Feature('services')
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.EMPLOYEE)
@ApiBearerAuth()
export class ServiceController {
  constructor(
    private readonly services: ServiceService,
    private readonly bookings: BookingService,
    private readonly receipts: ReceiptService,
  ) {}

  // ---------------- Services ----------------

  @Get('services')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'Services with their units' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Super admin only',
  })
  getServices(@User() user: Payload, @Query('companyId') companyId?: string) {
    return this.services.getAll(user, companyId);
  }

  // Declared before 'services/:serviceId' so it isn't read as a service id.
  @Get('services/image-search')
  @RequirePermissions('services.setup')
  @ApiOperation({ summary: 'Find free pictures by name' })
  @ApiQuery({ name: 'q', example: 'hotel room' })
  searchImages(@Query('q') query: string) {
    return this.services.searchImages(query);
  }

  @Get('services/:serviceId')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'One service with its units' })
  getService(@User() user: Payload, @Param() { serviceId }: ServiceIdParam) {
    return this.services.getOne(user, serviceId);
  }

  @Post('services')
  @RequirePermissions('services.setup')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiOperation({ summary: 'Add a service (with its units)' })
  createService(
    @User() user: Payload,
    @Body() dto: CreateServiceDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.services.create(user, dto, picture);
  }

  @Patch('services/:serviceId')
  @RequirePermissions('services.setup')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(new FileUploadInterceptor('picture', 1, false))
  @ApiOperation({ summary: 'Update a service (send picture to replace it)' })
  updateService(
    @User() user: Payload,
    @Param() { serviceId }: ServiceIdParam,
    @Body() dto: UpdateServiceDto,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.services.update(user, serviceId, dto, picture);
  }

  @Delete('services/:serviceId')
  @RequirePermissions('services.setup')
  @ApiOperation({ summary: 'Delete a service that was never booked' })
  deleteService(@User() user: Payload, @Param() { serviceId }: ServiceIdParam) {
    return this.services.remove(user, serviceId);
  }

  @Post('services/:serviceId/units')
  @RequirePermissions('services.setup')
  @ApiOperation({ summary: 'Add a bookable unit (Room 101, Table 2)' })
  addUnit(
    @User() user: Payload,
    @Param() { serviceId }: ServiceIdParam,
    @Body() dto: CreateUnitDto,
  ) {
    return this.services.addUnit(user, serviceId, dto);
  }

  // Renaming is setup; marking cleaned or under maintenance is daily work, so
  // the service checks which one is asked for.
  @Patch('service-units/:unitId')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'Rename a unit or change its status' })
  updateUnit(
    @User() user: Payload,
    @Param() { unitId }: UnitIdParam,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.services.updateUnit(user, unitId, dto);
  }

  @Delete('service-units/:unitId')
  @RequirePermissions('services.setup')
  @ApiOperation({ summary: 'Remove a unit' })
  removeUnit(@User() user: Payload, @Param() { unitId }: UnitIdParam) {
    return this.services.removeUnit(user, unitId);
  }

  // ---------------- Bookings ----------------

  @Get('bookings')
  @RequirePermissions('services.manage')
  @ApiOperation({
    summary: 'Bookings starting in the dates, plus all reserved and in use',
  })
  getBookings(@User() user: Payload, @Query() query: BookingQueryDto) {
    return this.bookings.getAll(user, query);
  }

  @Get('bookings/takings')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'Money taken for bookings in a period' })
  getTakings(@User() user: Payload, @Query() query: TakingsQueryDto) {
    return this.bookings.takings(user, query);
  }

  @Get('bookings/:bookingId')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'One booking with its payments' })
  getBooking(@User() user: Payload, @Param() { bookingId }: BookingIdParam) {
    return this.bookings.getOne(user, bookingId);
  }

  @Post('bookings')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'Book ahead, start now, or sell a ticket' })
  createBooking(@User() user: Payload, @Body() dto: CreateBookingDto) {
    return this.bookings.create(user, dto);
  }

  @Patch('bookings/:bookingId/check-in')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'The customer has arrived' })
  checkIn(@User() user: Payload, @Param() { bookingId }: BookingIdParam) {
    return this.bookings.checkIn(user, bookingId);
  }

  @Patch('bookings/:bookingId/check-out')
  @RequirePermissions('services.manage')
  @ApiOperation({
    summary: 'Finish, charge for the time used, and free the unit',
  })
  checkOut(
    @User() user: Payload,
    @Param() { bookingId }: BookingIdParam,
    @Body() dto: CheckOutDto,
  ) {
    return this.bookings.checkOut(user, bookingId, dto);
  }

  @Patch('bookings/:bookingId/cancel')
  @RequirePermissions('services.refund')
  @ApiOperation({ summary: 'Cancel a booking, saying why' })
  cancel(
    @User() user: Payload,
    @Param() { bookingId }: BookingIdParam,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(user, bookingId, dto);
  }

  @Post('bookings/:bookingId/refunds')
  @RequirePermissions('services.refund')
  @ApiOperation({ summary: 'Give money back, saying why' })
  refund(
    @User() user: Payload,
    @Param() { bookingId }: BookingIdParam,
    @Body() dto: RefundBookingDto,
  ) {
    return this.bookings.refund(user, bookingId, dto);
  }

  // ---------------- Checking the money ----------------

  @Get('booking-payments')
  @RequirePermissions('finance.verify')
  @ApiOperation({ summary: 'Booking payments to check, with who took them' })
  getReceipts(@User() user: Payload, @Query() query: ReceiptQueryDto) {
    return this.receipts.list(user, query);
  }

  @Patch('booking-payments/confirm')
  @RequirePermissions('finance.verify')
  @ApiOperation({ summary: 'Confirm the money of these payments was received' })
  confirmReceipts(@User() user: Payload, @Body() dto: ConfirmReceiptsDto) {
    return this.receipts.confirm(user, dto);
  }

  @Patch('booking-payments/:paymentId/missing')
  @RequirePermissions('finance.verify')
  @ApiOperation({
    summary: 'Report the money as not received, saying what happened',
  })
  reportMissing(
    @User() user: Payload,
    @Param() { paymentId }: PaymentIdParam,
    @Body() dto: MissingReceiptDto,
  ) {
    return this.receipts.missing(user, paymentId, dto.note);
  }

  @Patch('booking-payments/:paymentId/reopen')
  @RequirePermissions('finance.verify')
  @ApiOperation({ summary: 'Put a checked payment back to waiting' })
  reopenReceipt(@User() user: Payload, @Param() { paymentId }: PaymentIdParam) {
    return this.receipts.reopen(user, paymentId);
  }

  @Post('bookings/:bookingId/payments')
  @RequirePermissions('services.manage')
  @ApiOperation({ summary: 'Take a deposit or the balance' })
  addPayment(
    @User() user: Payload,
    @Param() { bookingId }: BookingIdParam,
    @Body() dto: BookingPaymentDto,
  ) {
    return this.bookings.addPayment(user, bookingId, dto);
  }
}
